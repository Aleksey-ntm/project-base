import { NextRequest, NextResponse } from 'next/server';

interface WordToken {
  word: string;
  norm: string;
  start: number;
  end: number;
}

interface Segment {
  start: number;
  end: number;
  text: string;
  normText: string;
  normWords: string[];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const opId = searchParams.get('id');

  if (!opId) return NextResponse.json({ error: 'no_id' }, { status: 400 });

  try {
    const apiKey = process.env.YANDEX_SPEECHKIT_API_KEY;
    const folderId = process.env.YANDEX_FOLDER_ID;

    // 1. Проверяем статус операции Yandex
    console.log(`[STT Status] 🔍 Проверка Operation ID: ${opId}`);
    const opRes = await fetch(`https://operation.api.cloud.yandex.net/operations/${encodeURIComponent(opId)}`, {
      headers: { 'Authorization': `Api-Key ${apiKey}` },
    });

    if (!opRes.ok) {
      const errBody = await opRes.text();
      console.error(`[STT Status] ❌ Ошибка проверки операции (${opRes.status}):`, errBody);
      return NextResponse.json({ error: `Operation API error ${opRes.status}` }, { status: 500 });
    }

    const opData = await opRes.json();

    // Если операция еще выполняется
    if (!opData.done) {
      console.log(`[STT Status] ⏳ Операция ${opId} еще выполняется...`);
      return NextResponse.json({ done: false });
    }

    // Если в Яндекс Операции возникла ошибка
    if (opData.error) {
      console.error(`[STT Status] ❌ Яндекс вернул ошибку транскрипции:`, opData.error);
      return NextResponse.json({ done: true, error: opData.error.message || 'STT Operation Error' });
    }

    // 2. Достаем события из ответа операции Yandex STT v3
    let events: any[] = [];

    // Читаем из результата ответа операции
    if (opData.response?.chunks) {
      events = opData.response.chunks;
    } else if (Array.isArray(opData.response?.events)) {
      events = opData.response.events;
    } else {
      // Запасной фоллбэк: пробуем запросить выгрузку
      const recRes = await fetch(`https://stt.api.cloud.yandex.net/stt/v3/getRecognition?operation_id=${encodeURIComponent(opId)}`, {
        headers: {
          'Authorization': `Api-Key ${apiKey}`,
          'x-folder-id': folderId || '',
        },
      });

      if (recRes.ok) {
        const textStream = await recRes.text();
        const rawLines = textStream.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
        for (const line of rawLines) {
          try { events.push(JSON.parse(line)); } catch (e) {}
        }
      }
    }

    console.log(`[STT Status] 📦 Найдено событий/чанков для обработки: ${events.length}`);

    // 3. Извлекаем и восстанавливаем сегменты
    let segments = extractSegmentsFromEvents(events);

    // Сортировка по времени начала/конца
    segments.sort((a, b) => {
      if (a.start === b.start) {
        if (a.end === b.end) {
          return b.text.length - a.text.length;
        }
        return a.end - b.end;
      }
      return a.start - b.start;
    });

    // Дедупликация и слияние
    const finalSegments: Segment[] = [];
    for (const current of segments) {
      if (finalSegments.length === 0) {
        finalSegments.push(current);
        continue;
      }

      const lastIdx = finalSegments.length - 1;
      const prev = finalSegments[lastIdx];

      if (isSameOrDuplicateSegment(prev, current) || isContainedShortDuplicate(prev, current)) {
        finalSegments[lastIdx] = chooseBetterSegment(prev, current);
        continue;
      }

      finalSegments.push(current);
    }

    // Форматирование результатов в виде [M:SS-M:SS] Текст
    const formattedLines: string[] = [];
    for (const seg of finalSegments) {
      if (!seg.text) continue;
      formattedLines.push(`[${formatTime(seg.start)}-${formatTime(seg.end)}] ${seg.text}`);
    }

    const resultText = formattedLines.join('\n');
    console.log(`[STT Status] ✅ Успешно сформирована стенограмма (${resultText.length} символов)`);

    return NextResponse.json({
      done: true,
      text: resultText
    });

  } catch (error: any) {
    console.error('[STT Status] 💥 Критическая ошибка:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

function extractSegmentsFromEvents(events: any[]): Segment[] {
  const segments: Segment[] = [];

  for (const event of events) {
    // Поддержка разной вложенности ответа Yandex STT v3
    const result = event.result || event;
    if (!result) continue;

    const nodes: any[] = [];
    if (result.final) nodes.push(result.final);
    if (result.finalRefinement?.normalizedText) nodes.push(result.finalRefinement.normalizedText);
    if (result.alternatives) nodes.push(result);

    for (const node of nodes) {
      const alts = node.alternatives || [node];
      if (!Array.isArray(alts) || !alts[0]) continue;

      const alt = alts[0];
      const words: WordToken[] = [];

      for (const item of (alt.words || [])) {
        const text = (item.text || item.word || '').trim();
        const start = parseMsOrDuration(item.startTimeMs || item.startTime);
        const end = parseMsOrDuration(item.endTimeMs || item.endTime);

        if (!text || start === null || end === null) continue;

        words.push({
          word: text,
          norm: normalizeToken(text),
          start,
          end
        });
      }

      if (words.length > 0) {
        const split = splitWordsToSegments(words, 0.9);
        for (const seg of split) {
          if (seg.text) segments.push(normalizeSegment(seg));
        }
        continue;
      }

      const text = cleanText(alt.text || '');
      const start = parseMsOrDuration(alt.startTimeMs || alt.startTime || 0);
      const end = parseMsOrDuration(alt.endTimeMs || alt.endTime || 0);

      if (text && start !== null && end !== null) {
        segments.push(normalizeSegment({
          start,
          end,
          text,
          normWords: normalizeTextWords(text)
        }));
      }
    }
  }

  return segments;
}

function parseMsOrDuration(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val > 100000 ? val / 1000.0 : val;
  
  const str = String(val).trim();
  if (!str) return null;
  if (/^\d+$/.test(str)) return parseFloat(str) / 1000.0;

  const m = str.match(/^(\d+)(?:\.(\d+))?s$/);
  if (m) {
    let sec = parseFloat(m[1]);
    if (m[2]) sec += parseFloat('0.' + m[2]);
    return sec;
  }

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function splitWordsToSegments(words: WordToken[], pauseThreshold: number): any[] {
  const segments: any[] = [];
  let currWords: string[] = [];
  let currNorm: string[] = [];
  let currStart: number | null = null;
  let currEnd: number | null = null;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (currStart === null) {
      currStart = w.start;
      currEnd = w.end;
      currWords.push(w.word);
      if (w.norm) currNorm.push(w.norm);
      continue;
    }

    const gap = w.start - (currEnd || 0);
    if (gap > pauseThreshold) {
      segments.push({ start: currStart, end: currEnd, text: cleanText(currWords.join(' ')), normWords: currNorm });
      currWords = [];
      currNorm = [];
      currStart = w.start;
    }

    currWords.push(w.word);
    if (w.norm) currNorm.push(w.norm);
    currEnd = w.end;

    if (i === words.length - 1) {
      segments.push({ start: currStart, end: currEnd, text: cleanText(currWords.join(' ')), normWords: currNorm });
    }
  }

  return segments;
}

function normalizeSegment(segment: any): Segment {
  const text = cleanText(segment.text || '');
  return {
    start: Number(segment.start),
    end: Number(segment.end),
    text,
    normText: normalizeText(text),
    normWords: segment.normWords || []
  };
}

function normalizeToken(word: string): string {
  return word.toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, '').trim();
}

function normalizeText(text: string): string {
  return normalizeTextWords(text).join(' ');
}

function normalizeTextWords(text: string): string[] {
  const parts = cleanText(text).split(/\s+/u).filter(Boolean);
  return parts.map(normalizeToken).filter(Boolean);
}

function cleanText(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

function isSameOrDuplicateSegment(a: Segment, b: Segment): boolean {
  const timeOverlap = overlapRatio(a.start, a.end, b.start, b.end);
  const textSim = textSimilarity(a.normText, b.normText);

  if (a.start === b.start && a.end === b.end && textSim >= 70.0) return true;
  if (timeOverlap >= 0.85 && textSim >= 82.0) return true;
  if (timeOverlap >= 0.60 && (a.normText.includes(b.normText) || b.normText.includes(a.normText))) return true;

  return false;
}

function isContainedShortDuplicate(a: Segment, b: Segment): boolean {
  const textSim = textSimilarity(a.normText, b.normText);
  const aInsideB = a.start >= b.start && a.end <= b.end;
  const bInsideA = b.start >= a.start && b.end <= a.end;

  if ((aInsideB || bInsideA) && textSim >= 60.0) return true;
  if ((aInsideB || bInsideA) && (a.normText.includes(b.normText) || b.normText.includes(a.normText))) return true;

  return false;
}

function chooseBetterSegment(a: Segment, b: Segment): Segment {
  return segmentScore(b) > segmentScore(a) ? b : a;
}

function segmentScore(segment: Segment): number {
  const wordCount = segment.normWords ? segment.normWords.length : segment.normText.split(/\s+/).length;
  const charCount = segment.text.length;
  const durationMs = Math.round((segment.end - segment.start) * 1000);
  return (wordCount * 1000) + charCount + durationMs;
}

function overlapRatio(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  const intersection = Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
  if (intersection <= 0) return 0;
  const aLen = Math.max(0.001, aEnd - aStart);
  const bLen = Math.max(0.001, bEnd - bStart);
  return intersection / Math.min(aLen, bLen);
}

function textSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 100;
  
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 100.0;
  
  let matches = 0;
  const longerWords = longer.split(' ');
  const shorterWords = shorter.split(' ');
  for (const w of shorterWords) {
    if (longerWords.includes(w)) matches++;
  }
  return (matches / longerWords.length) * 100;
}

function formatTime(seconds: number): string {
  const sec = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}