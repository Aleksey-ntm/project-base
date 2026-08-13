import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

// ==================================================================
// GET: Получение данных урока (из БД или из файла в /lessons)
// ==================================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonKey = String(searchParams.get('lesson') || 'marketing');
    const tab = String(searchParams.get('tab') || 'doc');

    let meta: any = await prisma.lessonMeta.findFirst({
      where: {
        lessonKey,
        tab,
      },
    });

    const sections = await prisma.lessonSection.findMany({
      where: {
        lessonKey,
        tab,
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Определяем, пуста ли база по этому уроку
    const loadedFromFile = !meta && sections.length === 0;
    let fileHtmlContent = '';

    // Если в БД пусто — читаем локальный файл черновика из папки /lessons
    if (loadedFromFile) {
      const htmlPath = path.join(process.cwd(), 'lessons', `${lessonKey}.html`);
      const phpPath = path.join(process.cwd(), 'lessons', `${lessonKey}.php`);

      const targetPath = fs.existsSync(htmlPath) ? htmlPath : (fs.existsSync(phpPath) ? phpPath : null);

      if (targetPath) {
        fileHtmlContent = fs.readFileSync(targetPath, 'utf-8');

        // Вытаскиваем Title из <h1> и Intro из <p class="edu-intro">
        const titleMatch = fileHtmlContent.match(/<h1[^>]*>(.*?)<\/h1>/is);
        const introMatch = fileHtmlContent.match(/<p class="edu-intro[^>]*>(.*?)<\/p>/is);

        meta = {
          lessonKey,
          tab,
          title: titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : lessonKey,
          intro: introMatch ? introMatch[1].replace(/<[^>]+>/g, '').trim() : '',
        };

        // Вырезаем шапку из контента, чтобы H1 и intro не дублировались
        fileHtmlContent = fileHtmlContent
          .replace(/<div class="edu-header"[^>]*>.*?<\/div>/is, '')
          .replace(/<h1[^>]*>.*?<\/h1>/is, '')
          .replace(/<p class="edu-intro"[^>]*>.*?<\/p>/is, '');
      }
    }

    return NextResponse.json({
      success: true,
      meta: meta || { title: '', intro: '' },
      sections: sections || [],
      loadedFromFile,
      fileHtmlContent,
    });
  } catch (error: any) {
    console.error('Prisma GET Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server Error' },
      { status: 500 }
    );
  }
}

// ==================================================================
// POST: Сохранение данных урока в таблицы PostgreSQL
// ==================================================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const lessonKey = String(body.lessonKey || 'welcome_1');
    const tab = String(body.tab || 'doc');
    let meta = body.meta || {};
    let sections = body.sections || [];

    if (body.isImport) {
      const htmlPath = path.join(process.cwd(), 'lessons', `${lessonKey}.html`);
      const phpPath = path.join(process.cwd(), 'lessons', `${lessonKey}.php`);
      const targetPath = fs.existsSync(htmlPath) ? htmlPath : (fs.existsSync(phpPath) ? phpPath : null);

      if (targetPath) {
        let rawHtml = fs.readFileSync(targetPath, 'utf-8');

        // Вытаскиваем Title и Intro из файла
        const titleMatch = rawHtml.match(/<h1[^>]*>(.*?)<\/h1>/is);
        const introMatch = rawHtml.match(/<p class="edu-intro[^>]*>(.*?)<\/p>/is);

        const pageTitle = meta.title && meta.title !== lessonKey 
          ? meta.title 
        : (titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : lessonKey);

        meta = {
          lessonKey,
          tab,
          title: pageTitle,
          intro: introMatch ? introMatch[1].replace(/<[^>]+>/g, '').trim() : (meta.intro || ''),
        };

        // Очищаем дублирующуюся шапку H1/Intro (НО НЕ СТИЛИ <style>)
        rawHtml = rawHtml
          .replace(/<div class="edu-header"[^>]*>.*?<\/div>/is, '')
          .replace(/<h1[^>]*>.*?<\/h1>/is, '')
          .replace(/<p class="edu-intro"[^>]*>.*?<\/p>/is, '');

        // Ищем все H2
        const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
        const parsedSections = [];
        const matches = [];
        let match;

        while ((match = h2Regex.exec(rawHtml)) !== null) {
          matches.push({
            fullMatch: match[0],
            title: match[1].replace(/<[^>]+>/g, '').trim(),
            index: match.index,
          });
        }

        if (matches.length > 0) {
          // 1. ЗАХВАТЫВАЕМ ВЕСЬ ТЕКСТ/СТИЛИ ДО ПЕРВОГО H2!
          // Именно там лежали <style> и первая подсказка.
          const leadContent = rawHtml.substring(0, matches[0].index).trim();
          if (leadContent) {
            parsedSections.push({
              sectionId: `section-lead`,
              title: '', // Без заголовка, это вводная часть c подсказками
              text: leadContent,
            });
          }

          // 2. Разбираем остальные секции H2
          for (let i = 0; i < matches.length; i++) {
            const current = matches[i];
            const next = matches[i + 1];
            const start = current.index + current.fullMatch.length;
            const end = next ? next.index : rawHtml.length;

            parsedSections.push({
              sectionId: `section-${i}`,
              title: current.title,
              text: rawHtml.substring(start, end).trim(),
            });
          }
          sections = parsedSections;
        } else {
          sections = [{
            sectionId: 'section-0',
            title: meta.title,
            text: rawHtml,
          }];
        }
      }
    }

    const titleText = meta.title ? String(meta.title).trim() : 'Раздел без названия';
    const introText = meta.intro ? String(meta.intro).trim() : '';

    // 1. Обновляем или создаем мета-запись по составному ключу lessonKey_tab
    const existingMeta = await prisma.lessonMeta.findFirst({
      where: { lessonKey, tab },
    });

    if (existingMeta) {
      await prisma.lessonMeta.update({
        where: {
          lessonKey_tab: {
            lessonKey,
            tab,
          },
        },
        data: {
          title: titleText,
          intro: introText,
        },
      });
    } else {
      await prisma.lessonMeta.create({
        data: {
          lessonKey,
          tab,
          title: titleText,
          intro: introText,
        },
      });
    }

    // 2. Удаляем старые блоки
    await prisma.lessonSection.deleteMany({
      where: { lessonKey, tab },
    });

    // 3. Создаем новые блоки
    if (Array.isArray(sections) && sections.length > 0) {
      const formattedSections = sections.map((sec: any, idx: number) => ({
        lessonKey,
        tab,
        sectionId: String(sec.section_id || sec.sectionId || sec.id || `section-${idx}`),
        title: String(sec.title || ''),
        text: String(sec.text || ''),
        boxType: sec.boxType || sec.box_type ? String(sec.boxType || sec.box_type) : null,
        boxText: String(sec.boxText || sec.box_text || ''),
        textAfter: String(sec.textAfter || sec.text_after || ''),
        sortOrder: idx + 1,
      }));

      await prisma.lessonSection.createMany({
        data: formattedSections,
      });
    }

    // 4. Обновляем индекс поиска
    try {
      const fullText = `${titleText} ${introText} ${sections.map((s: any) => `${s.title} ${s.text}`).join(' ')}`
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      await prisma.$executeRaw`
        INSERT INTO search_index ("lessonKey", "tab", "title", "cleanText", "updatedAt")
        VALUES (${lessonKey}, ${tab}, ${titleText}, ${fullText}, NOW())
        ON CONFLICT ("lessonKey") 
        DO UPDATE SET "title" = ${titleText}, "cleanText" = ${fullText}, "updatedAt" = NOW();
      `;
    } catch (e) {
      console.warn('Search Index Update Warning:', e);
    }

    return NextResponse.json({ success: true, message: 'Сохранено' });
  } catch (error: any) {
    console.error('Prisma POST Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server Error' },
      { status: 500 }
    );
  }
}

// ==================================================================
// DELETE: Удаление урока ИЗ БАЗЫ ДАННЫХ (Файлы в /lessons не трогаем!)
// ==================================================================
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonKey = String(searchParams.get('lesson') || '');
    const tab = String(searchParams.get('tab') || 'doc');

    if (!lessonKey) {
      return NextResponse.json(
        { success: false, error: 'Не указан параметр lesson' },
        { status: 400 }
      );
    }

    // 1. Удаляем блоки урока
    await prisma.lessonSection.deleteMany({
      where: { lessonKey, tab },
    });

    // 2. Удаляем мета-данные урока
    await prisma.lessonMeta.deleteMany({
      where: { lessonKey, tab },
    });

    // 3. Удаляем из индекса поиска
    try {
      await prisma.$executeRaw`
        DELETE FROM search_index 
        WHERE "lessonKey" = ${lessonKey};
      `;
    } catch (e) {
      console.warn('Search Index Delete Warning:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Урок успешно удален из БД. Файл остался на сервере.',
    });
  } catch (error: any) {
    console.error('Prisma DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server Error' },
      { status: 500 }
    );
  }
}