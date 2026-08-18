import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { serverLessonCache } from '@/lib/education-cache';

// POST: Запись файла на диск + Индексация
export async function POST(request: Request) {
  try {
    const { lessonKey, tab, title, htmlContent } = await request.json();

    if (!lessonKey || !htmlContent) {
      return NextResponse.json({ success: false, error: 'Не указан lessonKey или контент' }, { status: 400 });
    }

    const lessonTab = tab || 'doc';

    // 🧹 Сбрасываем серверный in-memory кэш для этого урока
    serverLessonCache.delete(`${lessonTab}_${lessonKey}`);

    // 1. Перезаписываем физический HTML-файл в папке /lessons
    const filePath = path.join(process.cwd(), 'lessons', `${lessonKey}.html`);
    fs.writeFileSync(filePath, htmlContent, 'utf-8');

    // 2. Получаем чистый текст без тегов для поиска
    const cleanText = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const lessonTitle = title || lessonKey;

    // 3. Обновляем поисковый индекс в БД через SQL
    await prisma.$executeRaw`
      INSERT INTO search_index ("lessonKey", "tab", "title", "cleanText", "updatedAt")
      VALUES (${lessonKey}, ${lessonTab}, ${lessonTitle}, ${cleanText}, NOW())
      ON CONFLICT ("lessonKey") 
      DO UPDATE SET "title" = ${lessonTitle}, "cleanText" = ${cleanText}, "updatedAt" = NOW();
    `;

    return NextResponse.json({ success: true, message: 'Файл сохранен и проиндексирован' });
  } catch (error: any) {
    console.error('File Save Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Ошибка записи файла' }, { status: 500 });
  }
}