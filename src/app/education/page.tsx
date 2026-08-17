'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import HeaderSearch from '@/components/HeaderSearch';
import styles from './styles.module.css';

interface LessonConfig {
  title: string;
  icon: string;
  badge?: string;
  noSidebar?: boolean; // 👈 Теперь просто ставим true там, где правый сайдбар не нужен
}

const SECTIONS_CONFIG: Record<string, { title: string; groups: Record<string, { title: string; icon: string; lessons: Record<string, LessonConfig> }> }> = {
  doc: {
    title: 'Обучение',
    groups: {
      theory_base: {
        title: 'Вступление',
        icon: 'journal-bookmark-fill',
        lessons: {
          welcome: { title: 'Добро пожаловать', icon: 'hand-index-thumb', noSidebar: true },
          about_platform: { title: 'О платформе', icon: 'rocket-takeoff-fill', noSidebar: true },
        },
      },
      advanced_theory: {
        title: 'Теория',
        icon: 'stars',
        lessons: {
          marketing: { title: 'Интернет маркетинг', icon: 'megaphone' },
          cms: { title: 'Сайты и CMS', icon: 'window-stack' },
          executor: { title: 'Варианты исполнителей', icon: 'people' },
          glossary: { title: 'Термины', icon: 'bookmark-star' },
          lpr_lvpr_secretar: { title: 'ЛПР/ЛВПР, секретарь', icon: 'person-badge' },
          need: { title: 'Выявление потребности', icon: 'question-circle' },
        },
      },
      marketing_group: {
        title: 'Услуги',
        icon: 'graph-up',
        lessons: {
          seo: { title: 'SEO', icon: 'search' },
          kontext: { title: 'Контекст', icon: 'bullseye' },
          support: { title: 'Тех.поддержка', icon: 'headset' },
          develop: { title: 'Разработка', icon: 'code-slash' },
        },
      },
    },
  },
  practice: {
    title: 'Работа',
    groups: {
      script_group: {
        title: 'Скрипты',
        icon: 'check2-square',
        lessons: {
          call_structure: { title: 'Структура звонка', icon: 'diagram-3', noSidebar: true },
          script_other: { title: 'Важное про скрипт', icon: 'journal-text' },
          script: { title: 'Скрипт', icon: 'file-earmark-text', noSidebar: true },
          script_app: { title: 'Приложение к скрипту', icon: 'journal-plus' },
        },
      },
      lead_requirements_group: {
        title: 'Работа с лидами',
        icon: 'funnel',
        lessons: {
          lead_requirements: { title: 'Требования к лидам', icon: 'file-earmark-check' },
          fill_leads: { title: 'Работа в CRM', icon: 'kanban', badge: '12.08.2026' },
        },
      },
      info_group: {
        title: 'Информация',
        icon: 'info-circle',
        lessons: {
          competitors: { title: 'Конкуренты', icon: 'people' },
          call_examples: { title: 'Примеры звонков', icon: 'telephone-outbound', badge: 'В разработке', noSidebar: true },
        },
      },
      price_group: {
        title: 'Цены и тарифы',
        icon: 'wallet2',
        lessons: {
          price: { title: 'Тарифы', icon: 'calculator', noSidebar: true },
        },
      },
      motivation_group: {
        title: 'Мотивация',
        icon: 'trophy',
        lessons: {
          motivation: { title: 'Система мотивации', icon: 'award' },
        },
      },
    },
  },
  statements_uniofweb: {
    title: 'Остальное',
    groups: {
      legal_info: {
        title: 'Что еще?',
        icon: 'info-circle',
        lessons: {
          other: { title: 'Остальные вопросы', icon: 'patch-question', noSidebar: true },
          docs: { title: 'Заявления, документы', icon: 'file-earmark-text', noSidebar: true },
          tilda_work: { title: 'Работа с Тильдой', icon: 'layers', noSidebar: true },
          leads_table: { title: 'Таблица с заявками', icon: 'table', noSidebar: true }, 
        },
      },
    },
  },
};

