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
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'no_file' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
    const dateFolder = new Date().toISOString().split('T')[0];
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const objectKey = `voice/${dateFolder}/${fileName}`;
    const bucket = process.env.YANDEX_BUCKET || '';

    // 1. Загрузка в S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: ext === 'wav' ? 'audio/wav' : 'audio/mpeg',
      })
    );

    const fileUrl = `https://${bucket}.storage.yandexcloud.net/${objectKey}`;

    // 2. Старт асинхронного распознавания Yandex STT v3
    const response = await fetch('https://stt.api.cloud.yandex.net/stt/v3/recognizeFileAsync', {
      method: 'POST',
      headers: {
        'Authorization': `Api-Key ${process.env.YANDEX_SPEECHKIT_API_KEY}`,
        'x-folder-id': process.env.YANDEX_FOLDER_ID || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uri: fileUrl,
        recognition_model: {
          model: 'general',
          audio_format: {
            container_audio: {
              container_audio_type: ext === 'wav' ? 'WAV' : 'MP3',
            },
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.id) {
      return NextResponse.json({ error: 'stt_start_failed', details: data }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, file: objectKey });
  } catch (error: any) {
    return NextResponse.json({ error: 'upload_failed', msg: error.message }, { status: 500 });
  }
}