'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense, memo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import HeaderSearch from '@/components/HeaderSearch';
import styles from './styles.module.css';
import './lessons.css';

interface LessonConfig {
  title: string;
  icon: string;
  badge?: string;
  noSidebar?: boolean;
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

interface PageDataPayload {
  meta: { title: string; intro?: string };
  sections: LessonSection[];
  loadedFromFile: boolean;
  fileHtmlContent: string;
}

// 🎯 Изолированный компонент: не ререндерится при скролле и смене активных якорей
const LessonBody = memo(function LessonBody({
  loadedFromFile,
  fileHtmlContent,
  sections,
}: {
  loadedFromFile: boolean;
  fileHtmlContent: string;
  sections: LessonSection[];
}) {
  if (loadedFromFile) {
    return <div id="legacy-file-content" dangerouslySetInnerHTML={{ __html: fileHtmlContent || '' }} />;
  }

  return (
    <div className="seo-lecture">
      {sections.map((sec, idx) => (
        <div key={sec.id || sec.db_id || sec.section_id || idx} style={{ marginBottom: '28px' }}>
          {sec.title && (
            <h2
              id={`section-${idx}`}
              style={{
                fontSize: '22px',
                fontWeight: 700,
                margin: '28px 0 14px 0',
                textTransform: 'none',
                borderBottom: 'none',
              }}
            >
              {sec.title}
            </h2>
          )}
          {sec.text && <div dangerouslySetInnerHTML={{ __html: sec.text }} />}
        </div>
      ))}
    </div>
  );
});

function EducationPortalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = searchParams.get('tab') || 'doc';
  const currentLesson = searchParams.get('lesson') || 'welcome';

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
  
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [dbStatusView, setDbStatusView] = useState<'full' | 'simple'>('full');
  const [resetScrollOnNav, setResetScrollOnNav] = useState<boolean>(false);

  // Модальное окно предупреждения о разработке
  const [isDevWarningOpen, setIsDevWarningOpen] = useState<boolean>(false);
  const [dontShowAgain3Days, setDontShowAgain3Days] = useState<boolean>(false);

  // Просмотр увеличенных изображений (Lightbox)
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Кэш страниц для мгновенного перехода
  const pageCache = useRef<Map<string, PageDataPayload>>(new Map());
  const currentRequestId = useRef<number>(0);

