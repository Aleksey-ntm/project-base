'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';

interface NumberStat {
  number: string;
  totalCalls: number;
  successfulCalls: number;
  successfulPct: string;
  ndz: number;
  ndzPct: string;
  empHangup: number;
  empHangupPct: string;
  clientHangup: number;
  clientHangupPct: string;
}

interface CallStats {
  callDate: string;
  managerName: string;
  totalCalls: number;
  successfulCallsTotal: number;
  successfulPctTotal: string;
  firstCallStartTime: string;
  lastCallStartTime: string;
  lastCallEndTime: string;
  avgStartInterval: string;
  avgTalkTimeStr: string;
  avgPause: string;
  totalDurationSec: number;
  totalDurationStr: string;
  totalWorkTimeSec: number;
  totalWorkTimeStr: string;
  totalWaitTimeStr: string;
  totalDialTimeStr: string;
  totalTalkTimeStr: string;
  totalLineTimeStr: string;
  totalLineTimeSec: number;
  talkRatioPct: string;
  lineRatioPct: string;
  numberStats: NumberStat[];
}

interface CallItem {
  startTimeMs: number;
  durationSec: number;
  talkSec: number;
  waitSec: number;
  dialSec: number;
  virtualNumber: string;
  reason: string;
}

export default function CallStatsCalculator() {
  const [stats, setStats] = useState<CallStats | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const extractDateFromFileName = (name: string): string => {
    const match = name.match(/\d{4}-\d{2}-\d{2}/);
    if (match) {
      const [y, m, d] = match[0].split('-');
      return `${d}.${m}.${y}`;
    }
    return new Date().toLocaleDateString('ru-RU');
  };

  const parseDurationToSeconds = (val: unknown): number => {
    if (!val) return 0;
    if (val instanceof Date) {
      return val.getHours() * 3600 + val.getMinutes() * 60 + val.getSeconds();
    }
    if (typeof val === 'number') {
      return Math.round(val * 86400);
    }
    if (typeof val === 'string') {
      const parts = val.trim().split(':').map(Number);
      if (parts.some(isNaN)) return 0;
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
    }
    return 0;
  };

  const parseDateTimeToMs = (val: unknown): number | null => {
    if (!val) return null;
    if (val instanceof Date) return val.getTime();
    if (typeof val === 'number') return Math.round((val - 25569) * 86400 * 1000);

    if (typeof val === 'string') {
      const str = val.trim();
      const directParse = Date.parse(str.replace(' ', 'T'));
      if (!isNaN(directParse)) return directParse;

      const parts = str.split(' ');
      if (parts.length >= 2) {
        const datePart = parts[0];
        const timePart = parts[1];
        const [h, min, s] = timePart.split(':').map(Number);

        if (datePart.includes('-') || datePart.includes('/')) {
          const delimiter = datePart.includes('-') ? '-' : '/';
          const p = datePart.split(delimiter).map(Number);
          if (p[0] > 1000) {
            return new Date(p[0], p[1] - 1, p[2], h || 0, min || 0, s || 0).getTime();
          } else {
            return new Date(p[2], p[0] - 1, p[1], h || 0, min || 0, s || 0).getTime();
          }
        }

        if (datePart.includes('.')) {
          const [d, m, y] = datePart.split('.').map(Number);
          return new Date(y, m - 1, d, h || 0, min || 0, s || 0).getTime();
        }
      }
    }
    return null;
  };

  const formatTimeString = (ms: number): string => {
    const date = new Date(ms);
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const formatSeconds = (sec: number): string => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.round(sec % 60);
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');
    setCopied(false);
    const reader = new FileReader();

    reader.onload = (evt: ProgressEvent<FileReader>) => {
      try {
        const buffer = evt.target?.result;
        if (!buffer || !(buffer instanceof ArrayBuffer)) {
          setError('Не удалось прочитать файл');
          return;
        }

        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json<Array<unknown>>(sheet, { header: 1 });

        let headerRowIndex = -1;
        let colManagerIdx = 0;   // A
        let colDateIdx = 1;      // B
        let colVirtualIdx = 3;   // D
        let colDurationIdx = 6;  // G
        let colTalkIdx = 9;      // J
        let colReasonIdx = 10;   // K
        let colWaitIdx = 13;     // N
        let colDialIdx = 14;     // O

        for (let r = 0; r < Math.min(rows.length, 10); r++) {
          const row = rows[r];
          if (Array.isArray(row)) {
            const dateCol = row.findIndex((cell) => String(cell).includes('Дата и время звонка'));
            const managerCol = row.findIndex((cell) => String(cell).includes('Сотрудники разговора'));
            const virtCol = row.findIndex((cell) => String(cell).includes('Виртуальный номер'));
            const durCol = row.findIndex((cell) => String(cell).includes('Длительность звонка'));
            const talkCol = row.findIndex((cell) => String(cell).includes('Длительность разговора'));
            const reasonCol = row.findIndex((cell) => String(cell).includes('Причина завершения'));
            const waitCol = row.findIndex((cell) => String(cell).includes('Длительность ожидания'));
            const dialCol = row.findIndex((cell) => String(cell).includes('Длительность дозвона'));

            if (dateCol !== -1) {
              headerRowIndex = r;
              colDateIdx = dateCol;
              if (managerCol !== -1) colManagerIdx = managerCol;
              if (virtCol !== -1) colVirtualIdx = virtCol;
              if (durCol !== -1) colDurationIdx = durCol;
              if (talkCol !== -1) colTalkIdx = talkCol;
              if (reasonCol !== -1) colReasonIdx = reasonCol;
              if (waitCol !== -1) colWaitIdx = waitCol;
              if (dialCol !== -1) colDialIdx = dialCol;
              break;
            }
          }
        }

        const startFromRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 1;
        const calls: CallItem[] = [];
        let detectedManager = '';

        for (let i = startFromRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row[colDateIdx] === undefined || row[colDateIdx] === null) continue;

          if (!detectedManager && row[colManagerIdx]) {
            detectedManager = String(row[colManagerIdx]).trim();
          }

          const startTimeMs = parseDateTimeToMs(row[colDateIdx]);
          const durationSec = parseDurationToSeconds(row[colDurationIdx]);
          const talkSec = parseDurationToSeconds(row[colTalkIdx]);
          const waitSec = parseDurationToSeconds(row[colWaitIdx]);
          const dialSec = parseDurationToSeconds(row[colDialIdx]);

          const virtualNumber = row[colVirtualIdx] ? String(row[colVirtualIdx]).trim() : 'Неуказан';
          const reason = row[colReasonIdx] ? String(row[colReasonIdx]).trim() : '';

          if (startTimeMs !== null && !isNaN(startTimeMs)) {
            calls.push({ startTimeMs, durationSec, talkSec, waitSec, dialSec, virtualNumber, reason });
          }
        }

        if (calls.length === 0) {
          setError('Не удалось извлечь данные. Проверьте структуру файла.');
          return;
        }

        calls.sort((a, b) => a.startTimeMs - b.startTimeMs);

        const totalCalls = calls.length;
        const firstCall = calls[0];
        const lastCall = calls[totalCalls - 1];

        const firstCallStartMs = firstCall.startTimeMs;
        const lastCallStartMs = lastCall.startTimeMs;
        const lastCallEndMs = lastCall.startTimeMs + lastCall.durationSec * 1000;

        const totalDurationSec = calls.reduce((acc, c) => acc + c.durationSec, 0);
        const totalTalkTimeSec = calls.reduce((acc, c) => acc + c.talkSec, 0);
        const totalWaitTimeSec = calls.reduce((acc, c) => acc + c.waitSec, 0);
        const totalDialTimeSec = calls.reduce((acc, c) => acc + c.dialSec, 0);
        
        const totalLineTimeSec = totalWaitTimeSec + totalDialTimeSec + totalTalkTimeSec;

        let startIntervalsSum = 0;
        for (let i = 1; i < totalCalls; i++) {
          startIntervalsSum += (calls[i].startTimeMs - calls[i - 1].startTimeMs) / 1000;
        }
        const avgStartIntervalSec = totalCalls > 1 ? startIntervalsSum / (totalCalls - 1) : 0;

        let pausesSum = 0;
        let pauseCount = 0;
        for (let i = 1; i < totalCalls; i++) {
          const prevEndMs = calls[i - 1].startTimeMs + calls[i - 1].durationSec * 1000;
          const pauseSec = (calls[i].startTimeMs - prevEndMs) / 1000;
          if (pauseSec >= 0) {
            pausesSum += pauseSec;
            pauseCount++;
          }
        }
        const avgPauseSec = pauseCount > 0 ? pausesSum / pauseCount : 0;

        const totalWorkTimeSec = (lastCallEndMs - firstCallStartMs) / 1000;

        const numberGroups: Record<string, { total: number; ndz: number; emp: number; client: number }> = {};
        let totalSuccessfulCalls = 0;

        calls.forEach((c) => {
          if (!numberGroups[c.virtualNumber]) {
            numberGroups[c.virtualNumber] = { total: 0, ndz: 0, emp: 0, client: 0 };
          }
          numberGroups[c.virtualNumber].total += 1;

          if (c.reason.includes('Не дозвонились')) {
            numberGroups[c.virtualNumber].ndz += 1;
          } else if (c.reason.includes('Сотрудник разорвал')) {
            numberGroups[c.virtualNumber].emp += 1;
            totalSuccessfulCalls += 1;
          } else if (c.reason.includes('Абонент разорвал')) {
            numberGroups[c.virtualNumber].client += 1;
            totalSuccessfulCalls += 1;
          }
        });

        const numberStats: NumberStat[] = Object.entries(numberGroups).map(([num, data]) => {
          const successful = data.emp + data.client;
          return {
            number: num,
            totalCalls: data.total,
            successfulCalls: successful,
            successfulPct: ((successful / data.total) * 100).toFixed(1) + '%',
            ndz: data.ndz,
            ndzPct: ((data.ndz / data.total) * 100).toFixed(1) + '%',
            empHangup: data.emp,
            empHangupPct: ((data.emp / data.total) * 100).toFixed(1) + '%',
            clientHangup: data.client,
            clientHangupPct: ((data.client / data.total) * 100).toFixed(1) + '%',
          };
        });

        const avgTalkSec = totalSuccessfulCalls > 0 ? totalTalkTimeSec / totalSuccessfulCalls : 0;
        const callDate = extractDateFromFileName(file.name);

        setStats({
          callDate,
          managerName: detectedManager || 'Не найден',
          totalCalls,
          successfulCallsTotal: totalSuccessfulCalls,
          successfulPctTotal: ((totalSuccessfulCalls / totalCalls) * 100).toFixed(1) + '%',
          firstCallStartTime: formatTimeString(firstCallStartMs),
          lastCallStartTime: formatTimeString(lastCallStartMs),
          lastCallEndTime: formatTimeString(lastCallEndMs),
          avgStartInterval: formatSeconds(avgStartIntervalSec),
          avgTalkTimeStr: formatSeconds(avgTalkSec),
          avgPause: formatSeconds(avgPauseSec),
          totalDurationSec,
          totalDurationStr: formatSeconds(totalDurationSec),
          totalWorkTimeSec,
          totalWorkTimeStr: formatSeconds(totalWorkTimeSec),
          totalWaitTimeStr: formatSeconds(totalWaitTimeSec),
          totalDialTimeStr: formatSeconds(totalDialTimeSec),
          totalTalkTimeStr: formatSeconds(totalTalkTimeSec),
          totalLineTimeStr: formatSeconds(totalLineTimeSec),
          totalLineTimeSec,
          talkRatioPct: ((totalTalkTimeSec / totalWorkTimeSec) * 100).toFixed(1) + '%',
          lineRatioPct: ((totalLineTimeSec / totalWorkTimeSec) * 100).toFixed(1) + '%',
          numberStats,
        });
      } catch (err) {
        console.error(err);
        setError('Ошибка при обработке файла.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // КОПИРОВАНИЕ С ПУСТЫМИ МЕСТАМИ ВМЕСТО ЛИДОВ И ОТГУЛОВ
  const copyToClipboard = () => {
    if (!stats) return;

    let tsv = `${stats.totalCalls}\n`;
    tsv += `${stats.successfulCallsTotal}\n`;
    tsv += `${stats.successfulPctTotal}\n`;
    tsv += ` \n`; // Пустое место для Лиды
    tsv += ` \n\n`; // Пустое место для Отгулы

    tsv += `${stats.firstCallStartTime}\n`;
    tsv += `${stats.lastCallEndTime}\n\n`;

    tsv += `${stats.totalWorkTimeStr}\n`;
    tsv += `${stats.totalWaitTimeStr}\n`;
    tsv += `${stats.totalDialTimeStr}\n`;
    tsv += `${stats.totalLineTimeStr}\n`;
    tsv += `${stats.totalTalkTimeStr}\n`;
    tsv += `${stats.avgStartInterval}\n`;
    tsv += `${stats.avgTalkTimeStr}\n\n`;

    tsv += `${stats.talkRatioPct}\n`;
    tsv += `${stats.lineRatioPct}`;

    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Анализ звонков из Excel</h2>
        <p className="text-gray-500 text-sm mb-6">
          Расчет статистических показателей с экспортом чистых данных для Excel
        </p>

        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mb-1 text-sm text-gray-700 font-medium">
              {fileName ? fileName : 'Нажмите или перетащите файл сюда'}
            </p>
            <p className="text-xs text-gray-400">XLSX, XLS или CSV</p>
          </div>
          <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
        </label>

        {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
      </div>

      {stats && (
        <div className="space-y-6">
          {/* Менеджер, Дата и Кнопка копирования */}
          <div className="bg-white border border-gray-200 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Отчет за дату:</span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded">{stats.callDate}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mt-1">{stats.managerName}</h3>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={copyToClipboard}
                className={`px-5 py-3 rounded-lg font-bold text-sm shadow-md transition-all flex items-center gap-2 ${
                  copied
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                {copied ? 'Скопировано в буфер!' : 'Скопировать чистые цифры (Ctrl+V)'}
              </button>
            </div>
          </div>

          {/* Карточки Времени */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <span className="text-xs font-semibold uppercase text-gray-400">Время ожидания</span>
              <div className="text-2xl font-bold text-gray-800 mt-1">{stats.totalWaitTimeStr}</div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <span className="text-xs font-semibold uppercase text-gray-400">Время дозвона</span>
              <div className="text-2xl font-bold text-gray-800 mt-1">{stats.totalDialTimeStr}</div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <span className="text-xs font-semibold uppercase text-gray-400">Время в разговоре</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.totalTalkTimeStr}</div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-200 bg-emerald-50/30">
              <span className="text-xs font-semibold uppercase text-emerald-600">Время на линии</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.totalLineTimeStr}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <span className="text-xs font-semibold uppercase text-gray-400">Первый звонок</span>
              <div className="text-2xl font-bold text-gray-800 mt-1">{stats.firstCallStartTime}</div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <span className="text-xs font-semibold uppercase text-gray-400">Последний звонок</span>
              <div className="text-2xl font-bold text-gray-800 mt-1">{stats.lastCallEndTime}</div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <span className="text-xs font-semibold uppercase text-gray-400">Рабочий интервал</span>
              <div className="text-2xl font-bold text-gray-800 mt-1">{stats.totalWorkTimeStr}</div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <span className="text-xs font-semibold uppercase text-gray-400">Ср. между началами</span>
              <div className="text-2xl font-bold text-gray-800 mt-1">{stats.avgStartInterval}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Загрузка рабочего дня</h3>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 text-sm">% загруженности (разговор)</span>
                <span className="font-bold text-emerald-600">{stats.talkRatioPct}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 text-sm">% загруженности (всего)</span>
                <span className="font-bold text-gray-800">{stats.lineRatioPct}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 text-sm">Ср. время разговора</span>
                <span className="font-semibold text-gray-800">{stats.avgTalkTimeStr}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Итог разговоров</h3>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 text-sm">Звонков</span>
                <span className="font-semibold text-gray-800">{stats.totalCalls}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 text-sm">Разговоров</span>
                <span className="font-bold text-emerald-600">{stats.successfulCallsTotal}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 text-sm">% Дозвона</span>
                <span className="font-bold text-emerald-600">{stats.successfulPctTotal}</span>
              </div>
            </div>
          </div>

          {/* Таблица по виртуальным номерам */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-bold text-gray-800 mb-4">Детализация по виртуальным номерам</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-3">Номер</th>
                    <th className="py-3 px-3">Всего</th>
                    <th className="py-3 px-3">Успешные</th>
                    <th className="py-3 px-3">% Успешных</th>
                    <th className="py-3 px-3">НДЗ</th>
                    <th className="py-3 px-3">% НДЗ</th>
                    <th className="py-3 px-3">Сотрудник</th>
                    <th className="py-3 px-3">% Сотр.</th>
                    <th className="py-3 px-3">Абонент</th>
                    <th className="py-3 px-3">% Абон.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {stats.numberStats.map((item) => (
                    <tr key={item.number} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-gray-800">{item.number}</td>
                      <td className="py-3 px-3 font-medium text-gray-700">{item.totalCalls}</td>
                      <td className="py-3 px-3 font-bold text-emerald-600">{item.successfulCalls}</td>
                      <td className="py-3 px-3 font-bold text-emerald-600 bg-emerald-50/50">{item.successfulPct}</td>
                      <td className="py-3 px-3 font-medium text-amber-600">{item.ndz}</td>
                      <td className="py-3 px-3 font-medium text-amber-600 bg-amber-50/50">{item.ndzPct}</td>
                      <td className="py-3 px-3 text-gray-600">{item.empHangup}</td>
                      <td className="py-3 px-3 text-gray-500">{item.empHangupPct}</td>
                      <td className="py-3 px-3 text-gray-600">{item.clientHangup}</td>
                      <td className="py-3 px-3 text-gray-500">{item.clientHangupPct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}