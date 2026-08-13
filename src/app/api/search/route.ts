import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('q');
    const query = rawQuery ? decodeURIComponent(rawQuery).trim() : '';

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, results: [] });
    }

    const safeQuery = query.toLowerCase().replace(/'/g, "''");

    // Запрашиваем записи из search_index
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT "lessonKey", "tab", "title", "cleanText"
      FROM search_index
      WHERE LOWER("title") LIKE '%${safeQuery}%'
         OR LOWER("cleanText") LIKE '%${safeQuery}%'
      LIMIT 25;
    `);

    const results: any[] = [];

    rows.forEach((row: any) => {
      const text: string = row.cleanText || '';
      const lowerQuery: string = query.toLowerCase();

      // Разбиваем текст урока на предложения/абзацы
      const sentences: string[] = text.split(/(?<=[.!?\n])\s+/);
      let matchCountInLesson = 0;

      // Явно указываем типы: sentence — string, sIdx — number
      sentences.forEach((sentence: string, sIdx: number) => {
        if (sentence.toLowerCase().includes(lowerQuery) && matchCountInLesson < 5) {
          matchCountInLesson++;
          
          // Формируем аккуратный сниппет контекста
          const matchIdx = sentence.toLowerCase().indexOf(lowerQuery);
          const start = Math.max(0, matchIdx - 40);
          const end = Math.min(sentence.length, matchIdx + query.length + 60);
          
          let snippet = sentence.slice(start, end);
          if (start > 0) snippet = '...' + snippet;
          if (end < sentence.length) snippet = snippet + '...';

          results.push({
            lesson: row.lessonKey,
            tab: row.tab || 'doc',
            page: row.title,
            section: row.title,
            snippet: snippet,
            anchor: `match-${sIdx}`,
          });
        }
      });

      // Если совпадение только в заголовке урока
      if (matchCountInLesson === 0 && row.title.toLowerCase().includes(lowerQuery)) {
        results.push({
          lesson: row.lessonKey,
          tab: row.tab || 'doc',
          page: row.title,
          section: row.title,
          snippet: text.slice(0, 100) + '...',
          anchor: 'top',
        });
      }
    });

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Search API Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Ошибка поиска' }, { status: 500 });
  }
}