interface LessonSection {
  id?: string;
  db_id?: string;
  section_id?: string;
  title: string;
  text: string;
}

function EducationPortalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = searchParams.get('tab') || 'doc';
  const currentLesson = searchParams.get('lesson') || 'seo';

  // 🎯 Получаем конфигурацию текущего урока прямо из SECTIONS_CONFIG
  const currentLessonConfig = useMemo(() => {
    const tabConfig = SECTIONS_CONFIG[activeTab];
    if (!tabConfig) return null;
    for (const group of Object.values(tabConfig.groups)) {
      if (group.lessons[currentLesson]) {
        return group.lessons[currentLesson];
      }
    }
    return null;
  }, [activeTab, currentLesson]);

  const isNoRightSidebar = Boolean(currentLessonConfig?.noSidebar);

  const [lessonMeta, setLessonMeta] = useState<{ title: string; intro?: string }>({ title: 'Загрузка...' });
  const [sections, setSections] = useState<LessonSection[]>([]);
  const [loadedFromFile, setLoadedFromFile] = useState<boolean>(false);
  const [fileHtmlContent, setFileHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const [currentUser, setCurrentUser] = useState<{
    firstName?: string | null;
    lastName?: string | null;
    email?: string;
    role?: string;
  } | null>(null);

  const [anchors, setAnchors] = useState<{ id: string; title: string; isSub?: boolean; index: number }[]>([]);
  const [activeAnchorId, setActiveAnchorId] = useState<string>('');

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);
  
  const [activeLightboxSrc, setActiveLightboxSrc] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const [dbStatusView, setDbStatusView] = useState<'full' | 'simple'>('full');
  const [resetScrollOnNav, setResetScrollOnNav] = useState<boolean>(false);

  const pageScrollPositions = useRef<Record<string, number>>({});
  const sidebarLeftRef = useRef<HTMLDivElement>(null);
  const sidebarRightRef = useRef<HTMLElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  
  const isScrollingToAnchor = useRef<boolean>(false);
  const scrollSpyTimeout = useRef<NodeJS.Timeout | null>(null);

  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'info' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3500);
    return () => clearTimeout(timer);
  }, [toast.show]);

  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.authenticated && data.user) setCurrentUser(data.user);
      })
      .catch((e) => console.error('Ошибка профиля:', e));
  }, []);

  useEffect(() => {
    const rm = localStorage.getItem('uw_reading_mode') === 'true';
    const rmType = (localStorage.getItem('uw_reading_mode_type') as 'full' | 'partial') || 'full';
    setDbStatusView((localStorage.getItem('uw_db_status_view') as 'full' | 'simple') || 'full');
    setResetScrollOnNav(localStorage.getItem('uw_reset_scroll') === 'true');

    if (rm && rmType === 'full') {
      setLeftCollapsed(true);
      setRightCollapsed(true);
    } else {
      setLeftCollapsed(localStorage.getItem('uw_left_collapsed') === 'true');
      setRightCollapsed(localStorage.getItem('uw_right_collapsed') === 'true');
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    const targetPos = resetScrollOnNav ? 0 : (pageScrollPositions.current[currentLesson] || 0);
    const rafId = requestAnimationFrame(() => {
      setTimeout(() => window.scrollTo({ top: targetPos, behavior: 'instant' as ScrollBehavior }), 30);
    });
    return () => cancelAnimationFrame(rafId);
  }, [currentLesson, loading, resetScrollOnNav]);

  const handleSelectLesson = (lessonKey: string, tabKey?: string) => {
    if (!resetScrollOnNav && currentLesson) {
      pageScrollPositions.current[currentLesson] = Math.max(0, window.scrollY);
    }
    setIsSettingsOpen(false);
    const newTab = tabKey || activeTab;
    const params = new URLSearchParams({ tab: newTab, lesson: lessonKey });
    localStorage.setItem('uw_active_tab', newTab);
    localStorage.setItem('uw_active_lesson', lessonKey);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (currentLessonConfig?.title) {
      document.title = currentLessonConfig.title;
    } else if (lessonMeta.title && lessonMeta.title !== 'Загрузка...') {
      document.title = lessonMeta.title;
    }
  }, [currentLessonConfig, lessonMeta.title]);

  const scrollToTop = () => {
    const isSmooth = localStorage.getItem('uw_smooth_scroll') !== 'false';
    window.scrollTo({ top: 0, behavior: isSmooth ? 'smooth' : 'auto' });
  };

  const toggleLeft = () => {
    if (contentAreaRef.current) contentAreaRef.current.classList.add(styles.sidebarReRendering);
    const state = !leftCollapsed;
    setLeftCollapsed(state);
    localStorage.setItem('uw_left_collapsed', String(state));
    localStorage.setItem('uw_manual_left_collapsed', String(state));
    setTimeout(() => contentAreaRef.current?.classList.remove(styles.sidebarReRendering), 300);
  };

  const toggleRight = () => {
    if (contentAreaRef.current) contentAreaRef.current.classList.add(styles.sidebarReRendering);
    const state = !rightCollapsed;
    setRightCollapsed(state);
    localStorage.setItem('uw_right_collapsed', String(state));
    localStorage.setItem('uw_manual_right_collapsed', String(state));
    setTimeout(() => contentAreaRef.current?.classList.remove(styles.sidebarReRendering), 300);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/education?lesson=${currentLesson}&tab=${activeTab}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setLessonMeta(data.meta || { title: 'Новая страница', intro: 'Контент еще не заведен.' });
        setSections(data.sections || []);
        setLoadedFromFile(Boolean(data.loadedFromFile));
        setFileHtmlContent(data.fileHtmlContent || '');
        setIsEditMode(false);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentLesson, activeTab]);

  const handleSavePage = async (isImport = false) => {
    setSaving(true);
    try {
      const res = await fetch('/api/education', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonKey: currentLesson,
          tab: activeTab,
          meta: lessonMeta,
          sections: sections,
          isImport: isImport,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(isImport ? 'Файл успешно импортирован в PostgreSQL!' : 'Изменения сохранены!', 'success');
        setIsEditMode(false);
        fetchData();
      } else {
        showToast(`Ошибка сохранения: ${data.error}`, 'error');
      }
    } catch (e: any) {
      showToast(`Ошибка сети: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async () => {
    try {
      const res = await fetch(`/api/education?lesson=${currentLesson}&tab=${activeTab}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Страница удалена из БД! Загружена локальная версия.', 'info');
        setIsDeleteModalOpen(false);
        setIsEditMode(false);
        fetchData();
      } else {
        showToast(`Ошибка удаления: ${data.error}`, 'error');
      }
    } catch (e: any) {
      showToast(`Ошибка сети: ${e.message}`, 'error');
    }
  };

  // 🎯 Единый оптимизированный парсинг оглавления
  useEffect(() => {
    if (loading || isEditMode || isSettingsOpen || isNoRightSidebar) {
      setAnchors([]);
      return;
    }

    const timer = setTimeout(() => {
      const container = contentAreaRef.current;
      if (!container) return;

      const headingSelector = currentLesson === 'motivation' ? 'h2' : 'h2, h3';
      const headings = Array.from(container.querySelectorAll(headingSelector)).filter(
        (h) => !h.classList.contains(styles.eduTitle)
      );

      const list = headings.map((heading, idx) => {
        const text = heading.textContent?.trim() || '';
        const anchorId = heading.getAttribute('id') || `nav-heading-${idx}`;
        heading.setAttribute('id', anchorId);
        return {
          id: anchorId,
          title: text,
          isSub: heading.tagName.toLowerCase() === 'h3',
          index: idx,
        };
      }).filter((item) => item.title !== '');

      setAnchors(list);
      if (list.length > 0 && !activeAnchorId) {
        setActiveAnchorId(list[0].id);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [loading, loadedFromFile, fileHtmlContent, sections, isEditMode, currentLesson, isSettingsOpen, isNoRightSidebar]);

  // 🎯 Единый оптимизированный слушатель Scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowScrollTop(scrollY > 300);
      
      if (!resetScrollOnNav && currentLesson && !loading) {
        pageScrollPositions.current[currentLesson] = Math.max(0, scrollY);
      }

      if (anchors.length === 0 || isSettingsOpen || isNoRightSidebar || isScrollingToAnchor.current) return;

      const container = contentAreaRef.current;
      if (!container) return;

      const headingSelector = currentLesson === 'motivation' ? 'h2' : 'h2, h3';
      const DOMHeadings = Array.from(container.querySelectorAll(headingSelector));
      if (DOMHeadings.length === 0) return;

      const windowHeight = window.innerHeight;
      const scrollPosition = scrollY + windowHeight;
      const totalHeight = document.documentElement.scrollHeight;

      if (totalHeight - scrollPosition <= 20) {
        setActiveAnchorId(anchors[anchors.length - 1].id);
        return;
      }

      let bestIndex = 0;
      for (let i = 0; i < DOMHeadings.length; i++) {
        const rect = DOMHeadings[i].getBoundingClientRect();
        if (rect.top <= 170) {
          bestIndex = i;
        } else {
          break;
        }
      }

      if (anchors[bestIndex]) {
        setActiveAnchorId((prev) => (prev !== anchors[bestIndex].id ? anchors[bestIndex].id : prev));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [anchors, isSettingsOpen, currentLesson, isNoRightSidebar, resetScrollOnNav, loading]);

  const scrollToAnchor = (id: string, index: number) => {
    const container = contentAreaRef.current;
    const headingSelector = currentLesson === 'motivation' ? 'h2' : 'h2, h3';
    const target = document.getElementById(id) || container?.querySelectorAll(headingSelector)[index];
    if (!target) return;

    isScrollingToAnchor.current = true;
    setActiveAnchorId(id);

    const isSmooth = localStorage.getItem('uw_smooth_scroll') !== 'false';
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - 132,
      behavior: isSmooth ? 'smooth' : 'auto',
    });

    if (scrollSpyTimeout.current) clearTimeout(scrollSpyTimeout.current);
    scrollSpyTimeout.current = setTimeout(() => {
      isScrollingToAnchor.current = false;
    }, 800);
  };

  const currentTabConfig = SECTIONS_CONFIG[activeTab] || SECTIONS_CONFIG['doc'];

  const containerClasses = [
    styles.educationPortalContainer,
    leftCollapsed ? styles.leftCollapsed : '',
    (!isNoRightSidebar && rightCollapsed) ? styles.rightCollapsed : '',
    isNoRightSidebar ? styles.noRightSidebar : '',
    isSettingsOpen ? styles.settingsOpen : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <HeaderSearch
        firstName={currentUser?.firstName}
        lastName={currentUser?.lastName}
        email={currentUser?.email}
        userRole={currentUser?.role || 'manager'}
        isEditMode={isEditMode}
        isEditDisabled={loadedFromFile}
        onToggleEditMode={() => loadedFromFile ? showToast('Сначала импортируйте страницу в БД', 'info') : setIsEditMode((p) => !p)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isLeftCollapsed={leftCollapsed}
      />

      <div className={styles.mainWrapper}>
        <div className={styles.navSidebarWrapper}>
          <nav className={styles.navSidebar} id="sidebarLeft" ref={sidebarLeftRef}>
            <div className={styles.tabSwitcher}>
              {Object.entries(SECTIONS_CONFIG).map(([tabId, tabData]) => (
                <button
                  key={tabId}
                  title={tabData.title}
                  onClick={() => {
                    const firstGroup = Object.values(tabData.groups)[0];
                    const firstLessonKey = Object.keys(firstGroup.lessons)[0];
                    handleSelectLesson(firstLessonKey, tabId);
                  }}
                  className={`${styles.tabSwitchBtn} ${activeTab === tabId && !isSettingsOpen ? styles.active : ''}`}
                >
                  <i className={`bi ${tabId === 'doc' ? 'bi-journal-text' : tabId === 'practice' ? 'bi-briefcase' : 'bi-grid-1x2'} ${styles.tabBtnIcon}`}></i>
                  <span className={styles.tabBtnText}>{tabData.title}</span>
                </button>
              ))}
            </div>

            {Object.entries(currentTabConfig.groups).map(([groupKey, group]) => (
              <React.Fragment key={groupKey}>
                <div className={styles.navSidebarTitle}>{group.title}</div>
                <ul className={styles.navList}>
                  {Object.entries(group.lessons).map(([lessonKey, lesson]) => (
                    <li key={lessonKey} className={styles.navItem}>
                    <button
                      onClick={() => handleSelectLesson(lessonKey)}
                      className={`${styles.navLink} ${currentLesson === lessonKey && !isSettingsOpen ? styles.active : ''} ${lesson.badge === 'В разработке' ? styles.devItem : ''}`}
                      data-tooltip={lesson.title}
                    >
                      <i className={`bi bi-${lesson.icon} ${styles.navIconFa}`}></i>
                      <span className={styles.navItemText}>{lesson.title}</span>
                      {lesson.badge && (
                        <div 
                          className={lesson.badge !== 'В разработке' ? styles.newUpdateWrapper : styles.devIconWrapper}
                          data-update-tooltip={lesson.badge !== 'В разработке' ? `Обновлено: ${lesson.badge}` : 'Раздел в разработке'}
                        >
                          <i className={`bi ${lesson.badge !== 'В разработке' ? 'bi-stars' : 'bi-tools'}`}></i>
                        </div>
                      )}
                    </button>
                  </li>
                  ))}
                </ul>
              </React.Fragment>
            ))}
          </nav>

          <button 
            className={styles.sidebarBottomToggleBtn}
            onClick={toggleLeft} 
            title={leftCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            <i className={`bi ${leftCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
          </button>
        </div>

        <main className={styles.contentContainer}>
          <div 
            ref={contentAreaRef} 
            className={`${styles.contentInner} ${loading ? styles.contentLoadingState : ''}`}
          >
            {/* ЭКРАН НАСТРОЕК */}
            <div className={`${styles.settingsModalScreen} ${isSettingsOpen ? styles.active : ''}`}>
              <div className={styles.settingsHeaderRow}>
                <button
                  className={styles.settingsBackBtn}
                  onClick={() => setIsSettingsOpen(false)}
                  title="Вернуться к тексту"
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
                <h1 className={styles.settingsTitleText}>Настройки</h1>
              </div>

              <div className={`${styles.settingsGrid} ${currentUser?.role === 'admin' ? styles.settingsGridAdmin : ''}`}>
                {currentUser?.role === 'admin' && (
                  <div className={styles.settingsCard}>
                    <div className={styles.settingsCardInner}>
                      <div>
                        <div className={styles.settingsCardTitle}>Упрощенный вид источника БД</div>
                        <div className={styles.settingsCardDesc}>Показывать компактный бейдж в шапке вместо большой панели</div>
                      </div>
                      <label className={styles.switchLabel}>
                        <input
                          type="checkbox"
                          className={styles.switchInput}
                          checked={dbStatusView === 'simple'}
                          onChange={(e) => {
                            const newView = e.target.checked ? 'simple' : 'full';
                            setDbStatusView(newView);
                            localStorage.setItem('uw_db_status_view', newView);
                          }}
                        />
                        <span className={`${styles.switchSlider} ${dbStatusView === 'simple' ? styles.active : ''}`} />
                      </label>
                    </div>
                  </div>
                )}

                <div className={styles.settingsCard}>
                  <div className={styles.settingsCardInner}>
                    <div>
                      <div className={styles.settingsCardTitle}>Всегда сбрасывать прокрутку наверх</div>
                      <div className={styles.settingsCardDesc}>ВКЛ — открывать страницу с самого верха. ВЫКЛ — помнить позицию.</div>
                    </div>
                    <label className={styles.switchLabel}>
                      <input
                        type="checkbox"
                        className={styles.switchInput}
                        checked={resetScrollOnNav}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setResetScrollOnNav(val);
                          localStorage.setItem('uw_reset_scroll', String(val));
                        }}
                      />
                      <span className={`${styles.switchSlider} ${resetScrollOnNav ? styles.active : ''}`} />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {!isSettingsOpen && (
              <>
                {currentUser?.role === 'admin' && dbStatusView === 'full' && (
                  <div className={styles.dbStatusBanner}>
                    <div className={styles.dbStatusTextGroup}>
                      <i className={`bi ${loadedFromFile ? 'bi-file-earmark-code' : 'bi-database-check'}`}></i>
                      <span>{loadedFromFile ? `Страница загружена из локального файла (${currentLesson}.html).` : 'Страница загружена из PostgreSQL'}</span>
                    </div>
                    <button
                      onClick={() => loadedFromFile ? handleSavePage(true) : setIsDeleteModalOpen(true)}
                      className={loadedFromFile ? styles.dbSaveBtn : styles.dbDeleteBtn}
                      disabled={saving}
                    >
                      <i className={`bi ${loadedFromFile ? 'bi-database-add' : 'bi-trash'}`}></i>
                      {loadedFromFile ? (saving ? 'Загрузка...' : 'Загрузить в БД') : 'Удалить из БД'}
                    </button>
                  </div>
                )}

                <div className={styles.eduHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div className={styles.eduBreadcrumb}>{SECTIONS_CONFIG[activeTab]?.title || 'Обучение'}</div>
                    {currentUser?.role === 'admin' && dbStatusView === 'simple' && (
                      <button
                        onClick={() => loadedFromFile ? handleSavePage(true) : setIsDeleteModalOpen(true)}
                        className={loadedFromFile ? styles.dbBadgeDraft : styles.dbBadgeDb}
                        disabled={saving}
                      >
                        <i className={`bi ${loadedFromFile ? 'bi-exclamation-circle-fill' : 'bi-check-circle-fill'}`}></i>
                        <span>{loadedFromFile ? 'Черновик' : 'В БД'}</span>
                      </button>
                    )}
                  </div>

                  <div className={styles.eduHeaderMain}>
                    {isEditMode ? (
                      <div style={{ marginBottom: '20px', width: '100%' }}>
                        <input
                          type="text"
                          value={lessonMeta.title}
                          onChange={(e) => setLessonMeta({ ...lessonMeta, title: e.target.value })}
                          style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0 12px 0', width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        />
                        <textarea
                          value={lessonMeta.intro || ''}
                          onChange={(e) => setLessonMeta({ ...lessonMeta, intro: e.target.value })}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                          rows={2}
                        />
                      </div>
                    ) : (
                      <>
                        <h1 className={styles.eduTitle}>{currentLessonConfig?.title || lessonMeta.title}</h1>
                        {lessonMeta.intro && <p className={styles.eduIntro}>{lessonMeta.intro}</p>}
                      </>
                    )}
                  </div>
                </div>

                {loadedFromFile ? (
                  <div id="legacy-file-content" dangerouslySetInnerHTML={{ __html: fileHtmlContent || '' }} />
                ) : (
                  <div className="seo-lecture">
                    {sections.map((sec, idx) => (
                      <div key={idx} style={{ marginBottom: '28px' }}>
                        {sec.title && (
                          <h2 id={`section-${idx}`} style={{ fontSize: '22px', fontWeight: 700, margin: '28px 0 14px 0', textTransform: 'none', borderBottom: 'none' }}>
                            {sec.title}
                          </h2>
                        )}
                        {sec.text && <div dangerouslySetInnerHTML={{ __html: sec.text }} />}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {!isNoRightSidebar && !isSettingsOpen && (
          <div className={styles.rightSidebarWrapper}>
            <aside className={styles.rightSidebar} id="sidebarRight" ref={sidebarRightRef}>
              <div className={styles.rightSidebarTitle}>
                <div className={styles.rstText}>
                  <i className="bi bi-list-nested"></i>
                  <span>На этой странице:</span>
                </div>
                <button 
                  className={styles.inlineToggleBtnRight}
                  onClick={toggleRight} 
                  title={rightCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
                >
                  <i className={`bi ${rightCollapsed ? 'bi-chevron-left' : 'bi-chevron-right'}`}></i>
                </button>
              </div>

              <ul className={styles.anchorList}>
                {anchors.length > 0 && (
                  anchors.map((item, index) => (
                    <li key={`${item.id}-${index}`} className={styles.anchorItem}>
                      <a
                        href={`#${item.id}`}
                        className={`${styles.anchorLink} ${item.isSub ? styles.levelH3 : styles.levelH2} ${activeAnchorId === item.id ? styles.active : ''}`}
                        data-depth={item.isSub ? '3' : '2'}
                        data-tooltip={item.title}
                        onClick={(e) => {
                          e.preventDefault();
                          scrollToAnchor(item.id, index);
                        }}
                      >
                        <span className={styles.anchorText}>{item.title}</span>
                      </a>
                    </li>
                  ))
                )}
              </ul>
            </aside>
          </div>
        )}
      </div>

      <button
        className={`${styles.scrollToTopBtn} ${showScrollTop ? styles.show : ''}`}
        onClick={scrollToTop}
        title="Пролистать наверх"
      >
        <i className="bi bi-arrow-up-short"></i>
      </button>

      {isDeleteModalOpen && (
        <div className={styles.customModalBackdrop}>
          <div className={styles.customModalCard}>
            <div className={styles.cmIconDanger}><i className="bi bi-exclamation-triangle"></i></div>
            <div className={styles.cmTitle}>Удалить страницу?</div>
            <div className={styles.cmDescription}>
              Вы уверены, что хотите удалить страницу <b>"{lessonMeta.title}"</b> из базы данных?
            </div>
            <div className={styles.cmActions}>
              <button className={`${styles.cmBtn} ${styles.cmBtnCancel}`} onClick={() => setIsDeleteModalOpen(false)}>Отмена</button>
              <button className={`${styles.cmBtn} ${styles.cmBtnDanger}`} onClick={handleDeletePage}>Да, удалить</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`${styles.crmToast} ${styles[`crmToast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]}`}>
          <div className={styles.crmToastIcon}>
            <i className={`bi bi-${toast.type === 'success' ? 'check-circle' : toast.type === 'error' ? 'x-circle' : 'info-circle'}`}></i>
          </div>
          <div className={styles.crmToastContent}>
            <div className={styles.crmToastTitle}>{toast.type}</div>
            <div className={styles.crmToastMessage}>{toast.message}</div>
          </div>
          <button className={styles.crmToastClose} onClick={() => setToast((p) => ({ ...p, show: false }))}>
            <i className="bi bi-x"></i>
          </button>
        </div>
      )}
    </div>
  );
}

export default function EducationPortalPage() {
  return (
    <Suspense fallback={null}>
      <EducationPortalContent />
    </Suspense>
  );
}