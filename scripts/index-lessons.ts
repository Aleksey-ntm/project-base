import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function indexAllLessons() {
  const lessonsDir = path.join(process.cwd(), 'lessons');

  if (!fs.existsSync(lessonsDir)) {
    console.log('❌ Папка /lessons не найдена!');
    return;
  }

  // 1. Принудительно создаем таблицу в БД, если ее нет
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS search_index (
      "lessonKey" TEXT PRIMARY KEY,
      "tab" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "cleanText" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('📦 Таблица search_index готова в PostgreSQL');

  const files = fs.readdirSync(lessonsDir);

  for (const file of files) {
    if (file.endsWith('.html') || file.endsWith('.php')) {
      const lessonKey = path.parse(file).name;
      const content = fs.readFileSync(path.join(lessonsDir, file), 'utf-8');

      // Извлекаем заголовок из H1 или берем имя файла
      const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/is);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : lessonKey;

      // Получаем чистый текст для поиска
      const cleanText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      // 2. Записываем данные
      await prisma.$executeRaw`
        INSERT INTO search_index ("lessonKey", "tab", "title", "cleanText", "updatedAt")
        VALUES (${lessonKey}, 'doc', ${title}, ${cleanText}, NOW())
        ON CONFLICT ("lessonKey") 
        DO UPDATE SET "title" = ${title}, "cleanText" = ${cleanText}, "updatedAt" = NOW();
      `;

      console.log(`✅ Проиндексирован файл: ${file}`);
    }
  }

  console.log('🎉 Все файлы успешно проиндексированы!');
}

indexAllLessons()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());