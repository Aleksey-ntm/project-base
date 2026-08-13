'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import HeaderSearch from '@/components/HeaderSearch';
import Footer from '@/components/Footer';
import './styles.css';

const SECTIONS_CONFIG: Record<string, { title: string; groups: Record<string, { title: string; icon: string; lessons: Record<string, { title: string; icon: string }> }> }> = {
  doc: {
    title: 'Обучение',
    groups: {
      theory_base: {
        title: 'Вступление',
        icon: 'journal-bookmark-fill',
        lessons: {
          welcome_1: { title: 'Добро пожаловать', icon: 'hand-index-thumb' },
          welcome_2: { title: 'Описание основных процессов', icon: 'diagram-3' },
        },
      },
      advanced_theory: {
        title: 'Теория',
        icon: 'stars',
        lessons: {
          marketing: { title: 'Интернет маркетинг', icon: 'megaphone' },
          advanced_2: { title: 'Сайты и CMS', icon: 'window-stack' },
          advanced_4: { title: 'Варианты исполнителей', icon: 'people' },
          advanced_5: { title: 'Термины', icon: 'bookmark-star' },
          practice_theory_1: { title: 'ЛПР/ЛВПР, секретарь', icon: 'person-badge' },
          practice_theory_2: { title: 'Выявление потребности', icon: 'question-circle' },
        },
      },
      marketing_group: {
        title: 'Услуги',
        icon: 'graph-up',
        lessons: {
          advanced_6: { title: 'SEO', icon: 'search' },
          advanced_7: { title: 'Контекст', icon: 'bullseye' },
          advanced_8: { title: 'Тех.поддержка', icon: 'headset' },
          advanced_9: { title: 'Разработка', icon: 'code-slash' },
        },
      },
      price_group: {
        title: 'Цены и тарифы',
        icon: 'wallet2',
        lessons: {
          advanced_10: { title: 'Тарифы', icon: 'calculator' },
        },
      },
    },
  },
  statements_uniofweb: {
    title: 'Заявления',
    groups: {
      legal_info: {
        title: 'Информация по юр. лицам',
        icon: 'info-circle',
        lessons: {
          two_entities: { title: 'Почему у нас два юр. лица', icon: 'patch-question' },
        },
      },
      statements_group: {
        title: 'Заявления',
        icon: 'file-text',
        lessons: {
          day_off: { title: 'Заявление на отгул', icon: 'clock-history' },
          vacation: { title: 'Заявление на отпуск', icon: 'calendar-check' },
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
  box_text?: string;
}

export default function EducationPortalPage() {
  const [activeTab, setActiveTab] = useState<string>('doc');
  const [currentLesson, setCurrentLesson] = useState<string>('marketing');
  
  const [searchHighlight, setSearchHighlight] = useState<string>('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);

  const [lessonMeta, setLessonMeta] = useState<{ title: string; intro?: string }>({ title: 'Загрузка...' });
  const [sections, setSections] = useState<LessonSection[]>([]);
  const [loadedFromFile, setLoadedFromFile] = useState<boolean>(false);
  const [fileHtmlContent, setFileHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const [anchors, setAnchors] = useState<{ id: string; title: string }[]>([]);
  const [activeAnchorId, setActiveAnchorId] = useState<string>('');

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);

  const sidebarLeftRef = useRef<HTMLDivElement>(null);

  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [scrollTopBottomOffset, setScrollTopBottomOffset] = useState<number>(28);
  const footerRef = useRef<HTMLDivElement>(null);

  const [errorModalText, setErrorModalText] = useState<string | null>(null);
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
    const urlParams = new URLSearchParams(window.location.search);
    const l = urlParams.get('lesson');
    const t = urlParams.get('tab');

    if (t) setActiveTab(t);
    if (l) setCurrentLesson(l);
  }, []);

  useEffect(() => {
    const left = localStorage.getItem('uw_left_collapsed') === 'true';
    const right = localStorage.getItem('uw_right_collapsed') === 'true';
    setLeftCollapsed(left);
    setRightCollapsed(right);

    if (left) document.body.classList.add('left-collapsed');
    if (right) document.body.classList.add('right-collapsed');
  }, []);

  // Мягкая прокрутка левого меню к активному уроку
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sidebarLeftRef.current) {
        const activeBtn = sidebarLeftRef.current.querySelector('.nav-link.active') as HTMLElement;
        if (activeBtn) {
          activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentLesson, activeTab]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }

      if (footerRef.current) {
        const footerRect = footerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        if (footerRect.top < windowHeight) {
          const overlap = windowHeight - footerRect.top;
          setScrollTopBottomOffset(overlap + 24);
        } else {
          setScrollTopBottomOffset(28);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleLeft = () => {
    const state = !leftCollapsed;
    setLeftCollapsed(state);
    localStorage.setItem('uw_left_collapsed', String(state));
    document.body.classList.toggle('left-collapsed', state);
  };

  const toggleRight = () => {
    const state = !rightCollapsed;
    setRightCollapsed(state);
    localStorage.setItem('uw_right_collapsed', String(state));
    document.body.classList.toggle('right-collapsed', state);
  };

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
        setErrorModalText(`Сервер вернул HTML вместо JSON при загрузке (Status ${res.status}):\n\n${rawText}`);
        return;
      }

      if (!res.ok || !data.success) {
        setErrorModalText(`Ошибка загрузки данных (Status ${res.status}):\n${data.error || rawText}`);
        return;
      }

      setLessonMeta(data.meta || { title: 'Новая страница', intro: 'Контент еще не заведен.' });
      setSections(data.sections || []);
      setLoadedFromFile(Boolean(data.loadedFromFile));
      setFileHtmlContent(data.fileHtmlContent || '');
      setSearchHighlight('');
      setCurrentMatchIndex(0);
    } catch (e: any) {
      console.error(e);
      setErrorModalText(`Сбой сети или исполнения при загрузке:\n${e.message}\n${e.stack || ''}`);
    } finally {
      setLoading(false);
    }
  };

  const searchContext = useMemo(() => {
    const fallback = {
      sections,
      fileHtml: fileHtmlContent || '',
      title: lessonMeta.title || '',
      intro: lessonMeta.intro || '',
      total: 0
    };

    if (typeof document === 'undefined' || loading || isEditMode) return fallback;
    const query = searchHighlight.trim();
    if (query.length < 2) return fallback;

    let globalCounter = 0;
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeQuery})`, 'gi');

    const highlightString = (htmlString?: string): string => {
      if (!htmlString) return '';
      const temp = document.createElement('div');
      temp.innerHTML = htmlString;
      
      const walker = document.createTreeWalker(temp, NodeFilter.SHOW_TEXT, null);
      const textNodes: Text[] = [];
      let n;
      while ((n = walker.nextNode())) textNodes.push(n as Text);

      textNodes.forEach((node) => {
        const val = node.nodeValue || '';
        if (regex.test(val)) {
          const frag = document.createDocumentFragment();
          let lastIdx = 0;
          regex.lastIndex = 0;
          let match;
          
          while ((match = regex.exec(val)) !== null) {
            if (match.index > lastIdx) {
              frag.appendChild(document.createTextNode(val.substring(lastIdx, match.index)));
            }
            const mark = document.createElement('mark');
            mark.className = 'search-highlight-word';
            if (globalCounter === currentMatchIndex) {
              mark.className += ' active-focus-mark';
            }
            mark.id = `search-match-${globalCounter}`;
            mark.textContent = match[0];
            frag.appendChild(mark);
            
            globalCounter++;
            lastIdx = match.index + match[0].length;
          }
          if (lastIdx < val.length) {
            frag.appendChild(document.createTextNode(val.substring(lastIdx)));
          }
          node.parentNode?.replaceChild(frag, node);
        }
      });
      return temp.innerHTML || '';
    };

    return {
      title: highlightString(lessonMeta.title),
      intro: highlightString(lessonMeta.intro),
      fileHtml: highlightString(fileHtmlContent),
      sections: sections.map(sec => ({
        ...sec,
        title: highlightString(sec.title),
        text: highlightString(sec.text),
        box_text: highlightString(sec.box_text)
      })),
      total: globalCounter
    };
  }, [searchHighlight, currentMatchIndex, sections, fileHtmlContent, lessonMeta, loading, isEditMode]);

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

  // Сборка заголовков для правого меню
  useEffect(() => {
    if (loading) return;

    const buildAnchors = () => {
      const list: { id: string; title: string }[] = [];

      if (loadedFromFile) {
        const container = document.getElementById('legacy-file-content');
        if (container) {
          const h2Elements = container.querySelectorAll('h2');
          h2Elements.forEach((h2, idx) => {
            const anchorId = `anchor-h2-${idx}`;
            h2.setAttribute('id', anchorId);
            const text = h2.textContent?.trim() || '';
            if (text) {
              list.push({ id: anchorId, title: text });
            }
          });
        }
      } else {
        sections.forEach((sec, idx) => {
          if (sec.title && sec.title.trim()) {
            list.push({ id: `section-${idx}`, title: sec.title.trim() });
          }
        });
      }

      setAnchors(list);
      if (list.length > 0) setActiveAnchorId(list[0].id);
    };

    const timer = setTimeout(buildAnchors, 150);
    return () => clearTimeout(timer);
  }, [loading, loadedFromFile, fileHtmlContent, sections]);

  // Точное отслеживание скролла по заголовкам
  useEffect(() => {
    if (anchors.length === 0) return;

    const handleScroll = () => {
      const headerOffset = 160;
      const scrollY = window.scrollY + headerOffset;

      for (let i = anchors.length - 1; i >= 0; i--) {
        const target = document.getElementById(anchors[i].id);
        if (target) {
          const top = target.getBoundingClientRect().top + window.scrollY;
          if (scrollY >= top) {
            setActiveAnchorId(anchors[i].id);
            break;
          }
        }
      }
    };

    handleScroll(); // Вызываем сразу для мгновенной подсвети при загрузке
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [anchors]);

  const scrollToAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const headerHeight = 130;
    const elementTop = el.getBoundingClientRect().top + window.scrollY;
    
    window.scrollTo({
      top: elementTop - headerHeight,
      behavior: 'smooth',
    });
    setActiveAnchorId(id);
  };

  const currentTabConfig = SECTIONS_CONFIG[activeTab] || SECTIONS_CONFIG['doc'];

  return (
    <div className="education-portal-container">
      <HeaderSearch
        userName="Администратор"
        userRole="admin"
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode(!isEditMode)}
        onSelectLesson={(lessonKey: string, tab: string, query: string) => {
          setActiveTab(tab);
          setCurrentLesson(lessonKey);
          setSearchHighlight(query);
          setCurrentMatchIndex(0);

          const url = new URL(window.location.href);
          url.searchParams.set('lesson', lessonKey);
          url.searchParams.set('tab', tab);
          url.searchParams.delete('hl');
          window.history.pushState({}, '', url.toString());
        }}
      />

      <div className="top-sections-nav">
        <div className="top-nav-inside">
          {Object.entries(SECTIONS_CONFIG).map(([tabId, tabData]) => (
            <button
              key={tabId}
              onClick={() => {
                setActiveTab(tabId);
                const firstGroup = Object.values(tabData.groups)[0];
                const firstLessonKey = Object.keys(firstGroup.lessons)[0];
                setCurrentLesson(firstLessonKey);
              }}
              className={`top-section-link ${activeTab === tabId ? 'active' : ''}`}
            >
              {tabData.title}
            </button>
          ))}
        </div>
      </div>

      <div className="main-wrapper">
        <div className="nav-sidebar-wrapper">
          <button 
            className="dashed-toggle-btn toggle-left" 
            onClick={toggleLeft} 
            title={leftCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            <i className={`bi ${leftCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
          </button>

          <nav className="nav-sidebar" id="sidebarLeft" ref={sidebarLeftRef}>
            {Object.entries(currentTabConfig.groups).map(([groupKey, group]) => (
              <React.Fragment key={groupKey}>
                <div className="nav-sidebar-title">{group.title}</div>
                <ul className="nav-list">
                  {Object.entries(group.lessons).map(([lessonKey, lesson]) => (
                    <li key={lessonKey} className="nav-item">
                      <button
                        onClick={() => setCurrentLesson(lessonKey)}
                        className={`nav-link ${currentLesson === lessonKey ? 'active' : ''}`}
                        data-tooltip={lesson.title}
                      >
                        <i className={`bi bi-${lesson.icon} nav-icon-fa`}></i>
                        <span className="nav-item-text">{lesson.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </React.Fragment>
            ))}
          </nav>
        </div>

        <main className="content-container">
          <div className={`content-inner ${loading ? 'content-loading-state' : ''}`}>
            {loadedFromFile ? (
              <div 
                className="import-banner" 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  background: '#f0f9ff', 
                  border: '1px solid #bae6fd', 
                  padding: '12px 18px', 
                  borderRadius: '12px', 
                  marginBottom: '24px' 
                }}
              >
                <span style={{ color: '#0369a1', fontSize: '14px', fontWeight: 500 }}>
                  📄 Страница загружена из локального файла <b>({currentLesson}.html)</b>
                </span>
              </div>
            ) : (
              <div 
                className="db-banner" 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  background: '#f0fdf4', 
                  border: '1px solid #bbf7d0', 
                  color: '#15803d', 
                  padding: '12px 18px', 
                  borderRadius: '12px', 
                  marginBottom: '28px' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="bi bi-database-check" style={{ fontSize: '18px' }}></i>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>Страница загружена из <b>PostgreSQL</b></span>
                </div>
              </div>
            )}

            <div className="edu-header">
              <div className="edu-breadcrumb">{activeTab === 'doc' ? 'Теория' : 'Заявления'}</div>
              <div className="edu-header-main">
                <h1 className="edu-title" dangerouslySetInnerHTML={{ __html: searchContext.title || '' }} />
                {lessonMeta.intro && <p className="edu-intro" dangerouslySetInnerHTML={{ __html: searchContext.intro || '' }} />}
              </div>
            </div>

            {loadedFromFile ? (
              <div id="legacy-file-content" dangerouslySetInnerHTML={{ __html: searchContext.fileHtml || '' }} />
            ) : (
              <div className="blocks-container">
                {searchContext.sections.map((sec, idx) => (
                  <div key={idx} style={{ marginBottom: '28px' }}>
                    {sec.title && (
                      <h2
                        id={`section-${idx}`}
                        style={{ fontSize: '22px', fontWeight: 700, margin: '28px 0 14px 0' }}
                        dangerouslySetInnerHTML={{ __html: sec.title || '' }}
                      />
                    )}
                    {sec.text && <div dangerouslySetInnerHTML={{ __html: sec.text || '' }} />}
                    {sec.box_text && <div className="tech-notice" dangerouslySetInnerHTML={{ __html: sec.box_text || '' }} />}
                  </div>
                ))}
              </div>
            )}

            <div className="edu-next-prev-panel">
              <div className="enpp-container">
                {prevLesson ? (
                  <button className="enpp-btn enpp-btn-prev" onClick={() => setCurrentLesson(prevLesson.key)}>
                    <i className="bi bi-arrow-left"></i>
                    <div className="enpp-btn-text">
                      <span>Предыдущий урок</span>
                      <div className="enpp-btn-title">{prevLesson.title}</div>
                    </div>
                  </button>
                ) : (
                  <div style={{ flex: 1 }} />
                )}

                {nextLesson ? (
                  <button className="enpp-btn enpp-btn-next" onClick={() => setCurrentLesson(nextLesson.key)}>
                    <div className="enpp-btn-text">
                      <span>Следующий урок</span>
                      <div className="enpp-btn-title">{nextLesson.title}</div>
                    </div>
                    <i className="bi bi-arrow-right"></i>
                  </button>
                ) : (
                  <div style={{ flex: 1 }} />
                )}
              </div>
            </div>
          </div>
        </main>

        <div className="right-sidebar-wrapper">
          <button 
            className="dashed-toggle-btn toggle-right" 
            onClick={toggleRight} 
            title={rightCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            <i className={`bi ${rightCollapsed ? 'bi-chevron-left' : 'bi-chevron-right'}`}></i>
          </button>

          <aside className="right-sidebar" id="sidebarRight">
            <div className="right-sidebar-title">
              <i className="bi bi-list-nested"></i> На этой странице:
            </div>

            <ul className="anchor-list">
              {anchors.length > 0 ? (
                anchors.map((item) => (
                  <li key={item.id} className="anchor-item">
                    <a
                      href={`#${item.id}`}
                      className={`anchor-link ${activeAnchorId === item.id ? 'active' : ''}`}
                      data-tooltip={item.title}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToAnchor(item.id);
                      }}
                    >
                      <span className="anchor-text">{item.title}</span>
                    </a>
                  </li>
                ))
              ) : (
                <li style={{ fontSize: '13px', color: '#94a3b8', padding: '8px 0' }}>
                  Заголовки не найдены
                </li>
              )}
            </ul>
          </aside>
        </div>
      </div>

      <button
        className={`scroll-to-top-btn ${showScrollTop ? 'show' : ''}`}
        onClick={scrollToTop}
        style={{ bottom: `${scrollTopBottomOffset}px` }}
        title="Пролистать наверх"
      >
        <i className="bi bi-arrow-up-short"></i>
      </button>

      <div ref={footerRef}>
        <Footer />
      </div>
    </div>
  );
}