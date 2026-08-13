'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import HeaderSearch from '@/components/HeaderSearch';
import styles from './styles.module.css';

const SECTIONS_CONFIG: Record<string, { title: string; groups: Record<string, { title: string; icon: string; lessons: Record<string, { title: string; icon: string; badge?: string }> }> }> = {
  doc: {
    title: 'Обучение',
    groups: {
      theory_base: {
        title: 'Вступление',
        icon: 'journal-bookmark-fill',
        lessons: {
          welcome: { title: 'Добро пожаловать', icon: 'hand-index-thumb' },
          about_platform: { title: 'О платформе', icon: 'rocket-takeoff-fill' }, // <-- Добавленный пункт
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
          call_structure: { title: 'Структура звонка', icon: 'diagram-3' },
          script_other: { title: 'Важное про скрипт', icon: 'journal-text' },
          script: { title: 'Скрипт', icon: 'file-earmark-text' },
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
          call_examples: { title: 'Примеры звонков', icon: 'telephone-outbound', badge: 'В разработке' },
        },
      },
      price_group: {
        title: 'Цены и тарифы',
        icon: 'wallet2',
        lessons: {
          price: { title: 'Тарифы', icon: 'calculator' },
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
          other: { title: 'Остальные вопросы', icon: 'patch-question' },
          docs: { title: 'Заявления, документы', icon: 'file-earmark-text' },
          tilda_work: { title: 'Работа с Тильдой', icon: 'layers' },
          leads_table: { title: 'Таблица с заявками', icon: 'table' }, 
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

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const lessonFromUrl = searchParams.get('lesson');

    const savedTab = localStorage.getItem('uw_active_tab');
    const savedLesson = localStorage.getItem('uw_active_lesson');

    let needRedirect = false;
    const params = new URLSearchParams(searchParams.toString());

    if (!tabFromUrl && savedTab) {
      params.set('tab', savedTab);
      needRedirect = true;
    }

    if (!lessonFromUrl && savedLesson) {
      params.set('lesson', savedLesson);
      needRedirect = true;
    }

    if (needRedirect) {
      router.replace(`?${params.toString()}`);
    }
  }, []);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const lessonFromUrl = searchParams.get('lesson');

    if (tabFromUrl) localStorage.setItem('uw_active_tab', tabFromUrl);
    if (lessonFromUrl) localStorage.setItem('uw_active_lesson', lessonFromUrl);
  }, [searchParams]);

  const activeLessonConfigTitle = useMemo(() => {
    const tabConfig = SECTIONS_CONFIG[activeTab];
    if (!tabConfig) return null;
    for (const group of Object.values(tabConfig.groups)) {
      if (group.lessons[currentLesson]) {
        return group.lessons[currentLesson].title;
      }
    }
    return null;
  }, [activeTab, currentLesson]);

  const [lessonMeta, setLessonMeta] = useState<{ title: string; intro?: string }>({ title: 'Загрузка...' });
  const [sections, setSections] = useState<LessonSection[]>([]);
  const [loadedFromFile, setLoadedFromFile] = useState<boolean>(false);
  const [fileHtmlContent, setFileHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

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
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  useEffect(() => {
    const applyStorageSettings = () => {
      const rm = localStorage.getItem('uw_reading_mode') === 'true';
      const rmType = (localStorage.getItem('uw_reading_mode_type') as 'full' | 'partial') || 'full';
      setDbStatusView((localStorage.getItem('uw_db_status_view') as 'full' | 'simple') || 'full');
      setResetScrollOnNav(localStorage.getItem('uw_reset_scroll') === 'true');

      if (rm && rmType === 'full') {
        setLeftCollapsed(true);
        setRightCollapsed(true);
      } else {
        const left = localStorage.getItem('uw_left_collapsed') === 'true';
        const right = localStorage.getItem('uw_right_collapsed') === 'true';
        setLeftCollapsed(left);
        setRightCollapsed(right);
      }
    };

    applyStorageSettings();
  }, []);

  useEffect(() => {
    (window as any).toggleAccordion = function (header: HTMLElement, forceOpen?: boolean) {
      if (!header) return;
      const body = header.nextElementSibling as HTMLElement;
      if (!body) return;

      const arrow = header.querySelector('.acc-arrow') as HTMLElement;
      const badge = header.querySelector('.acc-badge') as HTMLElement;
      const inner = body.querySelector('.spoiler-inner') as HTMLElement;

      if (!inner) return;

      body.style.transitionDuration = '0.8s';
      const isCurrentlyOpen = body.style.maxHeight && body.style.maxHeight !== '0px';

      if (isCurrentlyOpen && !forceOpen) {
        body.style.overflow = 'hidden';
        body.style.maxHeight = inner.scrollHeight + 'px';
        void body.offsetHeight;
        body.style.maxHeight = '0px';
        body.style.opacity = '0';
        if (arrow) arrow.style.transform = 'rotate(0deg)';
        if (badge) {
          badge.style.background = '#f1f5f9';
          badge.style.color = '#64748b';
        }
      } else {
        body.style.maxHeight = inner.scrollHeight + 'px';
        body.style.opacity = '1';
        if (arrow) arrow.style.transform = 'rotate(180deg)';
        if (badge) {
          badge.style.background = '#e0f2fe';
          badge.style.color = '#0284c7';
        }
        setTimeout(() => {
          if (body.style.maxHeight !== '0px') body.style.overflow = 'visible';
        }, 800);
      }
    };

    (window as any).openAndHighlightFaq = function (id: string) {
      const card = document.getElementById(id);
      if (!card) return;

      const header = card.querySelector('div[onclick]') as HTMLElement;
      if (header && (window as any).toggleAccordion) {
        (window as any).toggleAccordion(header);
      }

      card.style.borderColor = '#38bdf8';
      card.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.25)';

      setTimeout(() => {
        card.style.borderColor = '#e2e8f0';
        card.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.02)';
      }, 2000);
    };

    const toggleSmoothAccordion = (triggerEl: HTMLElement) => {
      const parent = triggerEl.closest('.v33-accordion') as HTMLElement;
      if (!parent) return;

      const wrapper = parent.querySelector('.v33-content-wrapper') as HTMLElement;
      const arrow = parent.querySelector('.v33-arrow') as HTMLElement;
      const inner = parent.querySelector('.v33-content-inner') as HTMLElement;

      if (!wrapper || !inner) return;

      wrapper.style.transitionDuration = '0.8s';

      const isOpen = parent.classList.contains('open');

      if (isOpen) {
        wrapper.style.overflow = 'hidden';
        wrapper.style.maxHeight = inner.scrollHeight + 'px';
        void wrapper.offsetHeight;
        wrapper.style.maxHeight = '0px';
        wrapper.style.opacity = '0';
        if (arrow) arrow.style.transform = 'rotate(0deg)';
        parent.classList.remove('open');
      } else {
        parent.classList.add('open');
        wrapper.style.maxHeight = inner.scrollHeight + 'px';
        wrapper.style.opacity = '1';
        if (arrow) arrow.style.transform = 'rotate(180deg)';

        setTimeout(() => {
          if (parent.classList.contains('open')) {
            wrapper.style.overflow = 'visible';
          }
        }, 800);
      }
    };

    (window as any).toggleSmoothAccordion = toggleSmoothAccordion;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const trigger = target.closest('.v33-summary, [onclick*="toggleSmoothAccordion"]') as HTMLElement;
      
      if (trigger) {
        e.preventDefault();
        e.stopPropagation();
        toggleSmoothAccordion(trigger);
      }
    };

    document.addEventListener('click', handleGlobalClick, true);

    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const targetPos = resetScrollOnNav ? 0 : (pageScrollPositions.current[currentLesson] || 0);

    const rafId = requestAnimationFrame(() => {
      setTimeout(() => {
        window.scrollTo({ top: targetPos, behavior: 'instant' as ScrollBehavior });
      }, 30);
    });

    return () => cancelAnimationFrame(rafId);
  }, [currentLesson, loading, resetScrollOnNav]);

  const handleSelectLesson = (lessonKey: string, tabKey?: string) => {
    if (!resetScrollOnNav && currentLesson) {
      pageScrollPositions.current[currentLesson] = Math.max(0, window.scrollY);
    }

    setIsSettingsOpen(false);
    const newTab = tabKey || activeTab;
    const params = new URLSearchParams();
    params.set('tab', newTab);
    params.set('lesson', lessonKey);

    localStorage.setItem('uw_active_tab', newTab);
    localStorage.setItem('uw_active_lesson', lessonKey);

    router.push(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (sidebarLeftRef.current) {
        const activeBtn = sidebarLeftRef.current.querySelector(`.${styles.navLink}.${styles.active}`) as HTMLElement;
        if (activeBtn) {
          activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentLesson, activeTab]);

  useEffect(() => {
    if (!activeAnchorId || !sidebarRightRef.current) return;
    const activeLink = sidebarRightRef.current.querySelector(`.${styles.anchorLink}.${styles.active}`) as HTMLElement;
    if (activeLink) {
      activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeAnchorId]);

  useEffect(() => {
    // Добавляем leads_table в исключения
    if (currentLesson === 'price' || currentLesson === 'script' || currentLesson === 'leads_table') {
      setShowScrollTop(false);
      return;
    }

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
      
      if (!resetScrollOnNav && currentLesson && !loading) {
        pageScrollPositions.current[currentLesson] = Math.max(0, window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentLesson, resetScrollOnNav, loading]);

  useEffect(() => {
    const container = contentAreaRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const wrapper = target.closest('.img-preview-wrapper');

      if (wrapper) {
        const src = wrapper.getAttribute('data-src');
        if (src) {
          const rect = wrapper.getBoundingClientRect();
          const wrapperCenterX = rect.left + rect.width / 2;
          const wrapperCenterY = rect.top + rect.height / 2;
          
          const windowCenterX = window.innerWidth / 2;
          const windowCenterY = window.innerHeight / 2;

          const offsetX = wrapperCenterX - windowCenterX;
          const offsetY = wrapperCenterY - windowCenterY;

          const modal = document.getElementById('lightbox-modal');
          if (modal) {
            modal.style.setProperty('--origin-x', `${offsetX}px`);
            modal.style.setProperty('--origin-y', `${offsetY}px`);
          }

          setActiveLightboxSrc(src);
        }
      }
    };

    container.addEventListener('click', handleClick);

    const handleModalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.id === 'lightbox-modal' || target.classList.contains('lightbox-close')) {
        setActiveLightboxSrc(null);
      }
    };

    const globalModal = document.getElementById('lightbox-modal');
    globalModal?.addEventListener('click', handleModalClick);

    return () => {
      container.removeEventListener('click', handleClick);
      globalModal?.removeEventListener('click', handleModalClick);
    };
  }, [loading, loadedFromFile, fileHtmlContent, sections]);

  const scrollToTop = () => {
    const isSmooth = localStorage.getItem('uw_smooth_scroll') !== 'false';
    window.scrollTo({ top: 0, behavior: isSmooth ? 'smooth' : 'auto' });
  };

  const toggleLeft = () => {
    if (contentAreaRef.current) {
      contentAreaRef.current.classList.add(styles.sidebarReRendering);
    }
    
    const state = !leftCollapsed;
    setLeftCollapsed(state);
    localStorage.setItem('uw_left_collapsed', String(state));
    localStorage.setItem('uw_manual_left_collapsed', String(state));

    setTimeout(() => {
      if (contentAreaRef.current) {
        contentAreaRef.current.classList.remove(styles.sidebarReRendering);
      }
    }, 300);
  };

  const toggleRight = () => {
    if (contentAreaRef.current) {
      contentAreaRef.current.classList.add(styles.sidebarReRendering);
    }

    const state = !rightCollapsed;
    setRightCollapsed(state);
    localStorage.setItem('uw_right_collapsed', String(state));
    localStorage.setItem('uw_manual_right_collapsed', String(state));

    setTimeout(() => {
      if (contentAreaRef.current) {
        contentAreaRef.current.classList.remove(styles.sidebarReRendering);
      }
    }, 300);
  };

  useEffect(() => {
    if (currentLesson !== 'price') return;

    const applySavedRadio = () => {
      const savedTab = localStorage.getItem('uw_price_active_tab');
      if (!savedTab || !contentAreaRef.current) return;

      const radio = contentAreaRef.current.querySelector(`#sw-tab-${savedTab}-radio`) as HTMLInputElement;
      if (radio && !radio.checked) {
        radio.checked = true;
      }
    };

    applySavedRadio();

    const container = contentAreaRef.current;
    let observer: MutationObserver | null = null;

    if (container) {
      observer = new MutationObserver(() => {
        applySavedRadio();
      });

      observer.observe(container, { childList: true, subtree: true });
    }

    const handlePriceTabClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const label = target.closest('.sw-tabs-nav label');
      if (label) {
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          const tabName = forAttr.replace('sw-tab-', '').replace('-radio', '');
          localStorage.setItem('uw_price_active_tab', tabName);
        }
      }
    };

    container?.addEventListener('click', handlePriceTabClick);

    return () => {
      observer?.disconnect();
      container?.removeEventListener('click', handlePriceTabClick);
    };
  }, [currentLesson, loading, fileHtmlContent, leftCollapsed, rightCollapsed]);

  useEffect(() => {
    fetchData();
  }, [currentLesson, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/education?lesson=${currentLesson}&tab=${activeTab}`);
      const rawText = await res.text();

      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        return;
      }

      if (!res.ok || !data.success) {
        return;
      }

      setLessonMeta(data.meta || { title: 'Новая страница', intro: 'Контент еще не заведен.' });
      setSections(data.sections || []);
      setLoadedFromFile(Boolean(data.loadedFromFile));
      setFileHtmlContent(data.fileHtmlContent || '');
      setIsEditMode(false);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEditMode = () => {
    if (loadedFromFile) {
      showToast('Сначала импортируйте страницу в БД', 'info');
      return;
    }
    setIsEditMode((prev) => !prev);
  };

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
        showToast(
          isImport ? 'Файл успешно импортирован в PostgreSQL!' : 'Изменения сохранены!',
          'success'
        );
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
      const res = await fetch(`/api/education?lesson=${currentLesson}&tab=${activeTab}`, {
        method: 'DELETE',
      });
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

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        title: 'Новый заголовок',
        text: '<p>Текст новой секции...</p>',
      },
    ]);
  };

  const removeSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

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

  // Добавь этот эффект в EducationPortalContent внутри page.tsx
useEffect(() => {
  if (activeLessonConfigTitle) {
    document.title = `${activeLessonConfigTitle}`;
  } else if (lessonMeta.title && lessonMeta.title !== 'Загрузка...') {
    document.title = `${lessonMeta.title} `;
  }
}, [activeLessonConfigTitle, lessonMeta.title]);

  useEffect(() => {
    if (loading || isEditMode || isSettingsOpen) return;

    const parseHeadings = () => {
      if (
        currentLesson === 'script' || 
        currentLesson === 'price' || 
        currentLesson === 'call_examples' ||
        currentLesson === 'leads_table'
      ) {
        setAnchors([]);
        return;
      }

      const container = contentAreaRef.current;
      if (!container) return;

      const headingSelector = currentLesson === 'motivation' ? 'h2' : 'h2, h3';
      const headings = Array.from(container.querySelectorAll(headingSelector)).filter(
        (h) => !h.classList.contains(styles.eduTitle)
      );
      const list: { id: string; title: string; isSub?: boolean; index: number }[] = [];

      headings.forEach((heading, idx) => {
        const text = heading.textContent?.trim() || '';
        if (!text) return;

        const anchorId = heading.getAttribute('id') || `nav-heading-${idx}`;
        heading.setAttribute('id', anchorId);

        list.push({
          id: anchorId,
          title: text,
          isSub: heading.tagName.toLowerCase() === 'h3',
          index: idx,
        });
      });

      setAnchors(list);
      if (list.length > 0 && !activeAnchorId) {
        setActiveAnchorId(list[0].id);
      }
    };

    const timer = setTimeout(parseHeadings, 100);
    return () => clearTimeout(timer);
  }, [loading, loadedFromFile, fileHtmlContent, sections, isEditMode, currentLesson, isSettingsOpen]);

  useEffect(() => {
    if (anchors.length === 0 || isSettingsOpen) return;

    const handleScroll = () => {
      if (isScrollingToAnchor.current) return;

      const container = contentAreaRef.current;
      if (!container) return;

      const headingSelector = currentLesson === 'motivation' ? 'h2' : 'h2, h3';
      const DOMHeadings = Array.from(container.querySelectorAll(headingSelector));
      if (DOMHeadings.length === 0) return;

      const windowHeight = window.innerHeight;
      const scrollPosition = window.scrollY + windowHeight;
      const totalHeight = document.documentElement.scrollHeight;

      if (totalHeight - scrollPosition <= 20) {
        setActiveAnchorId(anchors[anchors.length - 1].id);
        return;
      }

      const topOffset = 140;
      let bestIndex = 0;

      const isNearBottom = scrollPosition >= totalHeight - windowHeight * 1.2;

      if (isNearBottom) {
        let closestToCenterDistance = Infinity;

        DOMHeadings.forEach((heading, idx) => {
          const rect = heading.getBoundingClientRect();
          if (rect.top > topOffset && rect.top < windowHeight) {
            const distToTarget = Math.abs(rect.top - 200);
            if (distToTarget < closestToCenterDistance) {
              closestToCenterDistance = distToTarget;
              bestIndex = idx;
            }
          } else if (rect.top <= topOffset) {
            bestIndex = idx;
          }
        });
      } else {
        for (let i = 0; i < DOMHeadings.length; i++) {
          const rect = DOMHeadings[i].getBoundingClientRect();
          if (rect.top <= topOffset + 30) {
            bestIndex = i;
          } else {
            break;
          }
        }
      }

      if (anchors[bestIndex]) {
        setActiveAnchorId((prev) => (prev !== anchors[bestIndex].id ? anchors[bestIndex].id : prev));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [anchors, isSettingsOpen, currentLesson]);

  const scrollToAnchor = (id: string, index: number) => {
    const container = contentAreaRef.current;
    const headingSelector = currentLesson === 'motivation' ? 'h2' : 'h2, h3';
    const target = document.getElementById(id) || container?.querySelectorAll(headingSelector)[index];
    if (!target) return;

    isScrollingToAnchor.current = true;
    setActiveAnchorId(id);

    const headerOffset = 132;
    const elementTop = target.getBoundingClientRect().top + window.scrollY;
    const isSmooth = localStorage.getItem('uw_smooth_scroll') !== 'false';

    window.scrollTo({
      top: elementTop - headerOffset,
      behavior: isSmooth ? 'smooth' : 'auto',
    });

    if (scrollSpyTimeout.current) clearTimeout(scrollSpyTimeout.current);
    scrollSpyTimeout.current = setTimeout(() => {
      isScrollingToAnchor.current = false;
    }, 800);
  };

  const currentTabConfig = SECTIONS_CONFIG[activeTab] || SECTIONS_CONFIG['doc'];
  const isPricePage = 
    currentLesson === 'price' || 
    currentLesson === 'script' || 
    currentLesson === 'call_structure' ||
    currentLesson === 'call_examples' ||
    currentLesson === 'docs' ||
    currentLesson === 'leads_table'; // <-- Скроет правый сайдбар и развернет ширину

  const isNoRightSidebar = 
    currentLesson === 'price' || 
    currentLesson === 'script' || 
    currentLesson === 'call_structure' ||
    currentLesson === 'call_examples' ||
    currentLesson === 'docs' ||
    currentLesson === 'leads_table'; // <-- Скроет правый сайдбар и развернет ширину

  const containerClasses = [
    styles.educationPortalContainer,
    leftCollapsed ? styles.leftCollapsed : '',
    (!isNoRightSidebar && rightCollapsed) ? styles.rightCollapsed : '',
    isNoRightSidebar ? styles.noRightSidebar : '',
    isSettingsOpen ? styles.settingsOpen : '',
    currentLesson === 'script' ? styles.scriptPage : '',
    currentLesson === 'price' ? styles.pricePage : '',
    currentLesson === 'docs' ? styles.docsPage : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <HeaderSearch
        userName="Администратор"
        userRole="admin"
        isEditMode={isEditMode}
        isEditDisabled={loadedFromFile}
        onToggleEditMode={handleToggleEditMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isLeftCollapsed={leftCollapsed}
      />

      <div className={styles.mainWrapper}>
        <div className={styles.navSidebarWrapper}>
          <nav className={styles.navSidebar} id="sidebarLeft" ref={sidebarLeftRef}>
            <div className={styles.tabSwitcher}>
              {Object.entries(SECTIONS_CONFIG).map(([tabId, tabData]) => {
                const tabIcon = 
                  tabId === 'doc' ? 'bi-journal-text' : 
                  tabId === 'practice' ? 'bi-briefcase' : 
                  'bi-grid-1x2';

                return (
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
                    <i className={`bi ${tabIcon} ${styles.tabBtnIcon}`}></i>
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
                        className={`${styles.navLink} ${currentLesson === lessonKey && !isSettingsOpen ? styles.active : ''}`}
                        data-tooltip={lesson.title}
                      >
                        <i className={`bi bi-${lesson.icon} ${styles.navIconFa}`}></i>
                        <span className={styles.navItemText}>{lesson.title}</span>

                        {lesson.badge && (
                          lesson.badge !== 'В разработке' ? (
                            <div 
                              className={styles.newUpdateWrapper}
                              data-update-tooltip={`Обновлено: ${lesson.badge}`}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                e.currentTarget.style.setProperty('--tooltip-top', `${rect.top - 32}px`);
                                e.currentTarget.style.setProperty('--tooltip-left', `${rect.left}px`);
                              }}
                            >
                              <i className="bi bi-stars"></i>
                            </div>
                          ) : (
                            <div 
                              className={styles.devIconWrapper}
                              data-update-tooltip="Раздел в разработке"
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                e.currentTarget.style.setProperty('--tooltip-top', `${rect.top - 32}px`);
                                e.currentTarget.style.setProperty('--tooltip-left', `${rect.left}px`);
                              }}
                            >
                              <i className="bi bi-tools"></i>
                            </div>
                          )
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </React.Fragment>
            ))}
          </nav>

          {/* КНОПКА СВОРАЧИВАНИЯ СТРОГО НА РАЗДЕЛИТЕЛЕ СНАРУЖИ МЕНЮ */}
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
            <div 
              className={`${styles.settingsOverlayScreen} ${isSettingsOpen ? styles.active : ''}`}
              style={{
                display: isSettingsOpen ? 'flex' : 'none',
                flexDirection: 'column',
                height: 'calc(100vh - 140px)',
                maxHeight: '100vh',
                overflowY: 'auto',
                boxSizing: 'border-box',
                padding: '24px',
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', flexShrink: 0 }}>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  title="Вернуться к тексту"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#0f172a',
                    fontSize: '16px',
                    transition: 'background-color 0.15s ease',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>

                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Настройки
                </h1>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Упрощенный вид источника БД</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        Показывать компактный бейдж в шапке вместо большой панели
                      </div>
                    </div>

                    <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={dbStatusView === 'simple'}
                        onChange={(e) => {
                          const newView = e.target.checked ? 'simple' : 'full';
                          setDbStatusView(newView);
                          localStorage.setItem('uw_db_status_view', newView);
                        }}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: dbStatusView === 'simple' ? '#0f172a' : '#cbd5e1',
                        transition: '0.2s', borderRadius: '24px'
                      }}>
                        <span style={{
                          position: 'absolute', content: '""', height: '18px', width: '18px', left: '3px', bottom: '3px',
                          backgroundColor: 'white', transition: '0.2s', borderRadius: '50%',
                          transform: dbStatusView === 'simple' ? 'translateX(20px)' : 'translateX(0)'
                        }} />
                      </span>
                    </label>
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Всегда сбрасывать прокрутку наверх</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        ВКЛ — открывать любую страницу с самого верха. ВЫКЛ — запоминать позицию прокрутки для каждой страницы.
                      </div>
                    </div>

                    <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={resetScrollOnNav}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setResetScrollOnNav(val);
                          localStorage.setItem('uw_reset_scroll', String(val));
                        }}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: resetScrollOnNav ? '#0f172a' : '#cbd5e1',
                        transition: '0.2s', borderRadius: '24px'
                      }}>
                        <span style={{
                          position: 'absolute', content: '""', height: '18px', width: '18px', left: '3px', bottom: '3px',
                          backgroundColor: 'white', transition: '0.2s', borderRadius: '50%',
                          transform: resetScrollOnNav ? 'translateX(20px)' : 'translateX(0)'
                        }} />
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {!isSettingsOpen && (
              <>
                {dbStatusView === 'full' && (
                  loadedFromFile ? (
                    <div 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: '#ffffff', 
                        border: '1px solid #e2e8f0', 
                        padding: '12px 18px', 
                        borderRadius: '14px', 
                        marginBottom: '28px' 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="bi bi-file-earmark-code" style={{ fontSize: '18px', color: '#64748b' }}></i>
                        <span style={{ color: '#0f172a', fontSize: '13.5px', fontWeight: 600 }}>
                          Страница загружена из локального файла <b>({currentLesson}.html)</b>.
                        </span>
                      </div>

                      <button
                        onClick={() => handleSavePage(true)}
                        disabled={saving}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          border: '1px solid #0f172a',
                          background: '#0f172a',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <i className="bi bi-database-add"></i>
                        {saving ? 'Загрузка...' : 'Загрузить в БД'}
                      </button>
                    </div>
                  ) : (
                    <div 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: '#ffffff', 
                        border: '1px solid #e2e8f0', 
                        padding: '12px 18px', 
                        borderRadius: '14px', 
                        marginBottom: '28px' 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="bi bi-database-check" style={{ fontSize: '18px', color: '#166534' }}></i>
                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                          Страница загружена из <b>PostgreSQL</b>
                        </span>
                      </div>

                      <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: '#0f172a',
                          fontWeight: 700,
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <i className="bi bi-trash"></i>
                        Удалить из БД
                      </button>
                    </div>
                  )
                )}

                <div className={styles.eduHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div className={styles.eduBreadcrumb}>
                      {SECTIONS_CONFIG[activeTab]?.title || 'Обучение'}
                    </div>
                    {dbStatusView === 'simple' && (
                      <div>
                        {!loadedFromFile ? (
                          <button
                            onClick={() => setIsDeleteModalOpen(true)}
                            style={{
                              background: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              color: '#166534',
                              padding: '6px 14px',
                              borderRadius: '100px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <i className="bi bi-check-circle-fill" style={{ fontSize: '13px' }}></i>
                            <span>В БД</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSavePage(true)}
                            disabled={saving}
                            style={{
                              background: '#fff1f2',
                              border: '1px solid #fecdd3',
                              color: '#991b1b',
                              padding: '6px 14px',
                              borderRadius: '100px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '13px' }}></i>
                            <span>Черновик</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={styles.eduHeaderMain}>
                    {isEditMode ? (
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Заголовок страницы</label>
                        <input
                          type="text"
                          className="form-control"
                          value={lessonMeta.title}
                          onChange={(e) => setLessonMeta({ ...lessonMeta, title: e.target.value })}
                          style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0 12px 0', width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        />
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Подзаголовок / Описание</label>
                        <textarea
                          className="form-control"
                          value={lessonMeta.intro || ''}
                          onChange={(e) => setLessonMeta({ ...lessonMeta, intro: e.target.value })}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                          rows={2}
                        />
                      </div>
                    ) : (
                      <>
                        <h1 className={styles.eduTitle}>{activeLessonConfigTitle || lessonMeta.title}</h1>
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
                        {isEditMode ? (
                          <div style={{ border: '1px dashed #0284c7', padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <span style={{ fontWeight: 600, color: '#0284c7', fontSize: '14px' }}>Секция #{idx + 1}</span>
                              <button
                                onClick={() => removeSection(idx)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                              >
                                <i className="bi bi-trash"></i> Удалить секцию
                              </button>
                            </div>
                            
                            <div style={{ marginBottom: '12px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Заголовок секции</label>
                              <input
                                type="text"
                                value={sec.title}
                                onChange={(e) => {
                                  const updated = [...sections];
                                  updated[idx].title = e.target.value;
                                  setSections(updated);
                                }}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '15px', fontWeight: 600 }}
                              />
                            </div>

                            <div>
                              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Основной текст (HTML / Текст)</label>
                              <textarea
                                value={sec.text}
                                ref={(el) => {
                                  if (el) {
                                    el.style.height = 'auto';
                                    el.style.height = `${el.scrollHeight}px`;
                                  }
                                }}
                                onChange={(e) => {
                                  e.target.style.height = 'auto';
                                  e.target.style.height = `${e.target.scrollHeight}px`;

                                  const updated = [...sections];
                                  updated[idx].text = e.target.value;
                                  setSections(updated);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  marginTop: '4px',
                                  resize: 'none',
                                  overflow: 'hidden',
                                  fontFamily: 'inherit',
                                  lineHeight: '1.5',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            {sec.title && (
                              <h2
                                id={`section-${idx}`}
                                style={{ fontSize: '22px', fontWeight: 700, margin: '28px 0 14px 0', textTransform: 'none', letterSpacing: 'normal', borderBottom: 'none' }}
                              >
                                {sec.title}
                              </h2>
                            )}
                            {sec.text && (
                              <div dangerouslySetInnerHTML={{ __html: sec.text }} />
                            )}
                          </>
                        )}
                      </div>
                    ))}

                    {isEditMode && (
                      <button
                        onClick={addSection}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px dashed #94a3b8',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#475569',
                          fontWeight: 600,
                          cursor: 'pointer',
                          marginBottom: '28px'
                        }}
                      >
                        <i className="bi bi-plus-circle" style={{ marginRight: '8px' }}></i> Добавить новую секцию
                      </button>
                    )}
                  </div>
                )}

                <div className={styles.eduNextPrevPanel}>
                  <div className={styles.enppContainer}>
                    {prevLesson ? (
                      <button className={`${styles.enppBtn} ${styles.enppBtnPrev}`} onClick={() => handleSelectLesson(prevLesson.key)}>
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
                      <button className={`${styles.enppBtn} ${styles.enppBtnNext}`} onClick={() => handleSelectLesson(nextLesson.key)}>
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
              </>
            )}
          </div>
        </main>

        {!isPricePage && !isSettingsOpen && (
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
                {anchors.length > 0 ? (
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
                ) : (
                  <li style={{ fontSize: '13px', color: '#94a3b8', padding: '8px 0' }}></li>
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

      <div className={`${styles.globalSavePanel} ${isEditMode && !loadedFromFile ? styles.active : ''}`}>
        <div className={styles.gspInfo}>
          <span className={styles.gspBadge}>EDITING</span>
          <span className={styles.gspText}>Режим редактирования</span>
        </div>
        <div className={styles.gspActions}>
          <button className={`${styles.gspBtn} ${styles.gspBtnCancel}`} onClick={() => setIsEditMode(false)}>
            Отмена
          </button>
          <button className={`${styles.gspBtn} ${styles.gspBtnSave}`} onClick={() => handleSavePage(false)} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </div>

      {isDeleteModalOpen && (
        <div className={styles.customModalBackdrop}>
          <div className={styles.customModalCard}>
            <div className={styles.cmIconDanger}>
              <i className="bi bi-exclamation-triangle"></i>
            </div>
            <div className={styles.cmTitle}>Удалить страницу?</div>
            <div className={styles.cmDescription}>
              Вы уверены, что хотите удалить страницу <b>"{lessonMeta.title}"</b> из базы данных? 
              Это вернет отображение из локального HTML-файла.
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

      <div 
        id="lightbox-modal" 
        className={activeLightboxSrc ? 'active' : ''} 
        onClick={() => setActiveLightboxSrc(null)}
      >
        <span className="lightbox-close" onClick={() => setActiveLightboxSrc(null)}>&times;</span>
        {activeLightboxSrc && (
          <img 
            id="lightbox-img" 
            src={activeLightboxSrc} 
            alt="Увеличенное изображение" 
            onClick={(e) => e.stopPropagation()} 
          />
        )}
      </div>

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
          <div className={styles.crmToastProgress}></div>
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