"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { ReactSortable } from 'react-sortablejs';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface LinkItem {
    id: string;
    title: string;
    url: string;
    category: string;
    is_hidden: boolean;
    hide_url: boolean;
    open_in_new_tab: boolean;
    position?: number;
    custom_favicon?: string;
}

interface CategoryItem {
    id: string;
    name: string;
    position?: number;
}

export default function LinksPage() {
    const router = useRouter();
    
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingLink, setIsSavingLink] = useState(false);
    
    const [links, setLinks] = useState<LinkItem[]>([]);
    const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
    
    const [isEditMode, setIsEditMode] = useState(false); 
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleToggleEditMode = () => setIsEditMode(prev => !prev);

    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState('');
    const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');

    const [isInternalDomain, setIsInternalDomain] = useState(false);
    const [protocol, setProtocol] = useState<'http://' | 'https://'>('https://');
    const [rawUrlInput, setRawUrlInput] = useState('');
    const [currentDomain, setCurrentDomain] = useState('');
    
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const [formData, setFormData] = useState<LinkItem>({
        id: '', 
        title: '', 
        url: '', 
        category: 'Разное',
        is_hidden: false, 
        hide_url: false, 
        open_in_new_tab: false, 
        custom_favicon: ''
    });

    const saveCatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingUpdatesRef = useRef<Record<string, LinkItem[]>>({});
    const applyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    useEffect(() => {
        const checkUserRole = async () => {
            try {
                const res = await fetch('/api/auth');
                if (!res.ok) { router.replace('/login'); return; }
                const data = await res.json();
                if (!data.authenticated) { router.replace('/login'); return; }
                if (data.user?.role !== 'admin') { router.replace('/education'); return; }
                setIsAuthChecking(false);
            } catch (error) {
                router.replace('/login');
            }
        };
        checkUserRole();
    }, [router]);

    useEffect(() => {
        if (typeof window !== 'undefined') setCurrentDomain(window.location.host);
    }, []);

    const fetchLinks = async (isBackground = false) => {
        if (!isBackground) setIsLoading(true);
        try {
            const res = await fetch('/api/links', {
                cache: 'no-store',
                headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
            });
            
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            
            const rawLinks = Array.isArray(data.links) ? data.links : [];
            const cleanLinks = rawLinks.map((rest: any) => ({
                id: String(rest.id),
                title: String(rest.title || ''),
                url: String(rest.url || ''),
                is_hidden: Boolean(rest.is_hidden),
                hide_url: Boolean(rest.hide_url),
                open_in_new_tab: Boolean(rest.open_in_new_tab),
                category: String(rest.category || 'Разное'),
                custom_favicon: rest.custom_favicon || '',
                position: typeof rest.position === 'number' ? rest.position : 0
            }));
            
            setLinks(cleanLinks);

            const rawCats = Array.isArray(data.categories) ? data.categories : [];
            if (rawCats.length > 0) {
                const sortedCats = [...rawCats].sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
                setCategoriesList(sortedCats.map((cat: any) => ({ 
                    id: String(cat.id || cat.name), name: String(cat.name), position: cat.position 
                })));
            } else {
                const categoriesFromLinks = new Set<string>();
                cleanLinks.forEach((link: LinkItem) => categoriesFromLinks.add(link.category));
                setCategoriesList(Array.from(categoriesFromLinks).sort().map((name, idx) => ({ 
                    id: `cat_${idx}`, name, position: idx 
                })));
            }
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            showToast('Не удалось загрузить данные');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthChecking) fetchLinks();
    }, [isAuthChecking]);

    const getGroupedLinks = useCallback(() => {
        const grouped: Record<string, LinkItem[]> = {};
        categoriesList.forEach(cat => { grouped[cat.name] = []; });
        links.forEach(link => {
            const catName = link.category || 'Разное';
            if (!grouped[catName]) grouped[catName] = [];
            if (isEditMode || !link.is_hidden) grouped[catName].push(link);
        });
        return grouped;
    }, [links, categoriesList, isEditMode]);

    const saveCategoriesOrder = useCallback(async (newOrder: string[]) => {
        try {
            const payload = newOrder.map((name, index) => ({ name, position: index }));
            await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_categories', payload: { categories: payload } })
            });
        } catch (error) {
            console.error('Ошибка сохранения категорий:', error);
        }
    }, []);

    const saveLinksOrder = useCallback(async (newLinks: LinkItem[]) => {
        try {
            await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_links_order', payload: { links: newLinks } })
            });
        } catch (error) {
            console.error('Ошибка сохранения порядка:', error);
        }
    }, []);

    useEffect(() => {
        if (isEditMode) {
            document.body.classList.add('admin-panel-active', 'drag-mode-active');
        } else {
            document.body.classList.remove('admin-panel-active', 'drag-mode-active');
        }
    }, [isEditMode]);

    const handleCategoriesSort = (newList: CategoryItem[]) => {
        setCategoriesList(newList);
        if (saveCatTimeoutRef.current) clearTimeout(saveCatTimeoutRef.current);
        saveCatTimeoutRef.current = setTimeout(() => {
            saveCategoriesOrder(newList.map(item => item.name));
            saveCatTimeoutRef.current = null;
        }, 500);
    };

    const handleTilesSort = (newList: LinkItem[], categoryName: string) => {
        pendingUpdatesRef.current[categoryName] = newList.map(link => ({ ...link, category: categoryName }));
        if (applyTimeoutRef.current) clearTimeout(applyTimeoutRef.current);
        applyTimeoutRef.current = setTimeout(() => {
            const updates = pendingUpdatesRef.current;
            pendingUpdatesRef.current = {};
            setLinks(prev => {
                let newLinks = [...prev];
                for (const [cat, items] of Object.entries(updates)) {
                    newLinks = newLinks.filter(l => l.category !== cat);
                    newLinks = [...newLinks, ...items];
                }
                saveLinksOrder(newLinks);
                return newLinks;
            });
            applyTimeoutRef.current = null;
        }, 100);
    };

    // Точечное сохранение ссылки
    const handleSaveLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingLink(true);

        let cleanPathOrUrl = rawUrlInput.trim().replace(/^https?:\/\//i, '');
        const host = currentDomain || 'ntmbase.ru';
        let finalUrl = isInternalDomain 
            ? `${protocol}${host}/${cleanPathOrUrl.replace(new RegExp(`^${host}/?`), '').replace(/^\//, '')}`
            : `${protocol}${cleanPathOrUrl}`;

        const payloadToSave: LinkItem = {
            id: formData.id || `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            title: formData.title.trim(),
            url: finalUrl,
            category: formData.category || 'Разное',
            is_hidden: Boolean(formData.is_hidden),
            hide_url: Boolean(formData.hide_url),
            open_in_new_tab: Boolean(formData.open_in_new_tab),
            custom_favicon: formData.custom_favicon || '',
            position: typeof formData.position === 'number' ? formData.position : links.length
        };

        try {
            const res = await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_link', payload: payloadToSave }),
                signal: AbortSignal.timeout(4000)
            });

            const resData = await res.json().catch(() => ({}));
            if (!res.ok || resData.success === false) {
                throw new Error(resData.error || 'Ошибка сервера при сохранении');
            }
            
            setIsModalOpen(false);
            showToast('Плитка успешно сохранена');
            await fetchLinks(true);
        } catch (error: any) {
            console.error('Ошибка сохранения:', error);
            if (error.name === 'TimeoutError' || error.name === 'AbortError') {
                showToast('Таймаут: сервер базы данных не ответил за 4 сек');
            } else {
                showToast(error.message || 'Ошибка сети');
            }
        } finally {
            setIsSavingLink(false);
        }
    };

    const deleteLink = async (id: string) => {
        if (!confirm('Удалить эту ссылку?')) return;
        try {
            await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_link', payload: { id } })
            });
            showToast('Ссылка удалена');
            await fetchLinks(true);
        } catch (error) {
            console.error('Error deleting link:', error);
        }
    };

    const deleteCategory = async (category: string) => {
        if (!isEditMode) return;
        try {
            await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_category', payload: { category } })
            });
            setIsConfirmDeleteOpen(false);
            showToast('Раздел удален');
            await fetchLinks(true);
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };

    const addCategory = async (customCatName?: string) => {
        if (!isEditMode) return;
        const catName = customCatName || prompt('Введите название нового раздела:');
        if (!catName || !catName.trim()) return;
        
        try {
            await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'save_categories', 
                    payload: { categories: [...categoriesList, { name: catName.trim(), position: categoriesList.length }] }
                })
            });
            showToast('Раздел создан');
            await fetchLinks(true);
        } catch (error) {
            console.error('Error adding category:', error);
        }
    };

    const renameCategory = async (oldName: string, newName: string) => {
        if (!isEditMode) return;
        if (!newName || newName === oldName) { setEditingCategoryName(null); return; }
        try {
            await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'edit_category', payload: { old_category: oldName, new_category: newName } })
            });
            setEditingCategoryName(null);
            showToast('Раздел переименован');
            await fetchLinks(true);
        } catch (error) {
            console.error('Error renaming category:', error);
        }
    };

    const openAddLinkModal = (preselectedCategory = 'Разное') => {
        if (!isEditMode) return;
        setFormData({
            id: '', 
            title: '', 
            url: '', 
            category: preselectedCategory,
            is_hidden: false, 
            hide_url: false, 
            open_in_new_tab: false, 
            custom_favicon: ''
        });
        setProtocol('https://');
        setRawUrlInput('');
        setIsInternalDomain(false);
        setIsModalOpen(true);
    };

    const openEditLinkModal = (link: LinkItem, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isEditMode) return;

        setFormData({ ...link });
        const linkUrl = link.url || '';
        setProtocol(linkUrl.startsWith('http://') ? 'http://' : 'https://');
        const host = currentDomain || (typeof window !== 'undefined' ? window.location.host : 'ntmbase.ru');
        
        if (linkUrl && (linkUrl.includes(host) || linkUrl.startsWith('/') || !linkUrl.startsWith('http'))) {
            setIsInternalDomain(true);
            setRawUrlInput(linkUrl.replace(/^https?:\/\/[^\/]+\/?/, '').replace(/^\//, ''));
        } else {
            setIsInternalDomain(false);
            setRawUrlInput(linkUrl ? linkUrl.replace(/^https?:\/\//i, '') : '');
        }
        setIsModalOpen(true);
    };
    
    const getFaviconHtml = (link: LinkItem) => {
        if (link.custom_favicon) {
            return <img src={`/${link.custom_favicon}`} className="w-10 h-10 rounded-xl object-cover" alt="" />;
        }
        return <i className="bi bi-link-45deg text-xl"></i>;
    };

    const groupedLinks = getGroupedLinks();

    if (isAuthChecking || isLoading) {
        return (
            <div className="flex flex-col min-h-screen bg-[#f8fafc]">
                <Header isAdmin={true} username="Администратор" />
                <div className="max-w-[1400px] w-full mx-auto px-6 py-12 flex-grow flex items-center justify-center">
                    <div className="text-center py-12 text-slate-400 font-medium flex items-center gap-2">
                        <i className="bi bi-shield-lock text-xl text-indigo-500 animate-pulse"></i>
                        <span>{isAuthChecking ? 'Проверка прав доступа...' : 'Загрузка быстрых ссылок...'}</span>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    const renderCategories = () => {
        if (categoriesList.length === 0) {
            return (
                <div className="text-center py-12 text-slate-400 bg-white rounded-[24px] border border-slate-200/80 shadow-sm p-6">
                    <i className="bi bi-folder-open text-4xl mx-auto mb-3 opacity-30 block"></i>
                    <p className="text-sm font-medium">Нет категорий. Добавьте первую ссылку.</p>
                </div>
            );
        }

        if (!isEditMode) {
            return categoriesList.map((catItem) => {
                const catName = catItem.name;
                const catLinks = groupedLinks[catName] || [];
                if (catLinks.length === 0) return null;
                
                return (
                    <div key={catItem.id} className="category-section p-6" data-category={catName}>
                        <div className="category-title cursor-default">
                            <div className="flex items-center gap-2 flex-1">
                                <i className="bi bi-folder2-open category-title-icon"></i>
                                <span className="cat-display-text">{catName}</span>
                            </div>
                        </div>
                        <div className="grid tiles-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-4">
                            {catLinks.map((link) => (
                                <a
                                    key={link.id}
                                    href={link.url || '#'}
                                    target={link.open_in_new_tab ? "_blank" : "_self"}
                                    className={`tile group block ${link.is_hidden ? 'tile-hidden' : ''}`}
                                    rel="noopener noreferrer"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="tile-icon bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                            {getFaviconHtml(link)}
                                        </div>
                                        <div className="overflow-hidden flex-1 pr-14">
                                            <div className="tile-title flex items-center gap-1">
                                                <span>{link.title || 'Без названия'}</span>
                                            </div>
                                            <div className={`tile-desc ${link.hide_url ? 'url-text-hidden' : ''}`}>
                                                {link.url ? link.url.replace(/^https?:\/\/(www\.)?/, '') : 'Без URL'}
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                );
            }).filter(Boolean);
        }

        return (
            <ReactSortable
                list={categoriesList}
                setList={handleCategoriesSort}
                animation={250}
                ghostClass="sortable-ghost"
                chosenClass="sortable-chosen"
                dragClass="sortable-drag"
                filter=".no-drag, .delete-cat-btn-new, .inline-cat-input, .inline-cat-save, .inline-cat-cancel"
                disabled={!isEditMode}
                className="space-y-8"
            >
                {categoriesList.map((catItem) => {
                    const catName = catItem.name;
                    const catLinks = groupedLinks[catName] || [];
                    
                    return (
                        <div key={catItem.id} className="category-section p-6 category-section-edit" data-category={catName}>
                            <div className="category-title cursor-grab">
                                <div className="flex items-center gap-2 flex-1">
                                    <div className="drag-handle">
                                        <i className="bi bi-grip-vertical text-sm"></i>
                                    </div>
                                    <i className="bi bi-folder2-open category-title-icon"></i>
                                    {editingCategoryName === catName ? (
                                        <div className="flex items-center gap-2 flex-1 no-drag">
                                            <input
                                                type="text"
                                                className="inline-cat-input"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') renameCategory(catName, newCategoryName);
                                                    if (e.key === 'Escape') setEditingCategoryName(null);
                                                }}
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <button className="inline-cat-save no-drag" onClick={(e) => { e.stopPropagation(); renameCategory(catName, newCategoryName); }}>
                                                <i className="bi bi-check-lg"></i>
                                            </button>
                                            <button className="inline-cat-cancel no-drag" onClick={(e) => { e.stopPropagation(); setEditingCategoryName(null); }}>
                                                <i className="bi bi-x-lg"></i>
                                            </button>
                                        </div>
                                    ) : (
                                        <span 
                                            className="cat-display-text cat-clickable-zone"
                                            onDoubleClick={() => {
                                                setEditingCategoryName(catName);
                                                setNewCategoryName(catName);
                                            }}
                                        >
                                            {catName}
                                        </span>
                                    )}
                                </div>
                                {isEditMode && (
                                    <div className="no-drag">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setCategoryToDelete(catName); setIsConfirmDeleteOpen(true); }}
                                            className="delete-cat-btn-new"
                                            title="Удалить раздел"
                                        >
                                            <i className="bi bi-x-lg"></i>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {catLinks.length > 0 && (
                                <ReactSortable
                                    list={catLinks}
                                    setList={(newList) => handleTilesSort(newList, catName)}
                                    group={{ name: 'shared_tiles', pull: true, put: true }}
                                    disabled={!isEditMode}
                                    animation={200}
                                    ghostClass="sortable-ghost"
                                    chosenClass="sortable-chosen"
                                    filter=".delete-tile-btn, .edit-tile-pencil-btn, .tile-3d-plus"
                                    className="grid tiles-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-4"
                                >
                                    {catLinks.map((link) => (
                                        <a
                                            key={link.id}
                                            href={link.url || '#'}
                                            target={link.open_in_new_tab ? "_blank" : "_self"}
                                            className={`tile group block ${link.is_hidden ? 'hidden-tile' : ''}`}
                                            onClick={(e) => { e.preventDefault(); }}
                                            rel="noopener noreferrer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="tile-icon bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                                    {getFaviconHtml(link)}
                                                </div>
                                                <div className="overflow-hidden flex-1 pr-14">
                                                    <div className="tile-title flex items-center gap-1">
                                                        <span>{link.title || 'Без названия'}</span>
                                                        {link.is_hidden && <i className="bi bi-eye-slash text-slate-400 text-xs" title="Скрытая плитка"></i>}
                                                    </div>
                                                    <div className={`tile-desc ${link.hide_url ? 'url-text-hidden' : ''}`}>
                                                        {link.url ? link.url.replace(/^https?:\/\/(www\.)?/, '') : 'Без URL'}
                                                    </div>
                                                </div>
                                            </div>
                                            <>
                                                <span className="edit-tile-pencil-btn" onClick={(e) => openEditLinkModal(link, e)}><i className="bi bi-pencil"></i></span>
                                                <span className="delete-tile-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteLink(link.id); }}><i className="bi bi-x-lg"></i></span>
                                            </>
                                        </a>
                                    ))}
                                    <div className="tile-3d-plus generic-no-drag" onClick={() => openAddLinkModal(catName)}>
                                        <div className="tile-3d-plus-icon-circle"><i className="bi bi-plus-lg"></i></div>
                                    </div>
                                </ReactSortable>
                            )}
                            
                            {catLinks.length === 0 && (
                                <div className="tile-3d-plus generic-no-drag mt-4" onClick={() => openAddLinkModal(catName)}>
                                    <div className="tile-3d-plus-icon-circle"><i className="bi bi-plus-lg"></i></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </ReactSortable>
        );
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] relative">
            <Header isAdmin={true} username="Администратор" />

            <div className={`fixed bottom-6 right-6 z-[100000] pointer-events-none transition-all duration-300 transform ${toastMessage ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95'}`}>
                <div className="bg-slate-900/95 backdrop-blur-xl text-white px-4 py-3 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.18)] border border-slate-700/40 flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <i className="bi bi-check-lg text-sm"></i>
                    </div>
                    <span className="text-xs font-semibold text-slate-100 tracking-wide">{toastMessage}</span>
                </div>
            </div>

            <div className="max-w-[1400px] w-full mx-auto px-6 py-12 flex-grow">
                <header className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight page-title">Мои быстрые ссылки</h1>
                        <p className="text-xs text-slate-400 font-medium mt-1">Всего ссылок: {links.length}</p>
                    </div>
                </header>

                <hr className="header-divider" />

                <div id="categories-container" className="space-y-8 mt-4">
                    {renderCategories()}
                </div>

                {isEditMode && (
                    <div className="add-cat-inline cursor-pointer" onClick={() => addCategory()}>
                        <i className="bi bi-plus-circle opacity-50 text-xl"></i> Добавить новый раздел
                    </div>
                )}
            </div>

            <Footer />

            <div className={`ap-trigger group ${isEditMode ? 'active' : ''}`} onClick={handleToggleEditMode} title="Режим редактирования">
                <i className="bi bi-pencil-square transition-transform duration-300 group-hover:rotate-12"></i>
            </div>

            <div className={`ap-panel p-4 bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-[24px] shadow-[0_12px_40px_rgba(15,23,42,0.12)] space-y-3 min-w-[200px] transition-all duration-300 ${isEditMode ? 'active' : ''}`}>
                <div className="flex items-center justify-between px-1 text-[10px] font-black tracking-widest text-slate-400 uppercase select-none">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-slate-600 font-bold">Режим правки</span>
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/60 uppercase tracking-wider">
                        Активен
                    </span>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6 transition-all" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white/95 backdrop-blur-2xl w-full max-w-2xl rounded-[32px] p-8 md:p-10 shadow-2xl space-y-6 border border-slate-100 my-auto transform transition-all max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <i className="bi bi-link-45deg text-2xl"></i>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">{formData.id ? 'Параметры ссылки' : 'Новая быстрая ссылка'}</h3>
                                    <p className="text-xs text-slate-400 font-medium">Редактирование адреса и флагов видимости</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition-all flex items-center justify-center cursor-pointer">✕</button>
                        </div>

                        <form onSubmit={handleSaveLink} className="space-y-5">
                            <div onClick={() => { setIsInternalDomain(!isInternalDomain); setRawUrlInput(''); }} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200/80 rounded-2xl cursor-pointer transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${isInternalDomain ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                        <i className="bi bi-globe"></i>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-800 block">Ссылка на этом домене</span>
                                        <span className="text-[11px] text-slate-400 font-medium">Автоматически подставит {currentDomain || 'ntmbase.ru'}</span>
                                    </div>
                                </div>
                                <div className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${isInternalDomain ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${isInternalDomain ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Протокол и URL Адрес</label>
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:border-indigo-500 focus-within:bg-white transition-all">
                                    <select value={protocol} onChange={(e) => setProtocol(e.target.value as 'http://' | 'https://')} className="px-3 py-3 text-xs font-bold text-slate-700 bg-slate-100 border-r border-slate-200 focus:outline-none cursor-pointer">
                                        <option value="https://">https://</option>
                                        <option value="http://">http://</option>
                                    </select>
                                    {isInternalDomain && <span className="px-3 py-3 text-xs font-bold text-slate-400 bg-slate-100 border-r border-slate-200 select-none">{currentDomain || 'ntmbase.ru'}/</span>}
                                    <input required type="text" placeholder={isInternalDomain ? "voice" : "google.com"} className="w-full px-4 py-3 text-xs font-semibold text-slate-800 bg-transparent focus:outline-none placeholder-slate-400" value={rawUrlInput} onChange={e => setRawUrlInput(e.target.value)} />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Название ссылки</label>
                                <input required type="text" placeholder="Например: Анализатор звонков" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Раздел плиток</label>
                                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                    {categoriesList.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                                </select>
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 pt-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Настройки отображения</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div onClick={() => setFormData(prev => ({ ...prev, is_hidden: !prev.is_hidden }))} className="flex items-center justify-between p-3 bg-white border border-slate-200/80 rounded-xl cursor-pointer hover:border-emerald-300 transition-all select-none">
                                        <span className="text-xs font-bold text-slate-700">Плитка видима</span>
                                        <div className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 ${!formData.is_hidden ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${!formData.is_hidden ? 'translate-x-4.5' : 'translate-x-0'}`} />
                                        </div>
                                    </div>
                                    <div onClick={() => setFormData(prev => ({ ...prev, hide_url: !prev.hide_url }))} className="flex items-center justify-between p-3 bg-white border border-slate-200/80 rounded-xl cursor-pointer hover:border-emerald-300 transition-all select-none">
                                        <span className="text-xs font-bold text-slate-700">Адрес видим</span>
                                        <div className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 ${!formData.hide_url ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${!formData.hide_url ? 'translate-x-4.5' : 'translate-x-0'}`} />
                                        </div>
                                    </div>
                                </div>
                                <div onClick={() => setFormData(prev => ({ ...prev, open_in_new_tab: !prev.open_in_new_tab }))} className="flex items-center justify-between p-3 bg-white border border-slate-200/80 rounded-xl cursor-pointer hover:border-emerald-300 transition-all select-none">
                                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><i className="bi bi-box-arrow-up-right text-slate-400"></i> Открывать в новой вкладке</span>
                                    <div className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 ${formData.open_in_new_tab ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${formData.open_in_new_tab ? 'translate-x-4.5' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer">Отмена</button>
                                <button type="submit" disabled={isSavingLink} className="px-8 py-3 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                                    {isSavingLink ? <><i className="bi bi-arrow-repeat animate-spin"></i> Сохранение...</> : 'Сохранить'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className={`ap-modal-overlay ${isConfirmDeleteOpen ? 'active' : ''}`} style={{ zIndex: 9999 }} onClick={() => setIsConfirmDeleteOpen(false)}>
                <div className="ap-modal-box confirm-del-box" onClick={e => e.stopPropagation()}>
                    <div className="confirm-del-icon"><i className="bi bi-exclamation-triangle"></i></div>
                    <h3 className="text-lg font-black text-slate-800">Удалить раздел?</h3>
                    <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed">Это действие удалит весь выбранный раздел и все плитки внутри него.</p>
                    <div className="flex gap-3 mt-6 justify-center">
                        <button type="button" className="px-5 h-10 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer hover:bg-slate-200" onClick={() => setIsConfirmDeleteOpen(false)}>Отмена</button>
                        <button type="button" className="px-5 h-10 rounded-xl bg-rose-500 text-white font-bold text-xs cursor-pointer hover:bg-rose-600 shadow-lg shadow-rose-500/20" onClick={() => deleteCategory(categoryToDelete)}>Удалить раздел</button>
                    </div>
                </div>
            </div>
        </div>
    );
}