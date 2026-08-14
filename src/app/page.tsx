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
    custom_favicon?: string;
    mtime?: number;
    chosen?: boolean;
    selected?: boolean;
}

interface CategoryItem {
    id: string;
    name: string;
    position?: number;
    chosen?: boolean;
    selected?: boolean;
}

export default function LinksPage() {
    const router = useRouter();
    const [links, setLinks] = useState<LinkItem[]>([]);
    const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingLink, setIsSavingLink] = useState(false);
    
    const [isEditMode, setIsEditMode] = useState(false); 
    
    // Модалка для одиночного добавления/редактирования
    const [isModalOpen, setIsModalOpen] = useState(false);
    // Модалка "Редактировать все ссылки и разделы"
    const [isAllLinksModalOpen, setIsAllLinksModalOpen] = useState(false);
    const [allLinksBuffer, setAllLinksBuffer] = useState<LinkItem[]>([]);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
    const [newCatInManager, setNewCatInManager] = useState('');

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
        id: '', title: '', url: '', category: 'Разное',
        is_hidden: false, hide_url: false, open_in_new_tab: false, custom_favicon: ''
    });

    const saveCatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingUpdatesRef = useRef<Record<string, LinkItem[]>>({});
    const applyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialLoadRef = useRef(true);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    useEffect(() => {
        const checkUserRole = async () => {
            try {
                const res = await fetch('/api/auth');
                const data = await res.json();

                // Если не авторизован -> на логин
                if (!res.ok || !data.authenticated) {
                    router.replace('/login');
                    return;
                }

                // Если авторизован, но роль не 'admin' (например 'manager') -> на /education
                if (data.user?.role !== 'admin') {
                    router.replace('/education');
                }
            } catch (error) {
                console.error('Ошибка проверки прав:', error);
            }
        };

        checkUserRole();
    }, [router]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentDomain(window.location.host);
        }
    }, []);

    const fetchLinks = async (isBackground = false, skipCategories = false) => {
        if (!isBackground) setIsLoading(true);
        try {
            const res = await fetch('/api/links').then(r => r.json());
            
            const cleanCategoryName = (val: any): string => {
                if (!val) return 'Разное';
                let str = String(val).trim();
                if (str.startsWith('{') && str.endsWith('}')) {
                    try {
                        const parsed = JSON.parse(str);
                        return parsed.NAME || parsed.name || str;
                    } catch { return str; }
                }
                return str;
            };

            const rawLinks = res.links || [];
            const cleanLinks = rawLinks
                .filter((link: any) => link !== null && link !== undefined)
                .map((rest: any) => ({
                    ...rest,
                    is_hidden: Boolean(Number(rest.is_hidden) === 1 || rest.is_hidden === true || rest.is_hidden === 'true'),
                    hide_url: Boolean(Number(rest.hide_url) === 1 || rest.hide_url === true || rest.hide_url === 'true'),
                    open_in_new_tab: Boolean(Number(rest.open_in_new_tab) === 1 || rest.open_in_new_tab === true || rest.open_in_new_tab === 'true'),
                    category: cleanCategoryName(rest.category)
                }));
            
            setLinks(cleanLinks);

            if (!skipCategories) {
                const rawCats = res.categories || [];
                
                if (rawCats.length > 0) {
                    const sortedCats = [...rawCats].sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
                    setCategoriesList(
                        sortedCats.map((cat: any) => ({ 
                            id: `cat_${encodeURIComponent(cat.name)}`, 
                            name: cat.name,
                            position: cat.position || 0
                        }))
                    );
                } else {
                    const categoriesFromLinks = new Set<string>();
                    cleanLinks.forEach((link: LinkItem) => {
                        if (link.category) categoriesFromLinks.add(link.category);
                    });
                    
                    const finalOrder = Array.from(categoriesFromLinks).sort();
                    setCategoriesList(
                        finalOrder.map((cat, idx) => ({ 
                            id: `cat_${encodeURIComponent(cat)}`, 
                            name: cat,
                            position: idx
                        }))
                    );
                    
                    if (isInitialLoadRef.current && finalOrder.length > 0) {
                        isInitialLoadRef.current = false;
                        await saveCategoriesOrder(finalOrder);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки:', error);
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLinks();
    }, []);

    const getGroupedLinks = useCallback(() => {
        const grouped: Record<string, LinkItem[]> = {};
        categoriesList.forEach(cat => { grouped[cat.name] = []; });
        links
            .filter(link => link !== null && link !== undefined)
            .forEach(link => {
                const catName = link.category || 'Разное';
                if (!grouped[catName]) grouped[catName] = [];
                if (isEditMode || !link.is_hidden) {
                    grouped[catName].push(link);
                }
            });
        return grouped;
    }, [links, categoriesList, isEditMode]);

    const saveCategoriesOrder = useCallback(async (newOrder: string[]) => {
        try {
            const categoriesWithPosition = newOrder.map((name, index) => ({
                name,
                position: index
            }));
            
            const res = await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'save_categories', 
                    payload: { categories: categoriesWithPosition } 
                })
            });
            
            if (!res.ok) {
                console.error('❌ Ошибка сохранения порядка категорий:', await res.text());
            }
        } catch (error) {
            console.error('❌ Ошибка сети при сохранении категорий:', error);
        }
    }, []);

    const saveLinksOrder = useCallback(async (newLinks: LinkItem[]) => {
        const clean = newLinks.map(({ chosen, selected, ...rest }) => rest);
        try {
            await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_links', payload: { links: clean } })
            });
        } catch (error) {
            console.error('❌ Ошибка сохранения порядка ссылок:', error);
        }
    }, []);

    useEffect(() => {
        if (isEditMode) {
            document.body.classList.add('admin-panel-active');
            document.body.classList.add('drag-mode-active');
        } else {
            document.body.classList.remove('admin-panel-active');
            document.body.classList.remove('drag-mode-active');
        }
    }, [isEditMode]);

    const handleToggleEditMode = () => {
        setIsEditMode(!isEditMode);
    };

    const handleCategoriesSort = (newList: CategoryItem[]) => {
        setCategoriesList(newList);

        if (saveCatTimeoutRef.current) clearTimeout(saveCatTimeoutRef.current);
        saveCatTimeoutRef.current = setTimeout(() => {
            const newOrder = newList.map(item => item.name);
            saveCategoriesOrder(newOrder);
            saveCatTimeoutRef.current = null;
        }, 500);
    };

    const handleTilesSort = (newList: LinkItem[], categoryName: string) => {
        const filteredList = newList.filter(link => link !== null && link !== undefined);
        
        pendingUpdatesRef.current[categoryName] = filteredList.map(link => ({
            ...link,
            category: categoryName
        }));

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

    const handleSaveLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingLink(true);

        let cleanPathOrUrl = rawUrlInput.trim().replace(/^https?:\/\//i, '');
        const host = currentDomain || 'ntmbase.ru';

        let finalUrl = '';
        if (isInternalDomain) {
            const cleanPath = cleanPathOrUrl.replace(new RegExp(`^${host}/?`), '').replace(/^\//, '');
            finalUrl = `${protocol}${host}/${cleanPath}`;
        } else {
            finalUrl = `${protocol}${cleanPathOrUrl}`;
        }

        const payloadToSave: LinkItem = {
            id: formData.id || `b_${Date.now()}`,
            title: formData.title,
            url: finalUrl,
            category: formData.category || 'Разное',
            is_hidden: Boolean(formData.is_hidden),
            hide_url: Boolean(formData.hide_url),
            open_in_new_tab: Boolean(formData.open_in_new_tab),
            custom_favicon: formData.custom_favicon || ''
        };

        setLinks(prev => {
            const exists = prev.some(l => l.id === payloadToSave.id);
            if (exists) return prev.map(l => l.id === payloadToSave.id ? payloadToSave : l);
            return [...prev, payloadToSave];
        });

        setIsModalOpen(false);

        try {
            const res = await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_link', payload: payloadToSave })
            });

            if (res.ok) {
                showToast('✅ Плитка успешно сохранена');
                await fetchLinks(true, true);
            } else {
                showToast('⚠️ Ошибка сохранения');
            }
        } catch (error) {
            console.error('Error saving link:', error);
            showToast('❌ Ошибка сети');
        } finally {
            setIsSavingLink(false);
        }
    };

    const deleteLink = async (id: string) => {
        if (!confirm('Удалить эту ссылку?')) return;
        setLinks(prev => prev.filter(l => l.id !== id));
        try {
            await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_link', payload: { id } })
            });
            showToast('🗑️ Ссылка удалена');
            await fetchLinks(true, true);
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
            
            const updatedList = categoriesList.filter(c => c.name !== category);
            setCategoriesList(updatedList);
            await saveCategoriesOrder(updatedList.map(c => c.name));

            setIsConfirmDeleteOpen(false);
            showToast('🗑️ Раздел удален');
            await fetchLinks(true, true);
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };

    const addCategory = async (customCatName?: string) => {
        if (!isEditMode) return;
        const catName = customCatName || prompt('Введите название нового раздела:');
        if (!catName || !catName.trim()) return;
        const cleanCatName = catName.trim();
        
        const newLink: LinkItem = {
            id: `b_${Date.now()}`,
            title: 'Новая ссылка',
            url: '#',
            category: cleanCatName,
            is_hidden: true,
            hide_url: false,
            open_in_new_tab: false
        };

        try {
            await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_link', payload: newLink })
            });

            if (!categoriesList.find(c => c.name === cleanCatName)) {
                const newList = [...categoriesList, { id: `cat_${encodeURIComponent(cleanCatName)}`, name: cleanCatName }];
                setCategoriesList(newList);
                await saveCategoriesOrder(newList.map(c => c.name));
            }

            showToast('📁 Раздел создан');
            await fetchLinks(true, true);
        } catch (error) {
            console.error('Error adding category:', error);
        }
    };

    const renameCategory = async (oldName: string, newName: string) => {
        if (!isEditMode) return;
        if (!newName || newName === oldName) {
            setEditingCategoryName(null);
            return;
        }
        try {
            await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'edit_category', payload: { old_category: oldName, new_category: newName } })
            });

            const newList = categoriesList.map(c => c.name === oldName ? { ...c, name: newName } : c);
            setCategoriesList(newList);
            await saveCategoriesOrder(newList.map(c => c.name));

            setEditingCategoryName(null);
            showToast('✏️ Раздел переименован');
            await fetchLinks(true, true);
        } catch (error) {
            console.error('Error renaming category:', error);
        }
    };

    const openAddLinkModal = (preselectedCategory = 'Разное') => {
        if (!isEditMode) return;
        setFormData({
            id: `b_${Date.now()}`, title: '', url: '', category: preselectedCategory,
            is_hidden: false, hide_url: false, open_in_new_tab: false, custom_favicon: ''
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

        const normalizedLink: LinkItem = {
            ...link,
            is_hidden: Boolean(Number(link.is_hidden) === 1 || link.is_hidden === true || (link.is_hidden as any) === 'true'),
            hide_url: Boolean(Number(link.hide_url) === 1 || link.hide_url === true || (link.hide_url as any) === 'true'),
            open_in_new_tab: Boolean(Number(link.open_in_new_tab) === 1 || link.open_in_new_tab === true || (link.open_in_new_tab as any) === 'true'),
        };
        
        setFormData(normalizedLink);
        
        const linkUrl = link.url || '';
        if (linkUrl.startsWith('http://')) {
            setProtocol('http://');
        } else {
            setProtocol('https://');
        }

        const host = currentDomain || (typeof window !== 'undefined' ? window.location.host : 'ntmbase.ru');
        if (linkUrl && (linkUrl.includes(host) || linkUrl.startsWith('/') || !linkUrl.startsWith('http'))) {
            setIsInternalDomain(true);
            const path = linkUrl.replace(/^https?:\/\/[^\/]+\/?/, '').replace(/^\//, '');
            setRawUrlInput(path);
        } else {
            setIsInternalDomain(false);
            setRawUrlInput(linkUrl ? linkUrl.replace(/^https?:\/\//i, '') : '');
        }
        setIsModalOpen(true);
    };

    // Открытие модалки с отключением админки
    const handleOpenAllLinksManager = () => {
        setIsEditMode(false); // Закрываем режим редактирования/плашку админки
        setAllLinksBuffer(JSON.parse(JSON.stringify(links)));
        setSelectedCategoryFilter('ALL');
        setIsAllLinksModalOpen(true); // Открываем только модалку
    };

    const handleBufferLinkChange = (id: string, field: keyof LinkItem, value: any) => {
        setAllLinksBuffer(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleAddBufferLink = () => {
        const defaultCat = selectedCategoryFilter !== 'ALL' ? selectedCategoryFilter : (categoriesList[0]?.name || 'Разное');
        const newLink: LinkItem = {
            id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            title: 'Новая ссылка',
            url: 'https://',
            category: defaultCat,
            is_hidden: false,
            hide_url: false,
            open_in_new_tab: true
        };
        setAllLinksBuffer(prev => [newLink, ...prev]);
    };

    const handleRemoveBufferLink = (id: string) => {
        setAllLinksBuffer(prev => prev.filter(item => item.id !== id));
    };

    const handleCreateCategoryFromManager = async () => {
        if (!newCatInManager.trim()) return;
        const catName = newCatInManager.trim();
        if (!categoriesList.find(c => c.name === catName)) {
            const newList = [...categoriesList, { id: `cat_${encodeURIComponent(catName)}`, name: catName }];
            setCategoriesList(newList);
            await saveCategoriesOrder(newList.map(c => c.name));
            showToast(`📁 Раздел "${catName}" создан`);
        }
        setNewCatInManager('');
    };

    const handleSaveAllLinks = async () => {
        setIsSavingLink(true);
        try {
            await saveLinksOrder(allLinksBuffer);
            setLinks(allLinksBuffer);
            setIsAllLinksModalOpen(false);
            showToast('✅ Все ссылки и разделы обновлены!');
            await fetchLinks(true, true);
        } catch (error) {
            console.error('Error saving all links:', error);
            showToast('❌ Ошибка сохранения данных');
        } finally {
            setIsSavingLink(false);
        }
    };

    const getFaviconHtml = (link: LinkItem) => {
        if (link.custom_favicon) {
            return <img src={`/${link.custom_favicon}`} className="w-10 h-10 rounded-xl object-cover" alt="" />;
        }
        return <i className="bi bi-link-45deg text-xl"></i>;
    };

    const groupedLinks = getGroupedLinks();

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen bg-[#f8fafc]">
                <Header isAdmin={true} username="Администратор" />
                <div className="max-w-[1400px] w-full mx-auto px-6 py-12 flex-grow">
                    <div className="text-center py-12 text-slate-400">⏳ Загрузка плиток...</div>
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
                const catLinks = (groupedLinks[catName] || []).filter(link => link !== null && link !== undefined);
                
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
                    const catLinks = (groupedLinks[catName] || []).filter(link => link !== null && link !== undefined);
                    
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

    const filteredBufferLinks = allLinksBuffer.filter(l => 
        selectedCategoryFilter === 'ALL' ? true : l.category === selectedCategoryFilter
    );

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] relative">
            
            <Header isAdmin={true} username="Администратор" />

            {toastMessage && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] animate-bounce pointer-events-none">
                    <div className="bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-700/50 flex items-center gap-2">
                        <span>{toastMessage}</span>
                    </div>
                </div>
            )}

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

            {/* Иконка переключения режима админки */}
            <div className={`ap-trigger group ${isEditMode ? 'active' : ''}`} onClick={handleToggleEditMode} title="Режим редактирования">
                <i className="bi bi-pencil-square transition-transform duration-300 group-hover:rotate-12"></i>
            </div>

            <div className={`ap-panel p-4 bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-[24px] shadow-[0_12px_40px_rgba(15,23,42,0.12)] space-y-3 min-w-[230px] transition-all duration-300 ${isEditMode ? 'active' : ''}`}>
    {/* Строка 1: Состояние режима */}
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

    {/* Строка 2: Кнопка "Редактор ссылок" */}
    <button
        type="button"
        onClick={handleOpenAllLinksManager}
        className="group relative w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 border border-indigo-400/20 cursor-pointer overflow-hidden"
    >
        {/* Анимация легкого блика при наведении */}
        <div className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>

        <i className="bi bi-sliders text-sm transition-transform group-hover:rotate-180 duration-300"></i>
        <span>Редактор ссылок</span>
    </button>
</div>

            {/* Модалка одиночного редактирования/создания ссылки */}
            {isModalOpen && (
                <div 
                    className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6 transition-all" 
                    onClick={() => setIsModalOpen(false)}
                >
                    <div 
                        className="bg-white/95 backdrop-blur-2xl w-full max-w-2xl rounded-[32px] p-8 md:p-10 shadow-2xl space-y-6 border border-slate-100 my-auto transform transition-all max-h-[90vh] overflow-y-auto" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <i className="bi bi-link-45deg text-2xl"></i>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">
                                        {formData.id ? 'Параметры ссылки' : 'Новая быстрая ссылка'}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium">Редактирование адреса и флагов видимости</p>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)} 
                                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition-all flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveLink} className="space-y-5">
                            <div 
                                onClick={() => {
                                    setIsInternalDomain(!isInternalDomain);
                                    setRawUrlInput('');
                                }}
                                className="flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200/80 rounded-2xl cursor-pointer transition-all"
                            >
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
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                                    Протокол и URL Адрес
                                </label>
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:border-indigo-500 focus-within:bg-white transition-all">
                                    <select
                                        value={protocol}
                                        onChange={(e) => setProtocol(e.target.value as 'http://' | 'https://')}
                                        className="px-3 py-3 text-xs font-bold text-slate-700 bg-slate-100 border-r border-slate-200 focus:outline-none cursor-pointer"
                                    >
                                        <option value="https://">https://</option>
                                        <option value="http://">http://</option>
                                    </select>

                                    {isInternalDomain && (
                                        <span className="px-3 py-3 text-xs font-bold text-slate-400 bg-slate-100 border-r border-slate-200 select-none">
                                            {currentDomain || 'ntmbase.ru'}/
                                        </span>
                                    )}

                                    <input
                                        required
                                        type="text"
                                        placeholder={isInternalDomain ? "voice" : "google.com"}
                                        className="w-full px-4 py-3 text-xs font-semibold text-slate-800 bg-transparent focus:outline-none placeholder-slate-400"
                                        value={rawUrlInput}
                                        onChange={e => setRawUrlInput(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Название ссылки</label>
                                <input 
                                    required 
                                    type="text" 
                                    placeholder="Например: Анализатор звонков" 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all" 
                                    value={formData.title} 
                                    onChange={e => setFormData({...formData, title: e.target.value})} 
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Раздел плиток</label>
                                <select 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all" 
                                    value={formData.category} 
                                    onChange={e => setFormData({...formData, category: e.target.value})}
                                >
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
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-all">
                                    Отмена
                                </button>
                                <button type="submit" disabled={isSavingLink} className="px-8 py-3 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 flex items-center gap-2">
                                    {isSavingLink ? <><i className="bi bi-arrow-repeat animate-spin"></i> Сохранение...</> : 'Сохранить'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Модалка массового редактирования всех ссылок и разделов */}
            {isAllLinksModalOpen && (
                <div 
                    className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 transition-all"
                    onClick={() => setIsAllLinksModalOpen(false)}
                >
                    <div 
                        className="bg-white w-full max-w-6xl h-[90vh] rounded-[28px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden relative z-[10000]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Хедер модалки */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-lg shadow-indigo-600/30">
                                    <i className="bi bi-collection-fill"></i>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800">Редактор всех ссылок и разделов</h3>
                                    <p className="text-xs text-slate-400 font-medium">Управление плитками, протоколами и категориями в одном окне</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button 
                                    type="button" 
                                    onClick={handleAddBufferLink}
                                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                                >
                                    <i className="bi bi-plus-lg"></i> Добавить ссылку
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setIsAllLinksModalOpen(false)} 
                                    className="w-10 h-10 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-sm transition-all flex items-center justify-center"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Фильтры и категории */}
                        <div className="px-6 py-4 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Раздел:</span>
                                <button
                                    onClick={() => setSelectedCategoryFilter('ALL')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${selectedCategoryFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    Все ({allLinksBuffer.length})
                                </button>
                                {categoriesList.map(cat => {
                                    const count = allLinksBuffer.filter(l => l.category === cat.name).length;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategoryFilter(cat.name)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${selectedCategoryFilter === cat.name ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                        >
                                            {cat.name} ({count})
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Новый раздел..."
                                    className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                                    value={newCatInManager}
                                    onChange={e => setNewCatInManager(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleCreateCategoryFromManager(); }}
                                />
                                <button
                                    type="button"
                                    onClick={handleCreateCategoryFromManager}
                                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all"
                                >
                                    + Создать
                                </button>
                            </div>
                        </div>

                        {/* Список ссылок */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
                            {filteredBufferLinks.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <i className="bi bi-inbox text-4xl block mb-2 opacity-40"></i>
                                    В этом разделе пока нет ссылок
                                </div>
                            ) : (
                                filteredBufferLinks.map((item, idx) => (
                                    <div key={item.id} className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:border-indigo-300 transition-all flex flex-col md:flex-row items-stretch md:items-center gap-4">
                                        <div className="text-xs font-bold text-slate-300 w-6 text-center select-none hidden md:block">
                                            #{idx + 1}
                                        </div>

                                        <div className="flex-1 min-w-[180px]">
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Название</label>
                                            <input
                                                type="text"
                                                value={item.title}
                                                onChange={e => handleBufferLinkChange(item.id, 'title', e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                                            />
                                        </div>

                                        <div className="flex-[2] min-w-[280px]">
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Полный URL адрес (http:// или https://)</label>
                                            <input
                                                type="text"
                                                value={item.url}
                                                onChange={e => handleBufferLinkChange(item.id, 'url', e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-indigo-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                                            />
                                        </div>

                                        <div className="w-full md:w-44">
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Раздел</label>
                                            <select
                                                value={item.category}
                                                onChange={e => handleBufferLinkChange(item.id, 'category', e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                                            >
                                                {categoriesList.map(cat => (
                                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 md:pt-4">
                                            <button
                                                type="button"
                                                title={item.is_hidden ? "Плитка скрыта" : "Плитка видима"}
                                                onClick={() => handleBufferLinkChange(item.id, 'is_hidden', !item.is_hidden)}
                                                className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${!item.is_hidden ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                                            >
                                                <i className={`bi ${!item.is_hidden ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`}></i>
                                            </button>

                                            <button
                                                type="button"
                                                title={item.open_in_new_tab ? "Открывается в новой вкладке" : "Открывается в текущей"}
                                                onClick={() => handleBufferLinkChange(item.id, 'open_in_new_tab', !item.open_in_new_tab)}
                                                className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${item.open_in_new_tab ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                                            >
                                                <i className="bi bi-box-arrow-up-right"></i>
                                            </button>

                                            <button
                                                type="button"
                                                title="Удалить ссылку"
                                                onClick={() => handleRemoveBufferLink(item.id)}
                                                className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white transition-all ml-auto"
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Футер */}
                        <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-medium">Всего в редакторе: {allLinksBuffer.length} шт.</span>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAllLinksModalOpen(false)}
                                    className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    disabled={isSavingLink}
                                    onClick={handleSaveAllLinks}
                                    className="px-8 py-3 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSavingLink ? <><i className="bi bi-arrow-repeat animate-spin"></i> Сохранение...</> : 'Сохранить все изменения'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Подтверждение удаления раздела */}
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