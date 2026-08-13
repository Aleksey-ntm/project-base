'use client';

import { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

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

interface Slot {
  id: number;
  name: string;
  total_leads: number;
}

export default function ServicesPage() {
  const [activeTab, setActiveTab] = useState<'voice' | 'converter' | 'duplicate'>('voice');

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

  // --- 3. ДУБЛИ И СЛИЯНИЕ БАЗ ---
  const [slots, setSlots] = useState<Slot[]>([]);
  const [currentSlotId, setCurrentSlotId] = useState<number | null>(null);
  const [newSlotName, setNewSlotName] = useState<string>('');
  const [slotLeads, setSlotLeads] = useState<any[]>([]);
  const [dupReportInserted, setDupReportInserted] = useState<number>(0);
  const [dupDuplicates, setDupDuplicates] = useState<any[]>([]);
  const [isDupModalOpen, setIsDupModalOpen] = useState<boolean>(false);

  // Модалка промпта
  const [isPromptModalOpen, setIsPromptModalOpen] = useState<boolean>(false);
  const [promptModalType, setPromptModalType] = useState<'seo_kr' | 'tp' | 'develop'>('seo_kr');
  const [promptModalLabel, setPromptModalLabel] = useState<string>('');
  const [promptModalContent, setPromptModalContent] = useState<string>('');
  const [isSavingPrompt, setIsSavingPrompt] = useState<boolean>(false);

  // Refs
  const voiceFileInputRef = useRef<HTMLInputElement>(null);
  const dmpFileInputRef = useRef<HTMLInputElement>(null);
  const dupFileInputRef = useRef<HTMLInputElement>(null);

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

    loadSlots();
  }, []);

  useEffect(() => {
    const promptText = selectedPromptType ? prompts[selectedPromptType] : '';
    setResultText(promptText ? promptText + (transcript ? '\n\n' + transcript : '') : transcript);
  }, [selectedPromptType, transcript, prompts]);

  const loadSlots = () => {
    fetch('/api/duplicate?action=get_slots')
      .then((r) => r.json())
      .then((data) => {
        if (data.slots) setSlots(data.slots);
      });
  };

  // --- 1. ОЦЕНКА ЗВОНКОВ ---
  const handleVoiceRecognize = async () => {
    if (voiceFiles.length === 0) return showToast('⚠️ Выберите аудиофайл');
    if (!manager) return showToast('⚠️ Выберите менеджера');
    if (!selectedPromptType) return showToast('⚠️ Выберите услугу');

    setIsRunningVoice(true);
    setTranscript('');
    let fullRes = '';

    for (let i = 0; i < voiceFiles.length; i++) {
      const file = voiceFiles[i];
      setVoiceStatus(`Загрузка (${i + 1}/${voiceFiles.length})...`);

      const fd = new FormData();
      fd.append('file', file);

      try {
        const res = await fetch('/api/voice/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!data.id) throw new Error('Ошибка загрузки файла');

        setVoiceStatus(`Расшифровка (${i + 1}/${voiceFiles.length})...`);
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

  // --- 3. ДУБЛИ И СЛИЯНИЕ БАЗ ---
  const handleCreateSlot = async () => {
    if (!newSlotName.trim()) return showToast('⚠️ Введите название слота');
    const fd = new FormData();
    fd.append('action', 'create_slot');
    fd.append('name', newSlotName);

    const r = await fetch('/api/duplicate', { method: 'POST', body: fd });
    const d = await r.json();
    if (d.success) {
      setNewSlotName('');
      loadSlots();
      selectSlot(d.slot_id);
      showToast('✅ Слот создан!');
    }
  };

  const selectSlot = async (slotId: number) => {
    setCurrentSlotId(slotId);
    const r = await fetch(`/api/duplicate?action=get_leads&slot_id=${slotId}`);
    const d = await r.json();
    if (d.leads) setSlotLeads(d.leads);
  };

  const handleDeleteSlot = async (e: React.MouseEvent, slotId: number) => {
    e.stopPropagation();
    if (!confirm('Вы уверены, что хотите удалить слот и его данные?')) return;
    const fd = new FormData();
    fd.append('action', 'delete_slot');
    fd.append('slot_id', String(slotId));

    await fetch('/api/duplicate', { method: 'POST', body: fd });
    if (currentSlotId === slotId) {
      setCurrentSlotId(null);
      setSlotLeads([]);
    }
    loadSlots();
  };

  const handleUpdateSlotName = async (slotId: number, name: string) => {
    if (!name.trim()) return;
    const fd = new FormData();
    fd.append('action', 'update_slot_name');
    fd.append('slot_id', String(slotId));
    fd.append('name', name);
    await fetch('/api/duplicate', { method: 'POST', body: fd });
    loadSlots();
  };

  const handleDupFileUpload = (file: File) => {
    if (!currentSlotId) return showToast('⚠️ Выберите слот слева!');

    const fd = new FormData();
    fd.append('action', 'import_csv');
    fd.append('slot_id', String(currentSlotId));
    fd.append('file', file);
    fd.append('col_phone', '0');

    fetch('/api/duplicate', { method: 'POST', body: fd })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setDupReportInserted(d.inserted);
          setDupDuplicates(d.duplicates);
          setIsDupModalOpen(true);
          selectSlot(currentSlotId);
        }
      });
  };

  const updateLeadCell = async (leadId: string, field: string, value: string) => {
    const fd = new FormData();
    fd.append('action', 'update_cell');
    fd.append('lead_id', leadId);
    fd.append('field', field);
    fd.append('value', value);
    await fetch('/api/duplicate', { method: 'POST', body: fd });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-900 font-sans relative">
      <Header isAdmin={true} username="Администратор" />

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/50">
            {toastMessage}
          </div>
        </div>
      )}

      <main className="max-w-[1300px] w-full mx-auto px-6 py-10 flex-grow flex flex-col gap-6">
        
        {/* ИСХОДНЫЕ ТАБЫ */}
        <div className="flex flex-wrap gap-2.5 mb-2">
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
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
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
              activeTab === 'converter'
                ? 'bg-slate-950 text-white shadow-md border border-slate-950'
                : 'bg-white/60 hover:bg-white text-slate-700 border border-slate-200'
            }`}
          >
            <i className="bi bi-shuffle text-cyan-400"></i> 2. Конвертер DMP
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('duplicate')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
              activeTab === 'duplicate'
                ? 'bg-slate-950 text-white shadow-md border border-slate-950'
                : 'bg-white/60 hover:bg-white text-slate-700 border border-slate-200'
            }`}
          >
            <i className="bi bi-database-gear text-indigo-400"></i> 3. Дубли и слияние
          </button>
        </div>

        {/* ШАПКА 1 В 1 ДЛЯ ВСЕХ 3 СЕРВИСОВ */}
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          
          <div className="lg:col-span-7 flex flex-col justify-between h-[260px]">
            <div>
              {activeTab === 'voice' && (
                <>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest mb-4 shadow-xl shadow-slate-900/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></div>
                    NTM Voice Analytics
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
                    NTM Data Tool
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4 leading-[1.1]">
                    Конвертер баз <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">DMP</span>
                  </h1>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-lg">
                    Автоматическая трансформация исходных выгрузок в формат DMP. Скрипт забирает данные, распределяет их по шаблону и выводит превью для ручной корректировки.
                  </p>
                </>
              )}

              {activeTab === 'duplicate' && (
                <>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest mb-4 shadow-xl shadow-slate-900/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></div>
                    NTM Data Aggregator
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4 leading-[1.1]">
                    Слияние и накопление <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">ТМ</span>
                  </h1>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-lg">
                    Агрегатор баз данных со слотовой структурой. Автоматический поиск дубликатов по номеру телефона, защита от повторных выгрузок и удаление дублей.
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
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white/40 hover:bg-white rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all text-center flex-grow"
                  >
                    <i className="bi bi-headphones text-2xl text-slate-900 mb-1"></i>
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
                    className="border-2 border-dashed border-slate-300 hover:border-cyan-500 bg-white/40 hover:bg-white rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all text-center flex-grow"
                  >
                    <i className="bi bi-file-earmark-spreadsheet text-2xl text-cyan-600 mb-1"></i>
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

              {activeTab === 'duplicate' && (
                <div className="relative h-full flex flex-col justify-between">
                  {!currentSlotId && (
                    <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-md rounded-[24px] flex items-center justify-center p-4">
                      <div className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider shadow-lg flex items-center gap-2">
                        <i className="bi bi-lock-fill text-indigo-500"></i> Выберите слот ниже для загрузки
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-base font-black text-slate-800 mb-0.5">Слияние в слот</h3>
                    <p className="text-xs text-slate-400 font-medium mb-4">Добавить новые строки в активную базу (.CSV)</p>
                  </div>

                  <div
                    onClick={() => currentSlotId && dupFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white/40 hover:bg-white rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all text-center flex-grow"
                  >
                    <i className="bi bi-cloud-arrow-up text-2xl text-indigo-600 mb-1"></i>
                    <h4 className="text-xs font-black text-slate-700">Перетащите файл базы сюда</h4>
                    <p className="text-[11px] text-slate-400 font-medium">или кликните для выбора</p>
                  </div>

                  <input
                    ref={dupFileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleDupFileUpload(e.target.files[0])}
                  />
                </div>
              )}

            </div>
          </div>
        </div>

        {/* НИЖНИЕ РАБОЧИЕ БЛОКИ */}

        {/* 1. ОЦЕНКА ЗВОНКОВ */}
        {activeTab === 'voice' && (
          <div className="space-y-6">
            <div className={`bg-white/60 backdrop-blur-2xl border border-slate-200/80 rounded-[28px] p-8 shadow-xl transition-all ${voiceFiles.length === 0 ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block">1. Кто менеджер?</span>
                  <div className="grid grid-cols-3 gap-2">
                    {['Богомолова', 'Белова', 'Другой'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setManager(m)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${manager === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-white/80 text-slate-600 border-slate-200'}`}
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
                      className="mt-3 w-full px-4 py-2 bg-white/60 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block">2. Домен сайта</span>
                  <input
                    type="text"
                    placeholder="ntmbase.ru"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
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
                          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border text-left transition-all ${selectedPromptType === item.id ? 'bg-slate-950 text-white border-slate-950 shadow-md' : 'bg-white/80 text-slate-700 border-slate-200'}`}
                        >
                          {item.label}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => openPromptEditor(item.id as any, item.label, e)}
                          className="p-2 rounded-xl bg-white/80 border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all"
                        >
                          <i className="bi bi-pencil-square text-xs"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {selectedPromptType && (
              <div className="flex flex-col items-center justify-center my-2">
                <button
                  type="button"
                  disabled={isRunningVoice}
                  onClick={handleVoiceRecognize}
                  className="px-10 py-4 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:shadow-indigo-500/25 transition-all"
                >
                  {isRunningVoice ? voiceStatus || 'Обработка...' : '✨ Запустить нейроанализ'}
                </button>
              </div>
            )}

            <div className={`bg-white/60 backdrop-blur-2xl border border-slate-200/80 rounded-[28px] p-6 shadow-xl ${selectedPromptType ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <i className="bi bi-file-text text-indigo-500"></i> Транскрипция и Промпт
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(resultText);
                    showToast('📋 Скопировано в буфер!');
                  }}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all"
                >
                  📋 Скопировать
                </button>
              </div>

              <textarea
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                className="w-full h-[380px] p-4 bg-white/40 border border-slate-200/80 rounded-2xl text-xs font-mono leading-relaxed focus:outline-none"
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
                  className="px-6 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition-all"
                >
                  Экспорт .CSV
                </button>
                <a
                  href="https://corp.server-uniofweb.ru/crm/lead/import/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition-all"
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

        {/* 3. ДУБЛИ И СЛИЯНИЕ (ПОЛНОРАЗМЕРНАЯ МАТРИЦА СЛОТА ВНИЗУ) */}
        {activeTab === 'duplicate' && (
          <div className="space-y-6">
            
            {/* Панель слотов */}
            <div className="bg-white/60 backdrop-blur-2xl border border-slate-200/80 rounded-[28px] p-6 shadow-xl space-y-4">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">1. Создать новый рабочий слот</h4>
              <div className="flex gap-3 max-w-xl">
                <input
                  type="text"
                  placeholder="Например: Основная база ТМ 2026"
                  value={newSlotName}
                  onChange={(e) => setNewSlotName(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateSlot}
                  className="h-11 px-5 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap"
                >
                  Создать
                </button>
              </div>

              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider pt-2">2. Доступные слоты базы данных:</h4>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {slots.length === 0 ? (
                  <div className="text-slate-400 text-xs py-2">Слотов пока нет. Создайте первый слот выше!</div>
                ) : (
                  slots.map((slot) => {
                    const isActive = slot.id === currentSlotId;
                    return (
                      <div
                        key={`slot_${slot.id}`}
                        onClick={() => selectSlot(slot.id)}
                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                            : 'bg-white/80 border-slate-200 hover:bg-white text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <i className={`bi bi-database text-sm ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}></i>
                          <div className="overflow-hidden">
                            <h5
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => handleUpdateSlotName(slot.id, e.currentTarget.innerText)}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-black truncate outline-none"
                            >
                              {slot.name}
                            </h5>
                            <span className={`text-[10px] font-bold uppercase tracking-wider block ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                              {slot.total_leads || 0} строк
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteSlot(e, slot.id)}
                          className={`text-xs p-1.5 rounded transition-all ${isActive ? 'text-indigo-200 hover:text-white' : 'text-slate-400 hover:text-rose-500'}`}
                        >
                          <i className="bi bi-trash3-fill"></i>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Полноразмерная нижняя матрица слота */}
            <div className={`bg-white/60 backdrop-blur-2xl border border-slate-200/80 rounded-[28px] p-6 md:p-8 shadow-xl ${currentSlotId ? '' : 'opacity-40 pointer-events-none'}`}>
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-1">
                    <i className="bi bi-eye text-indigo-500"></i> Содержимое базы данных слота
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">Редактируйте ячейки кликом. Изменения сохраняются мгновенно.</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black px-4 py-2.5 bg-slate-100 text-slate-500 rounded-xl uppercase tracking-widest">
                    {slotLeads.length} строк накоплено
                  </span>
                </div>
              </div>

              <div className="max-h-[500px] overflow-auto border border-slate-200/80 rounded-2xl bg-white/40">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100/80 sticky top-0 backdrop-blur-md">
                    <tr>
                      <th className="p-3 border-b border-r border-slate-200 font-bold text-[10px] uppercase text-slate-600">Рабочий телефон</th>
                      <th className="p-3 border-b border-r border-slate-200 font-bold text-[10px] uppercase text-slate-600">Имя</th>
                      <th className="p-3 border-b border-slate-200 font-bold text-[10px] uppercase text-slate-600">Сайт</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slotLeads.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center py-12 text-slate-400 font-medium text-xs">
                          База этого слота пока пуста. Загрузите первый .CSV файл справа!
                        </td>
                      </tr>
                    ) : (
                      slotLeads.map((lead, idx) => (
                        <tr key={`lead_${lead.id || idx}`} className="hover:bg-indigo-50/20">
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateLeadCell(lead.id, 'phone', e.currentTarget.innerText)}
                            className="p-2.5 border-b border-r border-slate-100 font-mono text-indigo-600 font-bold"
                          >
                            {lead.phone}
                          </td>
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateLeadCell(lead.id, 'name', e.currentTarget.innerText)}
                            className="p-2.5 border-b border-r border-slate-100 text-slate-700"
                          >
                            {lead.name}
                          </td>
                          <td
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateLeadCell(lead.id, 'site', e.currentTarget.innerText)}
                            className="p-2.5 border-b border-slate-100 text-slate-700"
                          >
                            {lead.site}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* МОДАЛЬНЫЕ ОКНА */}
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
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
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
                className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isSavingPrompt}
                onClick={savePrompt}
                className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
              >
                {isSavingPrompt ? 'Сохранение...' : 'Сохранить шаблон'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDupModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsDupModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-xl rounded-[28px] p-6 shadow-2xl space-y-4 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <i className="bi bi-check-circle-fill text-emerald-500"></i> Слияние успешно завершено
            </h3>

            <div className="grid grid-cols-2 gap-4 my-2">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                <span className="block text-2xl font-black text-emerald-600">{dupReportInserted}</span>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Уникальных строк</span>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center">
                <span className="block text-2xl font-black text-amber-600">{dupDuplicates.length}</span>
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Отсеяно дубликатов</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsDupModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md"
              >
                Отлично
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}