'use client';

import { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';

const bxHeaders = [
  "ID", "Название лида", "Обращение", "Имя", "Фамилия", "Отчество", "Имя, Фамилия", "Дата рождения", 
  "Адрес", "Улица, номер дома", "Квартира, офис, комната, этаж", "Населенный пункт", "Район", "Regион", 
  "Почтовый индекс", "Страна", "Рабочий телефон", "Мобильный телефон", "Номер факса", "Домашний телефон", 
  "Номер пейджера", "Телефон для рассылок", "Другой телефон", "Корпоративный сайт", "Личная страница", 
  "Страница Facebook", "Страница ВКонтакте", "Страница LiveJournal", "Микроблог Twitter", "Другой сайт", 
  "Рабочий e-mail", "Частный e-mail", "E-mail для рассылок", "Другой e-mail", "Контакт Facebook", 
  "Контакт Telegram", "Контакт ВКонтакте", "Контакт Skype", "Контакт Viber", "Комментарии Instagram", 
  "Контакт Битрикс24 Network", "Онлайн-чат", "Контакт Открытая линия", "Контакт ICQ", "Контакт MSN/Live!", 
  "Контакт Jabber", "Другой контакт", "Связанный пользователь", "Название компании", "Должность", 
  "Комментарий", "Стадия", "Дополнительно о стадии", "Товар", "Цена", "Количество", "Возможная сумма", 
  "Валюта", "Источник", "Дополнительно об источнике", "Доступен для всех", "Ответственный", "Услуга", 
  "Файл", "Этап", "Этап_2", 
  "WhatsApp Group Id", "Telegram Group Id", "Тип базы ТМ", "Дата закрытия", "№ заявки", 
  "Yandex Client Id B242YA", "Yandex Counter Id B242YA", "Причина отказа - ЛИДЫ", 
  "Причина отказа - КОНКУРЕНТЫ", "Max Group Id", "Обновлено", "Последний статус лида", 
  "Новый список", "Источник (конкуренты)"
];

export default function ServicesPage() {
  const [activeTab, setActiveTab] = useState<'voice' | 'converter'>('voice');

  // --- 1. ОЦЕНКА ЗВОНКОВ ---
  const [voiceFiles, setVoiceFiles] = useState<File[]>([]);
  const [manager, setManager] = useState<string>('');
  const [customManager, setCustomManager] = useState<string>('');
  const [domain, setDomain] = useState<string>('');
  const [selectedPromptType, setSelectedPromptType] = useState<'seo_kr' | 'tp' | 'develop' | null>(null);
  const [prompts, setPrompts] = useState({ seo_kr: '', tp: '', develop: '' });
  const [transcript, setTranscript] = useState<string>('');
  const [resultText, setResultText] = useState<string>('');
  const [isRunningVoice, setIsRunningVoice] = useState<boolean>(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('');

  // --- 2. КОНВЕРТЕР DMP ---
  const [dmpFile, setDmpFile] = useState<File | null>(null);
  const [dmpData, setDmpData] = useState<Record<string, string>[]>([]);

  // Модалка промпта
  const [isPromptModalOpen, setIsPromptModalOpen] = useState<boolean>(false);
  const [promptModalType, setPromptModalType] = useState<'seo_kr' | 'tp' | 'develop'>('seo_kr');
  const [promptModalLabel, setPromptModalLabel] = useState<string>('');
  const [promptModalContent, setPromptModalContent] = useState<string>('');
  const [isSavingPrompt, setIsSavingPrompt] = useState<boolean>(false);

  // Refs
  const voiceFileInputRef = useRef<HTMLInputElement>(null);
  const dmpFileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    fetch('/api/voice/prompts')
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setPrompts(data);
      });
  }, []);

  useEffect(() => {
    const promptText = selectedPromptType ? prompts[selectedPromptType] : '';
    setResultText(promptText ? promptText + (transcript ? '\n\n' + transcript : '') : transcript);
  }, [selectedPromptType, transcript, prompts]);

  // Автоматическое расширение высоты текстового поля под размер контента
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight + 20, 380)}px`;
    }
  }, [resultText]);

  // --- 1. ОЦЕНКА ЗВОНКОВ ---
  const handleVoiceRecognize = async () => {
    if (voiceFiles.length === 0) return showToast('⚠️ Выберите аудиофайл');
    const activeMgr = manager === 'Другой' ? customManager.trim() : manager;
    if (!activeMgr) return showToast('⚠️ Выберите или укажите менеджера');
    if (!selectedPromptType) return showToast('⚠️ Выберите услугу');

    setIsRunningVoice(true);
    setTranscript('');
    let fullRes = '';

    for (let i = 0; i < voiceFiles.length; i++) {
      const file = voiceFiles[i];
      setVoiceStatus(`Загрузка аудио (${i + 1} из ${voiceFiles.length})...`);

      const fd = new FormData();
      fd.append('file', file);

      try {
        const res = await fetch('/api/voice/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!data.id) throw new Error('Ошибка загрузки файла');

        setVoiceStatus(`Нейрорасшифровка речи (${i + 1} из ${voiceFiles.length})...`);
        const text = await pollVoiceStatus(data.id);
        fullRes += `\n\n========================================\nЗВОНОК - ${i + 1} (${file.name})\n========================================\n\n${text}`;
        setTranscript(fullRes);
      } catch (e: any) {
        showToast('❌ Ошибка: ' + e.message);
      }
    }

    setIsRunningVoice(false);
    setVoiceStatus('');
    showToast('✨ Нейроанализ завершен!');

    // Супер плавная прокрутка к результатам
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  };

  const pollVoiceStatus = (id: string): Promise<string> => {
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        const r = await fetch(`/api/voice/status?id=${encodeURIComponent(id)}`);
        const d = await r.json();
        if (d.done) {
          clearInterval(interval);
          resolve(d.text || '');
        }
      }, 3000);
    });
  };

  // Скачивание транскрипции в .txt
  const downloadTranscriptTxt = () => {
    if (!resultText) return showToast('⚠️ Нет данных для скачивания');
    const blob = new Blob([resultText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const mgr = (manager === 'Другой' ? customManager : manager) || 'Менеджер';
    const dom = domain.trim() || 'site';
    const dateStr = new Date().toLocaleDateString('ru-RU');
    link.href = URL.createObjectURL(blob);
    link.download = `Транскрипция_${mgr}_${dom}_${dateStr}.txt`;
    link.click();
    showToast('💾 Файл транскрипции сохранен!');
  };

  // Скачивание аудиофайла с форматированным названием
  const downloadRenamedVoiceFile = () => {
    if (voiceFiles.length === 0) return showToast('⚠️ Нет загруженного аудиофайла');
    
    const now = new Date();
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const dayName = days[now.getDay()];
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateFormatted = `${day}-${month}-${year}`;

    const mgr = ((manager === 'Другой' ? customManager : manager) || 'Менеджер').replace(/\s+/g, '_');
    const dom = (domain.trim() || 'домен').replace(/^https?:\/\//, '').replace(/[\/\\]/g, '_');

    voiceFiles.forEach((file, index) => {
      const ext = file.name.split('.').pop() || 'mp3';
      const suffix = voiceFiles.length > 1 ? `_${index + 1}` : '';
      const newName = `${mgr}.${dayName}.${dateFormatted}.${dom}${suffix}.${ext}`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(file);
      link.download = newName;
      link.click();
    });

    showToast('🎧 Аудиофайл успешно скачан!');
  };

  const openPromptEditor = (type: 'seo_kr' | 'tp' | 'develop', label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPromptModalType(type);
    setPromptModalLabel(label);
    setPromptModalContent(prompts[type] || '');
    setIsPromptModalOpen(true);
  };

  const savePrompt = async () => {
    setIsSavingPrompt(true);
    try {
      const res = await fetch('/api/voice/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: promptModalType, content: promptModalContent })
      });
      const data = await res.json();
      if (data.success) {
        setPrompts((prev) => ({ ...prev, [promptModalType]: promptModalContent }));
        setIsPromptModalOpen(false);
        showToast('✅ Шаблон обновлен!');
      }
    } catch (e) {
      showToast('❌ Ошибка сохранения');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  // --- 2. КОНВЕРТЕР БАЗ DMP ---
  const handleDmpProcess = (file: File) => {
    setDmpFile(file);
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        const todayStr = new Date().toLocaleDateString('ru-RU');
        const formattedData: Record<string, string>[] = [];

        let startIdx = 0;
        if (rows.length > 0 && (rows[0].join('').toLowerCase().includes('phone') || rows[0].join('').toLowerCase().includes('sitename'))) {
          startIdx = 1;
        }

        for (let i = startIdx; i < rows.length; i++) {
          const row = rows[i];
          const site = row[2] || '';
          const phone = row[3] || '';

          const bRow: Record<string, string> = {};
          bxHeaders.forEach((h) => (bRow[h] = ''));
          bRow['Название лида'] = `ДМП - ${todayStr}`;
          bRow['Рабочий телефон'] = phone;
          bRow['Комментарий'] = site;
          bRow['Стадия'] = 'В работе у ТМ';
          bRow['Источник'] = 'Парсинг конкурентов';
          bRow['Тип базы ТМ'] = 'Конкуренты (ДМП)';
          bRow['Источник (конкуренты)'] = site;

          formattedData.push(bRow);
        }

        setDmpData(formattedData);
        showToast(`📊 Успешно сгенерировано ${formattedData.length} строк`);
      },
    });
  };

  const downloadDmpCSV = () => {
    if (dmpData.length === 0) return;
    const csv = Papa.unparse(dmpData, { quotes: true, delimiter: ';' });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Битрикс — Конкуренты - ДМП - ${new Date().toLocaleDateString('ru-RU')}.csv`;
    link.click();
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-900 font-sans relative">
      
      {/* Тотальное матовое стекло на фон во время работы ИИ */}
      {isRunningVoice && (
        <div className="fixed inset-0 z-20 bg-slate-900/10 backdrop-blur-sm transition-all pointer-events-none"></div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/50">
            {toastMessage}
          </div>
        </div>
      )}

      <main className="max-w-[1300px] w-full mx-auto px-6 py-10 flex-grow flex flex-col gap-6">
        
        {/* ИСХОДНЫЕ ТАБЫ */}
        <div className={`flex flex-wrap gap-2.5 mb-2 transition-all duration-300 ${isRunningVoice ? 'opacity-30 blur-[2px] pointer-events-none' : ''}`}>
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'voice'
                ? 'bg-slate-950 text-white shadow-md border border-slate-950'
                : 'bg-white/60 hover:bg-white text-slate-700 border border-slate-200'
            }`}
          >
            <i className="bi bi-telephone-outbound text-sky-400"></i> 1. Оценка звонков
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('converter')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'converter'
                ? 'bg-slate-950 text-white shadow-md border border-slate-950'
                : 'bg-white/60 hover:bg-white text-slate-700 border border-slate-200'
            }`}
          >
            <i className="bi bi-shuffle text-cyan-400"></i> 2. Конвертер DMP
          </button>
        </div>

        {/* ШАПКА 1 В 1 ДЛЯ ОБОИХ СЕРВИСОВ */}
        <div className={`grid lg:grid-cols-12 gap-12 lg:gap-20 items-start transition-all duration-300 ${isRunningVoice ? 'opacity-30 blur-[2px] pointer-events-none' : ''}`}>
          
          <div className="lg:col-span-7 flex flex-col justify-between h-[260px]">
            <div>
              {activeTab === 'voice' && (
                <>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest mb-4 shadow-xl shadow-slate-900/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></div>
                    Voice Analytics
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4 leading-[1.1]">
                    Анализатор звонков <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-600">TM</span>
                  </h1>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-lg">
                    Система автоматической транскрипции диалогов. Искусственный интеллект распознает речь и собирает детализированный промпт по заданному шаблону для оценки качества заявок.
                  </p>
                </>
              )}

              {activeTab === 'converter' && (
                <>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest mb-4 shadow-xl shadow-slate-900/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                    Data Tool
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4 leading-[1.1]">
                    Конвертер баз <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">DMP</span>
                  </h1>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-lg">
                    Автоматическая трансформация исходных выгрузок в формат DMP. Скрипт забирает данные, распределяет их по шаблону и выводит превью для ручной корректировки.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white/60 backdrop-blur-2xl border border-slate-200/80 rounded-[28px] p-8 shadow-xl relative h-[260px] flex flex-col justify-between">
              
              {activeTab === 'voice' && (
                <>
                  <div>
                    <h3 className="text-base font-black text-slate-800 mb-0.5">Импорт аудио</h3>
                    <p className="text-xs text-slate-400 font-medium mb-4">Поддерживаются форматы .mp3, .wav</p>
                  </div>

                  <div
                    onClick={() => voiceFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white/40 hover:bg-white rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all text-center flex-grow group"
                  >
                    <i className="bi bi-headphones text-2xl text-slate-900 group-hover:scale-110 transition-transform mb-1"></i>
                    <h4 className="text-xs font-black text-slate-700">
                      {voiceFiles.length === 0 ? 'Перетащите файл сюда' : `Выбрано файлов: ${voiceFiles.length}`}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">или кликните для выбора</p>
                  </div>

                  <input
                    ref={voiceFileInputRef}
                    type="file"
                    accept=".mp3,.wav"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && setVoiceFiles(Array.from(e.target.files))}
                  />
                </>
              )}

              {activeTab === 'converter' && (
                <>
                  <div>
                    <h3 className="text-base font-black text-slate-800 mb-0.5">Импорт данных</h3>
                    <p className="text-xs text-slate-400 font-medium mb-4">Загрузите файл в формате .CSV</p>
                  </div>

                  <div
                    onClick={() => dmpFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-cyan-500 bg-white/40 hover:bg-white rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all text-center flex-grow group"
                  >
                    <i className="bi bi-file-earmark-spreadsheet text-2xl text-cyan-600 group-hover:scale-110 transition-transform mb-1"></i>
                    <h4 className="text-xs font-black text-slate-700">
                      {dmpFile ? dmpFile.name : 'Перетащите .CSV файл сюда'}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">или кликните для выбора</p>
                  </div>

                  <input
                    ref={dmpFileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleDmpProcess(e.target.files[0])}
                  />
                </>
              )}

            </div>
          </div>
        </div>

        {/* НИЖНИЕ РАБОЧИЕ БЛОКИ */}

        {/* 1. ОЦЕНКА ЗВОНКОВ */}
        {activeTab === 'voice' && (
          <div className="space-y-6">
            {/* Блок параметров */}
            <div className={`bg-white/60 backdrop-blur-2xl border border-slate-200/80 rounded-[28px] p-8 shadow-xl transition-all duration-300 ${
              isRunningVoice ? 'opacity-30 blur-[2px] pointer-events-none' : (voiceFiles.length === 0 ? 'opacity-40 pointer-events-none' : '')
            }`}>
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block">1. Кто менеджер?</span>
                  <div className="grid grid-cols-3 gap-2">
                    {['Богомолова', 'Белова', 'Другой'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setManager(m)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${manager === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-white/80 text-slate-600 border-slate-200 hover:bg-white'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  {manager === 'Другой' && (
                    <input
                      type="text"
                      placeholder="Введите имя..."
                      value={customManager}
                      onChange={(e) => setCustomManager(e.target.value)}
                      className="mt-3 w-full px-4 py-2 bg-white/60 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block">2. Домен сайта</span>
                  <input
                    type="text"
                    placeholder="домен.ru"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block">3. Шаблон анализа</span>
                  <div className="flex flex-col gap-2">
                    {[
                      { id: 'seo_kr', label: 'Заявка на СЕО / КР' },
                      { id: 'tp', label: 'Заявка на ТП' },
                      { id: 'develop', label: 'Заявка на Разработку' },
                    ].map((item) => (
                      <div key={item.id} className="flex gap-2 items-center">
                        <button
                          type="button"
                          onClick={() => setSelectedPromptType(item.id as any)}
                          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border text-left transition-all cursor-pointer ${selectedPromptType === item.id ? 'bg-slate-950 text-white border-slate-950 shadow-md' : 'bg-white/80 text-slate-700 border-slate-200 hover:bg-white'}`}
                        >
                          {item.label}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => openPromptEditor(item.id as any, item.label, e)}
                          title="Редактировать промпт"
                          className="p-2 rounded-xl bg-white/80 border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-white transition-all cursor-pointer"
                        >
                          <i className="bi bi-pencil-square text-xs"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* БЛОК КНОПКИ ЗАПУСКА И СТАТУСА */}
            {selectedPromptType && (
              <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-center my-4 gap-3 relative z-30">
                <button
                  type="button"
                  disabled={isRunningVoice}
                  onClick={handleVoiceRecognize}
                  className={`w-full py-4 px-8 rounded-2xl font-extrabold text-xs uppercase tracking-widest text-white shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer ${
                    isRunningVoice
                      ? 'bg-slate-400 cursor-not-allowed opacity-90'
                      : 'bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-600 hover:shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                >
                  <i className={`bi ${isRunningVoice ? 'bi-cpu animate-spin' : 'bi-stars'} text-base`}></i>
                  <span>{isRunningVoice ? 'Выполняется обработка...' : '✨ Запустить нейроанализ'}</span>
                </button>

                {/* Прогрессбар и статус */}
                {isRunningVoice && (
                  <div className="w-full bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-5 shadow-2xl flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <div className="flex items-center gap-2.5">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600"></span>
                        </span>
                        <span className="text-slate-900 font-extrabold text-sm">{voiceStatus || 'Подготовка к обработке...'}</span>
                      </div>
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        AI Audio Processing
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden relative">
                      <div className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-500 rounded-full animate-pulse w-full"></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ВЫВОД РЕЗУЛЬТАТОВ И ПАНЕЛЬ УПРАВЛЕНИЯ */}
            <div
              ref={resultRef}
              className={`bg-white/60 backdrop-blur-2xl border border-slate-200/80 rounded-[28px] p-6 shadow-xl transition-all duration-300 scroll-mt-6 ${
                isRunningVoice ? 'opacity-30 blur-[2px] pointer-events-none' : (selectedPromptType ? 'opacity-100' : 'opacity-40 pointer-events-none')
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <i className="bi bi-file-text text-indigo-500"></i> Транскрипция и Промпт
                </h3>

                {/* Панель функциональных кнопок */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!resultText) return showToast('⚠️ Текст пуст');
                      navigator.clipboard.writeText(resultText);
                      showToast('📋 Скопировано в буфер!');
                    }}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <i className="bi bi-clipboard"></i> Скопировать
                  </button>

                  <button
                    type="button"
                    onClick={downloadTranscriptTxt}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <i className="bi bi-file-earmark-arrow-down text-indigo-600"></i> Скачать файл транскрипции .txt
                  </button>

                  <button
                    type="button"
                    onClick={downloadRenamedVoiceFile}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <i className="bi bi-download text-sky-500"></i> Скачать звонок
                  </button>

                  <a
                    href="https://gemini.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="bi bi-box-arrow-up-right"></i> Открыть нейросеть (Gemini)
                  </a>
                </div>
              </div>

              {/* Textarea с автоматическим расширением под объем текста */}
              <textarea
                ref={textareaRef}
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                className="w-full min-h-[380px] p-5 bg-white/40 border border-slate-200/80 rounded-2xl text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"
                placeholder="Тут появится сгенерированный нейропромпт со стенограммой..."
              />
            </div>
          </div>
        )}

        {/* 2. КОНВЕРТЕР DMP */}
        {activeTab === 'converter' && (
          <div className={`bg-white/60 backdrop-blur-2xl border border-slate-200/80 rounded-[28px] p-6 md:p-8 shadow-xl ${dmpData.length > 0 ? '' : 'opacity-40 pointer-events-none'}`}>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-1">
                  <i className="bi bi-eye text-indigo-500"></i> Предпросмотр матрицы
                </h2>
                <p className="text-xs text-slate-400 font-medium">Кликните на ячейку, чтобы исправить её перед скачиванием.</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black px-4 py-2.5 bg-slate-100 text-slate-500 rounded-xl uppercase tracking-widest">
                  {dmpData.length} строк
                </span>
                <button
                  type="button"
                  onClick={downloadDmpCSV}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Экспорт .CSV
                </button>
                <a
                  href="https://corp.server-uniofweb.ru/crm/lead/import/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Импорт в Б24
                </a>
              </div>
            </div>

            <div className="max-h-[500px] overflow-auto border border-slate-200/80 rounded-2xl bg-white/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100/80 sticky top-0 backdrop-blur-md">
                  <tr>
                    {bxHeaders.map((h) => (
                      <th key={h} className="p-3 border-b border-r border-slate-200 font-bold whitespace-nowrap text-[10px] uppercase text-slate-600">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dmpData.map((row, idx) => (
                    <tr key={`dmp_${idx}`}>
                      {bxHeaders.map((h) => (
                        <td key={`cell_${idx}_${h}`} className="p-2.5 border-b border-r border-slate-100 whitespace-nowrap text-xs font-medium text-slate-700">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* МОДАЛЬНОЕ ОКНО ПРОМПТА */}
      {isPromptModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6"
          onClick={() => setIsPromptModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-5xl rounded-[32px] p-6 md:p-8 shadow-2xl space-y-6 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-800">
                Редактирование шаблона: <span className="text-indigo-600">{promptModalLabel}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPromptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <textarea
              value={promptModalContent}
              onChange={(e) => setPromptModalContent(e.target.value)}
              className="w-full h-[450px] p-5 bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl text-xs font-mono leading-relaxed focus:outline-none"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPromptModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isSavingPrompt}
                onClick={savePrompt}
                className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                {isSavingPrompt ? 'Сохранение...' : 'Сохранить шаблон'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}