  const pageScrollPositions = useRef<Record<string, number>>({});
  const sidebarLeftRef = useRef<HTMLDivElement>(null);
  const sidebarRightRef = useRef<HTMLElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  
  const isScrollingToAnchor = useRef<boolean>(false);
  const scrollSpyTimeout = useRef<NodeJS.Timeout | null>(null);
  const scrollRafId = useRef<number | null>(null);

  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'info' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ show: true, message, type });
  }, []);

  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3500);
    return () => clearTimeout(timer);
  }, [toast.show]);

  // При первом заходе: перенаправление на welcome и проверка показа окна разработки
  useEffect(() => {
    const hasVisited = sessionStorage.getItem('uw_session_welcomed');
    if (!hasVisited) {
      sessionStorage.setItem('uw_session_welcomed', 'true');
      const currentTabParam = searchParams.get('tab');
      const currentLessonParam = searchParams.get('lesson');

      if (!currentTabParam || !currentLessonParam) {
        localStorage.setItem('uw_active_tab', 'doc');
        localStorage.setItem('uw_active_lesson', 'welcome');
        router.replace('?tab=doc&lesson=welcome', { scroll: false });
      } else {
        localStorage.setItem('uw_active_tab', currentTabParam);
        localStorage.setItem('uw_active_lesson', currentLessonParam);
      }
    }

    const hideUntil = localStorage.getItem('uw_hide_dev_warning_until');
    if (!hideUntil || Date.now() >= Number(hideUntil)) {
      const sessionShown = sessionStorage.getItem('uw_dev_warning_session_shown');
      if (!sessionShown) {
        setIsDevWarningOpen(true);
      }
    }
  }, [router, searchParams]);

  const handleCloseDevWarning = () => {
    sessionStorage.setItem('uw_dev_warning_session_shown', 'true');
    if (dontShowAgain3Days) {
      const expiresAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
      localStorage.setItem('uw_hide_dev_warning_until', String(expiresAt));
    }
    setIsDevWarningOpen(false);
  };

  // Перехват кликов по изображениям для Lightbox и закрытие на Escape
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const wrapper = target.closest('.img-preview-wrapper, [data-src]') as HTMLElement | null;
      if (wrapper) {
        const src = wrapper.getAttribute('data-src') || wrapper.querySelector('img')?.getAttribute('src');
        if (src) {
          setPreviewImage(src);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewImage(null);
      }
    };

    document.addEventListener('click', handleDocClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleDocClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Блокировка скролла фона при открытом Lightbox
  useEffect(() => {
    if (previewImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [previewImage]);

  useEffect(() => {
    fetch('/api/auth')
      .then((res) => (res.ok ? res.json() : null))
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

  // 🎯 Автоматический скролл правого меню за активным якорем с запасом
  useEffect(() => {
    if (!activeAnchorId || isNoRightSidebar) return;

    const sidebar = sidebarRightRef.current;
    if (!sidebar) return;

    const listContainer = sidebar.querySelector(`.${styles.anchorList}`) as HTMLElement | null;
    const activeElement = sidebar.querySelector(`a[href="#${activeAnchorId}"]`) as HTMLElement | null;

    if (!listContainer || !activeElement) return;

    const containerRect = listContainer.getBoundingClientRect();
    const activeRect = activeElement.getBoundingClientRect();

    const buffer = 120;

    if (activeRect.bottom > containerRect.bottom - buffer) {
      const scrollOffset = activeRect.bottom - (containerRect.bottom - buffer);
      listContainer.scrollBy({ top: scrollOffset, behavior: 'smooth' });
    } else if (activeRect.top < containerRect.top + buffer) {
      const scrollOffset = activeRect.top - (containerRect.top + buffer);
      listContainer.scrollBy({ top: scrollOffset, behavior: 'smooth' });
    }
  }, [activeAnchorId, isNoRightSidebar]);

  useEffect(() => {
    if (loading) return;
    const targetPos = resetScrollOnNav ? 0 : pageScrollPositions.current[currentLesson] || 0;
    window.scrollTo({ top: targetPos, behavior: 'instant' as ScrollBehavior });
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
    if (isNoRightSidebar) return;
    if (contentAreaRef.current) contentAreaRef.current.classList.add(styles.sidebarReRendering);
    const state = !rightCollapsed;
    setRightCollapsed(state);
    localStorage.setItem('uw_right_collapsed', String(state));
    localStorage.setItem('uw_manual_right_collapsed', String(state));
    setTimeout(() => contentAreaRef.current?.classList.remove(styles.sidebarReRendering), 300);
  };

  const prefetchLesson = useCallback(async (lessonKey: string, tabKey: string = activeTab) => {
    const cacheKey = `${tabKey}_${lessonKey}`;
    if (pageCache.current.has(cacheKey)) return;

    try {
      const res = await fetch(`/api/education?lesson=${lessonKey}&tab=${tabKey}`);
      const data = await res.json();
      if (res.ok && data.success) {
        pageCache.current.set(cacheKey, {
          meta: data.meta || { title: 'Новая страница', intro: 'Контент еще не заведен.' },
          sections: data.sections || [],
          loadedFromFile: Boolean(data.loadedFromFile),
          fileHtmlContent: data.fileHtmlContent || '',
        });
      }
    } catch (_) {}
  }, [activeTab]);

  const fetchData = useCallback(async (ignoreCache = false) => {
    const cacheKey = `${activeTab}_${currentLesson}`;
    
    if (!ignoreCache && pageCache.current.has(cacheKey)) {
      const cached = pageCache.current.get(cacheKey)!;
      setLessonMeta(cached.meta);
      setSections(cached.sections);
      setLoadedFromFile(cached.loadedFromFile);
      setFileHtmlContent(cached.fileHtmlContent);
      setIsEditMode(false);
      setLoading(false);
      return;
    }

    const requestId = ++currentRequestId.current;
    setLoading(true);

    try {
      const res = await fetch(`/api/education?lesson=${currentLesson}&tab=${activeTab}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      if (requestId !== currentRequestId.current) return;

      if (data.success) {
        const payload: PageDataPayload = {
          meta: data.meta || { title: 'Новая страница', intro: 'Контент еще не заведен.' },
          sections: data.sections || [],
          loadedFromFile: Boolean(data.loadedFromFile),
          fileHtmlContent: data.fileHtmlContent || '',
        };

        pageCache.current.set(cacheKey, payload);
        setLessonMeta(payload.meta);
        setSections(payload.sections);
        setLoadedFromFile(payload.loadedFromFile);
        setFileHtmlContent(payload.fileHtmlContent);
        setIsEditMode(false);
      }
    } catch (e: any) {
      if (requestId === currentRequestId.current) {
        console.error('Ошибка загрузки данных урока:', e);
      }
    } finally {
      if (requestId === currentRequestId.current) {
        setLoading(false);
      }
    }
  }, [currentLesson, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        pageCache.current.delete(`${activeTab}_${currentLesson}`);
        showToast(isImport ? 'Файл успешно импортирован в PostgreSQL!' : 'Изменения сохранены!', 'success');
        setIsEditMode(false);
        fetchData(true);
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
        pageCache.current.delete(`${activeTab}_${currentLesson}`);
        showToast('Страница удалена из БД! Загружена локальная версия.', 'info');
        setIsDeleteModalOpen(false);
        setIsEditMode(false);
        fetchData(true);
      } else {
        showToast(`Ошибка удаления: ${data.error}`, 'error');
      }
    } catch (e: any) {
      showToast(`Ошибка сети: ${e.message}`, 'error');
    }
  };

  useEffect(() => {
    if (isNoRightSidebar || loading || isEditMode || isSettingsOpen) {
      setAnchors([]);
      setActiveAnchorId('');
      return;
    }

    const timer = setTimeout(() => {
      const container = contentAreaRef.current;
      if (!container) return;

      const headingSelector = currentLesson === 'motivation' ? 'h2' : 'h2, h3';
      const headings = Array.from(container.querySelectorAll(headingSelector)).filter(
        (h) => !h.classList.contains(styles.eduTitle)
      );

      const list = headings
        .map((heading, idx) => {
          const text = heading.textContent?.trim() || '';
          const anchorId = heading.getAttribute('id') || `nav-heading-${idx}`;
          if (!heading.getAttribute('id')) {
            heading.setAttribute('id', anchorId);
          }
          return {
            id: anchorId,
            title: text,
            isSub: heading.tagName.toLowerCase() === 'h3',
            index: idx,
          };
        })
        .filter((item) => item.title !== '');

      setAnchors(list);
      if (list.length > 0) {
        setActiveAnchorId((prev) => (prev ? prev : list[0].id));
      }
    }, 20);

    return () => clearTimeout(timer);
  }, [loading, loadedFromFile, fileHtmlContent, sections, isEditMode, currentLesson, isSettingsOpen, isNoRightSidebar]);

  useEffect(() => {
    const handleAccordionToggle = function (header: HTMLElement, forceOpen?: boolean) {
      if (!header) return;

      const accordion = header.closest('.v33-accordion') || header.parentElement;
      if (!accordion) return;

      const body = (accordion.querySelector('.v33-content-wrapper') || header.nextElementSibling) as HTMLElement | null;
      if (!body) return;

      const arrow = accordion.querySelector('.v33-arrow, .acc-arrow') as HTMLElement | SVGElement | null;
      const badge = accordion.querySelector('.acc-badge') as HTMLElement | null;
      const isOpen = accordion.classList.contains('open') || body.classList.contains('is-open');

      if (isOpen && !forceOpen) {
        accordion.classList.remove('open');
        body.classList.remove('is-open');
        body.style.maxHeight = `${body.scrollHeight}px`;
        void body.offsetHeight;
        body.style.maxHeight = '0px';
        body.style.opacity = '0';

        if (arrow) arrow.style.transform = 'rotate(0deg)';
        if (badge) {
          badge.style.background = '#f1f5f9';
          badge.style.color = '#64748b';
        }
      } else {
        accordion.classList.add('open');
        body.classList.add('is-open');
        body.style.maxHeight = `${body.scrollHeight}px`;      
        body.style.opacity = '1';

        if (arrow) arrow.style.transform = 'rotate(180deg)';
        if (badge) {
          badge.style.background = '#e0f2fe';
          badge.style.color = '#0284c7';
        }

        setTimeout(() => {
          if (accordion.classList.contains('open')) {
            body.style.maxHeight = 'none';
          }
        }, 1100);
      }
    };

    (window as any).toggleSmoothAccordion = handleAccordionToggle;
    (window as any).toggleAccordion = handleAccordionToggle;

    (window as any).openAndHighlightFaq = function (id: string) {
      const card = document.getElementById(id);
      if (!card) return;

      const header = (card.querySelector('.v33-summary, div[onclick]') || card.firstElementChild) as HTMLElement | null;
      if (header && (window as any).toggleSmoothAccordion) {
        (window as any).toggleSmoothAccordion(header, true);
      }

      card.style.borderColor = '#38bdf8';
      card.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.25)';

      const headerOffset = 132;
      const elementTop = card.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementTop - headerOffset,
        behavior: 'smooth',
      });

      setTimeout(() => {
        card.style.borderColor = '#e2e8f0';
        card.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.02)';
      }, 2000);
    };

    return () => {
      delete (window as any).toggleSmoothAccordion;
      delete (window as any).toggleAccordion;
      delete (window as any).openAndHighlightFaq;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRafId.current !== null) return;

      scrollRafId.current = requestAnimationFrame(() => {
        scrollRafId.current = null;
        const scrollY = window.scrollY;

        setShowScrollTop((prev) => {
          const shouldShow = scrollY > 300;
          return prev !== shouldShow ? shouldShow : prev;
        });

        if (!resetScrollOnNav && currentLesson && !loading) {
          pageScrollPositions.current[currentLesson] = Math.max(0, scrollY);
        }

        if (isNoRightSidebar || anchors.length === 0 || isSettingsOpen || isScrollingToAnchor.current) {
          return;
        }

        const container = contentAreaRef.current;
        if (!container) return;

        const headingSelector = currentLesson === 'motivation' ? 'h2' : 'h2, h3';
        const DOMHeadings = container.querySelectorAll(headingSelector);
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
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollRafId.current !== null) {
        cancelAnimationFrame(scrollRafId.current);
      }
    };
  }, [anchors, isSettingsOpen, currentLesson, isNoRightSidebar, resetScrollOnNav, loading]);

  const scrollToAnchor = (id: string, index: number) => {
    if (isNoRightSidebar) return;
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

  const { prevLesson, nextLesson } = useMemo(() => {
    const currentTab = SECTIONS_CONFIG[activeTab] || SECTIONS_CONFIG['doc'];
    const flatLessons: { key: string; title: string }[] = [];

    Object.values(currentTab.groups).forEach((group) => {
      Object.entries(group.lessons).forEach(([key, lesson]) => {
        flatLessons.push({ key, title: lesson.title });
      });
    });

    const currentIndex = flatLessons.findIndex((item) => item.key === currentLesson);

    return {
      prevLesson: currentIndex > 0 ? flatLessons[currentIndex - 1] : null,
      nextLesson: currentIndex >= 0 && currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null,
    };
  }, [activeTab, currentLesson]);

  const containerClasses = [
    styles.educationPortalContainer,
    leftCollapsed ? styles.leftCollapsed : '',
    !isNoRightSidebar && rightCollapsed ? styles.rightCollapsed : '',
    isNoRightSidebar ? styles.noRightSidebar : '',
    isSettingsOpen ? styles.settingsOpen : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      <HeaderSearch
        firstName={currentUser?.firstName}
        lastName={currentUser?.lastName}
        email={currentUser?.email}
        userRole={currentUser?.role || 'manager'}
        isEditMode={isEditMode}
        isEditDisabled={loadedFromFile}
        onToggleEditMode={() =>
          loadedFromFile ? showToast('Сначала импортируйте страницу в БД', 'info') : setIsEditMode((p) => !p)
        }
        onOpenSettings={() => setIsSettingsOpen(true)}
        isLeftCollapsed={leftCollapsed}
      />

      <div className={styles.mainWrapper}>
        <div className={styles.navSidebarWrapper}>
          <nav className={styles.navSidebar} id="sidebarLeft" ref={sidebarLeftRef}>
            <div className={styles.tabSwitcher}>
              {Object.entries(SECTIONS_CONFIG).map(([tabId, tabData]) => {
                const firstGroup = Object.values(tabData.groups)[0];
                const firstLessonKey = Object.keys(firstGroup.lessons)[0];
                return (
                  <button
                    key={tabId}
                    title={tabData.title}
                    onClick={() => handleSelectLesson(firstLessonKey, tabId)}
                    onMouseEnter={() => prefetchLesson(firstLessonKey, tabId)}
                    className={`${styles.tabSwitchBtn} ${activeTab === tabId && !isSettingsOpen ? styles.active : ''}`}
                  >
                    <i
                      className={`bi ${
                        tabId === 'doc' ? 'bi-journal-text' : tabId === 'practice' ? 'bi-briefcase' : 'bi-grid-1x2'
                      } ${styles.tabBtnIcon}`}
                    ></i>
                    <span className={styles.tabBtnText}>{tabData.title}</span>
                  </button>
                );
              })}
            </div>

            {Object.entries(currentTabConfig.groups).map(([groupKey, group]) => (
              <React.Fragment key={groupKey}>
                <div className={styles.navSidebarTitle}>{group.title}</div>
                <ul className={styles.navList}>
                  {Object.entries(group.lessons).map(([lessonKey, lesson]) => (
                    <li key={lessonKey} className={styles.navItem}>
                      <button
                        onClick={() => handleSelectLesson(lessonKey)}
                        onMouseEnter={() => prefetchLesson(lessonKey, activeTab)}
                        className={`${styles.navLink} ${
                          currentLesson === lessonKey && !isSettingsOpen ? styles.active : ''
                        } ${lesson.badge === 'В разработке' ? styles.devItem : ''}`}
                        data-tooltip={lesson.title}
                      >
                        <i className={`bi bi-${lesson.icon} ${styles.navIconFa}`}></i>
                        <span className={styles.navItemText}>{lesson.title}</span>
                        {lesson.badge && (
                          <div
                            className={lesson.badge !== 'В разработке' ? styles.newUpdateWrapper : styles.devIconWrapper}
                            data-update-tooltip={
                              lesson.badge !== 'В разработке' ? `Обновлено: ${lesson.badge}` : 'Раздел в разработке'
                            }
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
          <div ref={contentAreaRef} className={styles.contentInner}>
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
                {loading ? (
                  <div className={styles.spinnerWrapper}>
                    <div className={styles.spinnerCircle} />
                    <span className={styles.spinnerText}>Загрузка страницы...</span>
                  </div>
                ) : (
                  <div className={styles.fadeInLoaded}>
                    {currentUser?.role === 'admin' && dbStatusView === 'full' && (
                      <div className={styles.dbStatusBanner}>
                        <div className={styles.dbStatusTextGroup}>
                          <i className={`bi ${loadedFromFile ? 'bi-file-earmark-code' : 'bi-database-check'}`}></i>
                          <span>
                            {loadedFromFile
                              ? `Страница загружена из локального файла (${currentLesson}.html).`
                              : 'Страница загружена из PostgreSQL'}
                          </span>
                        </div>
                        <button
                          onClick={() => (loadedFromFile ? handleSavePage(true) : setIsDeleteModalOpen(true))}
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
                            onClick={() => (loadedFromFile ? handleSavePage(true) : setIsDeleteModalOpen(true))}
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
                              style={{
                                fontSize: '20px',
                                fontWeight: 700,
                                margin: '6px 0 12px 0',
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                              }}
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

                    {/* Рендер тела урока */}
                    <LessonBody
                      loadedFromFile={loadedFromFile}
                      fileHtmlContent={fileHtmlContent}
                      sections={sections}
                    />

                    {/* Навигация вперед/назад */}
                    <div className={styles.eduNextPrevPanel}>
                      <div className={styles.enppContainer}>
                        {prevLesson ? (
                          <button 
                            className={`${styles.enppBtn} ${styles.enppBtnPrev}`} 
                            onClick={() => handleSelectLesson(prevLesson.key)}
                            onMouseEnter={() => prefetchLesson(prevLesson.key, activeTab)}
                          >
                            <i className="bi bi-arrow-left"></i>
                            <div className={styles.enppBtnText}>
                              <span>Предыдущая страница</span>
                              <div className={styles.enppBtnTitle}>{prevLesson.title}</div>
                            </div>
                          </button>
                        ) : (
                          <div style={{ flex: 1 }} />
                        )}

                        {nextLesson ? (
                          <button 
                            className={`${styles.enppBtn} ${styles.enppBtnNext}`} 
                            onClick={() => handleSelectLesson(nextLesson.key)}
                            onMouseEnter={() => prefetchLesson(nextLesson.key, activeTab)}
                          >
                            <div className={styles.enppBtnText}>
                              <span>Следующая страница</span>
                              <div className={styles.enppBtnTitle}>{nextLesson.title}</div>
                            </div>
                            <i className="bi bi-arrow-right"></i>
                          </button>
                        ) : (
                          <div style={{ flex: 1 }} />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {!isNoRightSidebar && !isSettingsOpen && !loading && (
          <div className={styles.rightSidebarWrapper}>
            <button
              className={styles.sidebarRightToggleBtn}
              onClick={toggleRight}
              title={rightCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
            >
              <i className={`bi ${rightCollapsed ? 'bi-chevron-left' : 'bi-chevron-right'}`}></i>
            </button>

            <aside className={styles.rightSidebar} id="sidebarRight" ref={sidebarRightRef}>
              <div className={styles.rightSidebarTitle}>
                <div className={styles.rstText}>
                  <i className="bi bi-list-nested"></i>
                  <span>На этой странице:</span>
                </div>
              </div>

              <ul className={styles.anchorList}>
                {anchors.length > 0 &&
                  anchors.map((item, index) => (
                    <li key={`${item.id}-${index}`} className={styles.anchorItem}>
                      <a
                        href={`#${item.id}`}
                        className={`${styles.anchorLink} ${item.isSub ? styles.levelH3 : styles.levelH2} ${
                          activeAnchorId === item.id ? styles.active : ''
                        }`}
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
                  ))}
              </ul>
            </aside>
          </div>
        )}
      </div>

      <button className={`${styles.scrollToTopBtn} ${showScrollTop ? styles.show : ''}`} onClick={scrollToTop} title="Пролистать наверх">
        <i className="bi bi-arrow-up-short"></i>
      </button>

      {/* Модальное окно подтверждения удаления */}
      {isDeleteModalOpen && (
        <div className={styles.customModalBackdrop}>
          <div className={styles.customModalCard}>
            <div className={styles.cmIconDanger}>
              <i className="bi bi-exclamation-triangle"></i>
            </div>
            <div className={styles.cmTitle}>Удалить страницу?</div>
            <div className={styles.cmDescription}>
              Вы уверены, что хотите удалить страницу &laquo;{lessonMeta.title}&raquo; из базы данных?
            </div>
            <div className={styles.cmActions}>
              <button className={`${styles.cmBtn} ${styles.cmBtnCancel}`} onClick={() => setIsDeleteModalOpen(false)}>
                Отмена
              </button>
              <button className={`${styles.cmBtn} ${styles.cmBtnDanger}`} onClick={handleDeletePage}>
                Да, удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно: Предупреждение о стадии разработки */}
      {isDevWarningOpen && (
        <div className={styles.customModalBackdrop}>
          <div className={`${styles.customModalCard} ${styles.devModalCardWide}`}>
            <button 
              className={styles.modalCloseIconBtn} 
              onClick={handleCloseDevWarning} 
              title="Закрыть"
              aria-label="Закрыть"
            >
              <i className="bi bi-x"></i>
            </button>

            <div className={styles.devModalIconWrapper}>
              <i className="bi bi-tools"></i>
            </div>

            <div className={styles.cmTitle}>Важно: платформа в разработке</div>

            <div className={styles.cmDescription} style={{ textAlign: 'left', lineHeight: 1.6, marginBottom: '20px' }}>
              Важно: платформа находится на стадии разработки. Присутствуют не точности, часть функционала может работать некорректно. Ваша задача - пользоваться платформой, читать материал, тыкать на кнопки, которые можно тыкать и при возникновении проблем, опечаток, не работающих штук - сообщать об этом мне.
            </div>

            <button className={styles.devModalPrimaryBtn} onClick={handleCloseDevWarning}>
              Понятно
            </button>

            <div className={styles.devModalCheckboxRowRight}>
              <label className={styles.devModalCheckboxLabel}>
                <input
                  type="checkbox"
                  checked={dontShowAgain3Days}
                  onChange={(e) => setDontShowAgain3Days(e.target.checked)}
                  className={styles.devModalCheckbox}
                />
                <span>Не показывать больше (3 дня)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Премиальный Lightbox просмотр фото */}
      {previewImage && (
        <div 
          className={styles.lightboxBackdrop} 
          onClick={() => setPreviewImage(null)}
        >
          <button 
            className={styles.lightboxCloseBtn} 
            onClick={(e) => {
              e.stopPropagation();
              setPreviewImage(null);
            }}
            title="Закрыть (Esc)"
            aria-label="Закрыть"
          >
            <i className="bi bi-x"></i>
          </button>
          <div 
            className={styles.lightboxContentWrapper} 
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={previewImage} 
              alt="Увеличенное изображение" 
              className={styles.lightboxImage} 
            />
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