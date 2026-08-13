import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'ru-central1',
  endpoint: 'https://storage.yandexcloud.net',
  credentials: {
    accessKeyId: process.env.YANDEX_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.YANDEX_S3_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(req: NextRequest) {
  try {
    console.log('[STT Upload] 📥 Получен новый запрос на загрузку');

    // Проверка переменных окружения
    if (!process.env.YANDEX_BUCKET) console.error('[STT Upload] ❌ ОШИБКА: YANDEX_BUCKET не задан!');
    if (!process.env.YANDEX_SPEECHKIT_API_KEY) console.error('[STT Upload] ❌ ОШИБКА: YANDEX_SPEECHKIT_API_KEY не задан!');
    if (!process.env.YANDEX_FOLDER_ID) console.error('[STT Upload] ❌ ОШИБКА: YANDEX_FOLDER_ID не задан!');

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.warn('[STT Upload] ⚠️ Файл отсутствует в formData');
      return NextResponse.json({ error: 'no_file' }, { status: 400 });
    }

    console.log(`[STT Upload] 📄 Файл: ${file.name}, Размер: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
    const dateFolder = new Date().toISOString().split('T')[0];
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const objectKey = `voice/${dateFolder}/${fileName}`;
    const bucket = process.env.YANDEX_BUCKET || '';

    // 1. Загрузка в S3
    console.log(`[STT Upload] ☁️ Загрузка файла в S3: ${bucket}/${objectKey}`);
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: ext === 'wav' ? 'audio/wav' : 'audio/mpeg',
      })
    );

    const fileUrl = `https://${bucket}.storage.yandexcloud.net/${objectKey}`;
    console.log(`[STT Upload] ✅ Файл загружен в S3. Ссылка: ${fileUrl}`);

    // 2. Старт асинхронного распознавания Yandex STT v3
    console.log('[STT Upload] 🎙️ Отправка запроса в Yandex SpeechKit v3 (recognizeFileAsync)...');

    const sttPayload = {
      uri: fileUrl,
      recognition_model: {
        model: 'general',
        audio_format: {
          container_audio: {
            container_audio_type: ext === 'wav' ? 'WAV' : 'MP3',
          },
        },
      },
    };

    const response = await fetch('https://stt.api.cloud.yandex.net/stt/v3/recognizeFileAsync', {
      method: 'POST',
      headers: {
        'Authorization': `Api-Key ${process.env.YANDEX_SPEECHKIT_API_KEY}`,
        'x-folder-id': process.env.YANDEX_FOLDER_ID || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sttPayload),
    });

    const data = await response.json();

    if (!response.ok || !data.id) {
      console.error('[STT Upload] ❌ Ошибка от Yandex SpeechKit API:', response.status, data);
      return NextResponse.json({ error: 'stt_start_failed', status: response.status, details: data }, { status: 500 });
    }

    console.log(`[STT Upload] 🚀 Задача SpeechKit успешно запущена! Operation ID: ${data.id}`);
    return NextResponse.json({ id: data.id, file: objectKey });

  } catch (error: any) {
    console.error('[STT Upload] 💥 Критическая ошибка в функции POST:', error);
    return NextResponse.json({ error: 'upload_failed', msg: error.message }, { status: 500 });
  }
}