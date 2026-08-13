'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface HeaderSearchProps {
  userName?: string;
  userRole?: string;
  isEditMode?: boolean;
  isEditDisabled?: boolean;
  onToggleEditMode?: () => void;
}

export default function HeaderSearch({
  userName = 'Администратор',
  userRole = 'admin',
  isEditMode = false,
  isEditDisabled = false,
  onToggleEditMode,
}: HeaderSearchProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // СОСТОЯНИЯ НАСТРОЕК
  const [resetScrollOnNav, setResetScrollOnNav] = useState<boolean>(false);
  
  // РЕЖИМ ЧТЕНИЯ: Вкл/Выкл + Тип (full / partial)
  const [readingMode, setReadingMode] = useState<boolean>(false);
  const [readingModeType, setReadingModeType] = useState<'full' | 'partial'>('full');

  // ОТДЕЛЬНЫЕ ЧЕКБОКСЫ САЙДБАРОВ
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);

  const [isLargeFont, setIsLargeFont] = useState<boolean>(false);
  const [smoothScroll, setSmoothScroll] = useState<boolean>(true);
  const [dbStatusView, setDbStatusView] = useState<'full' | 'simple'>('full');

  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [logoHref, setLogoHref] = useState('/education?tab=doc&lesson=seo');

  // ИНИЦИАЛИЗАЦИЯ НАСТРОЕК
  useEffect(() => {
    const syncFromStorage = () => {

      const activeTab = localStorage.getItem('uw_active_tab') || 'doc';
      const activeLesson = localStorage.getItem('uw_active_lesson') || 'seo';
      setLogoHref(`/education?tab=${activeTab}&lesson=${activeLesson}`);

      setResetScrollOnNav(localStorage.getItem('uw_reset_scroll') === 'true');
      
      const rm = localStorage.getItem('uw_reading_mode') === 'true';
      const rmType = (localStorage.getItem('uw_reading_mode_type') as 'full' | 'partial') || 'full';
      setReadingMode(rm);
      setReadingModeType(rmType);

      setLeftCollapsed(localStorage.getItem('uw_left_collapsed') === 'true');
      setRightCollapsed(localStorage.getItem('uw_right_collapsed') === 'true');

      setIsLargeFont(localStorage.getItem('uw_large_font') === 'true');
      setSmoothScroll(localStorage.getItem('uw_smooth_scroll') !== 'false');
      setDbStatusView((localStorage.getItem('uw_db_status_view') as 'full' | 'simple') || 'full');
    };

    syncFromStorage();
    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, []);

  // ПРИМЕНЕНИЕ КЛАССОВ НАСТРОЕК НА BODY
  useEffect(() => {
    if (isLargeFont) document.body.classList.add('uw-large-font');
    else document.body.classList.remove('uw-large-font');

    // ПРИ ЛЮБОМ ВЕШЕНИИ РЕЖИМА ЧТЕНИЯ ВЕШАЕМ КЛАСС ДЛЯ РАСШИРЕНИЯ ТЕКСТА
    if (readingMode) document.body.classList.add('uw-reading-mode');
    else document.body.classList.remove('uw-reading-mode');
  }, [isLargeFont, readingMode]);

  const updateSetting = (key: string, value: any, setter: (v: any) => void) => {
    setter(value);
    localStorage.setItem(key, String(value));
    window.dispatchEvent(new Event('storage'));
  };

  // ЛОГИКА РЕЖИМА ЧТЕНИЯ
  const handleReadingModeToggle = (enabled: boolean) => {
    setReadingMode(enabled);
    localStorage.setItem('uw_reading_mode', String(enabled));

    if (enabled && readingModeType === 'full') {
      // ПОЛНЫЙ РЕЖИМ: Сразу проставляем галочки и скрываем оба сайдбара
      setLeftCollapsed(true);
      setRightCollapsed(true);
      localStorage.setItem('uw_left_collapsed', 'true');
      localStorage.setItem('uw_right_collapsed', 'true');
    } else if (enabled && readingModeType === 'partial') {
      // ЧАСТИЧНЫЙ РЕЖИМ: Сайдбары не скрываются (если не скрыты вручную)
      const l = localStorage.getItem('uw_manual_left_collapsed') === 'true';
      const r = localStorage.getItem('uw_manual_right_collapsed') === 'true';
      setLeftCollapsed(l);
      setRightCollapsed(r);
      localStorage.setItem('uw_left_collapsed', String(l));
      localStorage.setItem('uw_right_collapsed', String(r));
    } else if (!enabled) {
      // ВЫКЛЮЧЕНО: Возвращаем состояния ручных галочек
      const l = localStorage.getItem('uw_manual_left_collapsed') === 'true';
      const r = localStorage.getItem('uw_manual_right_collapsed') === 'true';
      setLeftCollapsed(l);
      setRightCollapsed(r);
      localStorage.setItem('uw_left_collapsed', String(l));
      localStorage.setItem('uw_right_collapsed', String(r));
    }

    window.dispatchEvent(new Event('storage'));
  };

  const handleReadingModeTypeChange = (type: 'full' | 'partial') => {
    setReadingModeType(type);
    localStorage.setItem('uw_reading_mode_type', type);

    if (readingMode) {
      if (type === 'full') {
        // ПОЛНЫЙ: Блокируем и скрываем
        setLeftCollapsed(true);
        setRightCollapsed(true);
        localStorage.setItem('uw_left_collapsed', 'true');
        localStorage.setItem('uw_right_collapsed', 'true');
      } else {
        // ЧАСТИЧНЫЙ: Разблокируем и берем ручные настройки
        const l = localStorage.getItem('uw_manual_left_collapsed') === 'true';
        const r = localStorage.getItem('uw_manual_right_collapsed') === 'true';
        setLeftCollapsed(l);
        setRightCollapsed(r);
        localStorage.setItem('uw_left_collapsed', String(l));
        localStorage.setItem('uw_right_collapsed', String(r));
      }
    }

    window.dispatchEvent(new Event('storage'));
  };

  // РУЧНОЕ ПЕРЕКЛЮЧЕНИЕ ЧЕКБОКСОВ САЙДБАРОВ
  const handleLeftSidebarToggle = (val: boolean) => {
    setLeftCollapsed(val);
    localStorage.setItem('uw_left_collapsed', String(val));
    localStorage.setItem('uw_manual_left_collapsed', String(val));
    window.dispatchEvent(new Event('storage'));
  };

  const handleRightSidebarToggle = (val: boolean) => {
    setRightCollapsed(val);
    localStorage.setItem('uw_right_collapsed', String(val));
    localStorage.setItem('uw_manual_right_collapsed', String(val));
    window.dispatchEvent(new Event('storage'));
  };

  // ХОТКЕЙ ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileOpen(false);
        setIsSettingsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ЗАКРЫТИЕ ПРИ КЛИКЕ СНАРУЖИ
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Чекбоксы сайдбаров заблокированы ТОЛЬКО если включен ПОЛНЫЙ режим чтения
  const isSidebarControlsDisabled = readingMode && readingModeType === 'full';

  return (
    <>
      <header className="global-header" id="globalHeader">
        <div className="header-inside" id="headerInside">
      <Link href={logoHref} className="header-logo">
        @stare13x<span>.space</span>
      </Link>

          <div className="header-nav">
            <Link href="/" className="header-btn-main">
              Панель ссылок
            </Link>

            {/* ПРОФИЛЬ */}
            <div className={`user-profile-menu ${isProfileOpen ? 'active' : ''}`} id="userProfileMenu" ref={profileMenuRef} style={{ position: 'relative' }}>
              <div className="env-badge" onClick={() => setIsProfileOpen(!isProfileOpen)} style={{ cursor: 'pointer' }}>
                <i className="bi bi-person-circle"></i> {userName}
              </div>

              {isProfileOpen && (
                <div className="dropdown-wrapper" style={{ display: 'block', position: 'absolute', right: 0, top: '100%', zIndex: 99999 }}>
                  <div className="dropdown-menu" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '6px', minWidth: '200px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', marginBottom: '6px' }}>
                      <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>{userName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{userRole}</div>
                    </div>

                    <button
                      onClick={() => {
                        setIsSettingsModalOpen(true);
                        setIsProfileOpen(false);
                      }}
                      className="dropdown-item-menu"
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        color: '#334155',
                        fontWeight: 600,
                        cursor: 'pointer',
                        borderRadius: '6px',
                      }}
                    >
                      <i className="bi bi-sliders" style={{ color: '#64748b' }}></i>
                      Настройки
                    </button>

                    {userRole === 'admin' && onToggleEditMode && (
                      <button
                        onClick={() => {
                          onToggleEditMode();
                          setIsProfileOpen(false);
                        }}
                        className="dropdown-item-menu"
                        disabled={isEditDisabled}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          color: isEditDisabled ? '#94a3b8' : isEditMode ? '#0284c7' : '#334155',
                          fontWeight: 600,
                          cursor: isEditDisabled ? 'not-allowed' : 'pointer',
                          borderRadius: '6px',
                          opacity: isEditDisabled ? 0.6 : 1,
                        }}
                      >
                        <i
                          className={`bi ${isEditDisabled ? 'bi-lock-fill' : isEditMode ? 'bi-pencil-fill' : 'bi-pencil'}`}
                          style={{ color: isEditDisabled ? '#64748b' : isEditMode ? '#0284c7' : '#94a3b8' }}
                        ></i>
                        {isEditDisabled ? 'Редактор недоступен' : isEditMode ? 'Выйти из редактора' : 'Режим редактирования'}
                      </button>
                    )}

                    <a href="/login?logout=1" className="dropdown-item-menu dropdown-item-logout" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '13px', color: '#ef4444', textDecoration: 'none' }}>
                      <i className="bi bi-box-arrow-right"></i> Выйти
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* МОДАЛКА НАСТРОЕК */}
      {isSettingsModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsSettingsModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              width: '100%',
              maxWidth: '480px',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 30px 60px -12px rgba(15, 23, 42, 0.25)',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '44px', height: '44px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  <i className="bi bi-sliders"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Параметры</h3>
                  <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>Настройка поведения и вида</span>
                </div>
              </div>

              <button
                onClick={() => setIsSettingsModalOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* НАСТРОЙКА 1: СТАТУС БД */}
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Индикатор источника (БД)</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Формат отображения статуса загрузки</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#e2e8f0', padding: '3px', borderRadius: '10px' }}>
                  <button
                    onClick={() => updateSetting('uw_db_status_view', 'full', setDbStatusView)}
                    style={{
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: dbStatusView === 'full' ? '#ffffff' : 'transparent',
                      color: dbStatusView === 'full' ? '#0f172a' : '#64748b',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Полно (шапка)
                  </button>
                  <button
                    onClick={() => updateSetting('uw_db_status_view', 'simple', setDbStatusView)}
                    style={{
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: dbStatusView === 'simple' ? '#ffffff' : 'transparent',
                      color: dbStatusView === 'simple' ? '#0f172a' : '#64748b',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Упрощенно (иконка)
                  </button>
                </div>
              </div>

              {/* НАСТРОЙКА 2: РЕЖИМ ЧТЕНИЯ */}
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Режим чтения</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Оптимизация чтения контента</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={readingMode}
                    onChange={(e) => handleReadingModeToggle(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#0f172a', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#e2e8f0', padding: '3px', borderRadius: '10px', opacity: readingMode ? 1 : 0.5, pointerEvents: readingMode ? 'auto' : 'none' }}>
                  <button
                    onClick={() => handleReadingModeTypeChange('full')}
                    style={{
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: readingModeType === 'full' ? '#ffffff' : 'transparent',
                      color: readingModeType === 'full' ? '#0f172a' : '#64748b',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Полный (без панелей)
                  </button>
                  <button
                    onClick={() => handleReadingModeTypeChange('partial')}
                    style={{
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: readingModeType === 'partial' ? '#ffffff' : 'transparent',
                      color: readingModeType === 'partial' ? '#0f172a' : '#64748b',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Частичный
                  </button>
                </div>
              </div>

              {/* НАСТРОЙКИ 3 И 4: ОТДЕЛЬНЫЕ КНОПКИ САЙДБАРОВ */}
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: isSidebarControlsDisabled ? 'not-allowed' : 'pointer', opacity: isSidebarControlsDisabled ? 0.5 : 1 }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Скрывать левый сайдбар</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Меню навигации по урокам</div>
                </div>
                <input
                  type="checkbox"
                  disabled={isSidebarControlsDisabled}
                  checked={leftCollapsed}
                  onChange={(e) => handleLeftSidebarToggle(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#0f172a', cursor: isSidebarControlsDisabled ? 'not-allowed' : 'pointer' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: isSidebarControlsDisabled ? 'not-allowed' : 'pointer', opacity: isSidebarControlsDisabled ? 0.5 : 1 }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Скрывать правый сайдбар</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Оглавление заголовков страницы</div>
                </div>
                <input
                  type="checkbox"
                  disabled={isSidebarControlsDisabled}
                  checked={rightCollapsed}
                  onChange={(e) => handleRightSidebarToggle(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#0f172a', cursor: isSidebarControlsDisabled ? 'not-allowed' : 'pointer' }}
                />
              </label>

              {/* НАСТРОЙКА 5: СБРОС ПРОКРУТКИ */}
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#f8fafc', borderRadius: '16px', cursor: 'pointer', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Сброс прокрутки</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Открывать новые страницы с самого верха</div>
                </div>
                <input
                  type="checkbox"
                  checked={resetScrollOnNav}
                  onChange={() => updateSetting('uw_reset_scroll', !resetScrollOnNav, setResetScrollOnNav)}
                  style={{ width: '18px', height: '18px', accentColor: '#0f172a', cursor: 'pointer' }}
                />
              </label>

              {/* НАСТРОЙКА 6: УВЕЛИЧЕННЫЙ ШРИФТ */}
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#f8fafc', borderRadius: '16px', cursor: 'pointer', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Увеличенный шрифт</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Увеличить размер шрифта контента</div>
                </div>
                <input
                  type="checkbox"
                  checked={isLargeFont}
                  onChange={() => updateSetting('uw_large_font', !isLargeFont, setIsLargeFont)}
                  style={{ width: '18px', height: '18px', accentColor: '#0f172a', cursor: 'pointer' }}
                />
              </label>

              {/* НАСТРОЙКА 7: ПЛАВНЫЙ СКРОЛЛ */}
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#f8fafc', borderRadius: '16px', cursor: 'pointer', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Плавный скролл</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Анимация навигации по заголовкам</div>
                </div>
                <input
                  type="checkbox"
                  checked={smoothScroll}
                  onChange={() => updateSetting('uw_smooth_scroll', !smoothScroll, setSmoothScroll)}
                  style={{ width: '18px', height: '18px', accentColor: '#0f172a', cursor: 'pointer' }}
                />
              </label>
            </div>

            <button
              onClick={() => setIsSettingsModalOpen(false)}
              style={{
                width: '100%',
                marginTop: '24px',
                padding: '14px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Сохранить
            </button>
          </div>
        </div>
      )}
    </>
  );
}