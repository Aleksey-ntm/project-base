"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { ReactSortable } from 'react-sortablejs';
import Header from './components/Header';
import Footer from './components/Footer';

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
    chosen?: boolean;
    selected?: boolean;
}

export default function LinksPage() {
    const [links, setLinks] = useState<LinkItem[]>([]);
    const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isPanelOpen, setIsPanelOpen] = useState(false); 
    const [isEditMode, setIsEditMode] = useState(false); 
    const [isDragMode, setIsDragMode] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState('');
    const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    
    const [formData, setFormData] = useState<LinkItem>({
        id: '', title: '', url: '', category: 'Разное',
        is_hidden: false, hide_url: false, open_in_new_tab: false, custom_favicon: ''
    });

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const saveCatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ===== ЗАГРУЗКА ДАННЫХ ИЗ БД =====
    const fetchLinks = async () => {
        try {
            setIsLoading(true);

            const [linksRes, catsRes] = await Promise.all([
                fetch('/api/links').then(r => r.json()).catch(() => []),
                fetch('/api/categories').then(r => r.json()).catch(() => [])
            ]);

            // Вспомогательная функция распарсить имя, если пришел JSON {"NAME":"..."}
            const cleanCategoryName = (val: any): string => {
                if (!val) return 'Разное';
                let str = String(val).trim();
                if (str.startsWith('{') && str.endsWith('}')) {
                    try {
                        const parsed = JSON.parse(str);
                        return parsed.NAME || parsed.name || str;
                    } catch {
                        return str;
                    }
                }
                return str;
            };

            const cleanLinks = Array.isArray(linksRes) 
                ? linksRes.map(({ chosen, selected, ...rest }: any) => ({
                    ...rest,
                    category: cleanCategoryName(rest.category)
                }))
                : [];
            
            setLinks(cleanLinks);

            const categoriesFromLinks = new Set<string>();
            cleanLinks.forEach((link: LinkItem) => {
                if (link.category) categoriesFromLinks.add(link.category);
            });

            // Нормализуем полученные категории
            let rawCatsFromApi: string[] = [];
            if (Array.isArray(catsRes)) {
                rawCatsFromApi = catsRes
                    .map((item: any) => cleanCategoryName(typeof item === 'object' && item !== null ? (item.name || item.NAME) : item))
                    .filter((name: any) => typeof name === 'string' && name.trim() !== '');
            }

            let finalOrder: string[] = [];
            if (rawCatsFromApi.length > 0) {
                finalOrder = [...rawCatsFromApi];
                categoriesFromLinks.forEach(cat => {
                    if (!finalOrder.includes(cat)) finalOrder.push(cat);
                });
            } else {
                finalOrder = Array.from(categoriesFromLinks).sort();
            }

            // Формируем список категорий
            setCategoriesList(
                finalOrder.map((cat, idx) => ({ 
                    id: `cat_${idx}_${encodeURIComponent(cat)}`, 
                    name: cat 
                }))
            );
        } catch (error) {
            console.error('❌ Ошибка загрузки:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLinks();
    }, []);

    // ===== ГРУППИРОВКА =====
    const getGroupedLinks = useCallback(() => {
        const grouped: Record<string, LinkItem[]> = {};
        categoriesList.forEach(cat => { grouped[cat.name] = []; });
        links.forEach(link => {
            const catName = link.category || 'Разное';
            if (!grouped[catName]) grouped[catName] = [];
            grouped[catName].push(link);
        });
        return grouped;
    }, [links, categoriesList]);

    // ===== СОХРАНЕНИЕ КАТЕГОРИЙ В БД =====
    const saveCategoriesOrder = useCallback(async (newOrder: string[]) => {
        try {
            const cleanOrder = newOrder.map(c => String(c));
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categories: cleanOrder })
            });
            const data = await res.json();
            if (!data.success) {
                console.error('❌ Сервер вернул ошибку при сохранении категорий:', data);
            }
        } catch (error) {
            console.error('❌ Ошибка сети при сохранении категорий:', error);
        }
    }, []);

    const saveLinks = useCallback(async (newLinks: LinkItem[]) => {
        const clean = newLinks.map(({ chosen, selected, ...rest }) => rest);
        try {
            await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'save_links', 
                    payload: { links: clean }
                })
            });
        } catch (error) {
            console.error('❌ Ошибка сохранения ссылок:', error);
        }
    }, []);

    // ===== РЕЖИМЫ =====
    useEffect(() => {
        if (isEditMode) document.body.classList.add('admin-panel-active');
        else document.body.classList.remove('admin-panel-active');
        if (isDragMode) document.body.classList.add('drag-mode-active');
        else document.body.classList.remove('drag-mode-active');
    }, [isEditMode, isDragMode]);

    const handleTogglePanel = () => {
        if (isPanelOpen || isEditMode || isDragMode) {
            setIsPanelOpen(false);
            setIsEditMode(false);
            setIsDragMode(false);
        } else {
            setIsPanelOpen(true);
            setIsEditMode(true);
        }
    };

    const handleToggleDragMode = () => {
        setIsDragMode(!isDragMode);
    };

    // ===== ОБРАБОТЧИКИ ПЕРЕТАСКИВАНИЯ =====
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
        const updated = newList.map(link => ({ ...link, category: categoryName }));
        setLinks(prev => {
            const others = prev.filter(l => l.category !== categoryName);
            const result = [...others, ...updated];
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
                saveLinks(result);
                saveTimeoutRef.current = null;
            }, 500);
            return result;
        });
    };

    // ===== CRUD =====
    const handleSaveLink = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'save_link', 
                    payload: { ...formData, category: formData.category || 'Разное' }
                })
            });
            setIsModalOpen(false);
            await fetchLinks();
        } catch (error) {
            console.error('Error saving link:', error);
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
            await fetchLinks();
        } catch (error) {
            console.error('Error deleting link:', error);
        }
    };

    const deleteCategory = async (category: string) => {
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
            await fetchLinks();
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };

    const addCategory = async () => {
        const catName = prompt('Введите название нового раздела:');
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
                const newList = [...categoriesList, { id: `cat_${Date.now()}_${cleanCatName}`, name: cleanCatName }];
                setCategoriesList(newList);
                await saveCategoriesOrder(newList.map(c => c.name));
            }

            await fetchLinks();
        } catch (error) {
            console.error('Error adding category:', error);
        }
    };

    const renameCategory = async (oldName: string, newName: string) => {
        if (!newName || newName === oldName) {
            setEditingCategoryName(null);
            return;
        }
        try {
            await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'edit_category', 
                    payload: { old_category: oldName, new_category: newName }
                })
            });

            const newList = categoriesList.map(c => c.name === oldName ? { ...c, name: newName } : c);
            setCategoriesList(newList);
            await saveCategoriesOrder(newList.map(c => c.name));

            setEditingCategoryName(null);
            await fetchLinks();
        } catch (error) {
            console.error('Error renaming category:', error);
        }
    };

    // ===== МОДАЛКИ =====
    const openAddLinkModal = (preselectedCategory = 'Разное') => {
        setFormData({
            id: `b_${Date.now()}`, title: '', url: '', category: preselectedCategory,
            is_hidden: false, hide_url: false, open_in_new_tab: false, custom_favicon: ''
        });
        setIsModalOpen(true);
    };

    const openEditLinkModal = (link: LinkItem, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setFormData(link);
        setIsModalOpen(true);
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
            <div className="flex flex-col min-h-screen">
                <Header isAdmin={true} username="Администратор" />
                <div className="max-w-[1400px] w-full mx-auto px-6 py-12 flex-grow">
                    <div className="text-center py-12 text-slate-400">⏳ Загрузка...</div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Header isAdmin={true} username="Администратор" />

            <div className="max-w-[1400px] w-full mx-auto px-6 py-12 flex-grow">
                <header className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight page-title">Мои быстрые ссылки</h1>
                        <p className="text-xs text-slate-400 font-medium mt-1">Всего ссылок: {links.length}</p>
                    </div>
                </header>

                <hr className="header-divider" />

                <div id="categories-container" className="space-y-8 mt-4">
                    {categoriesList.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 bg-white rounded-[24px] border border-slate-200/80 shadow-sm p-6">
                            <i className="bi bi-folder-open text-4xl mx-auto mb-3 opacity-30 block"></i>
                            <p className="text-sm font-medium">Нет категорий. Добавьте первую ссылку.</p>
                        </div>
                    ) : (
                        <ReactSortable
                            list={categoriesList}
                            setList={handleCategoriesSort}
                            animation={250}
                            ghostClass="sortable-ghost"
                            chosenClass="sortable-chosen"
                            filter=".no-drag, .delete-cat-btn-new, .inline-cat-input, .inline-cat-save, .inline-cat-cancel"
                            disabled={!isDragMode}
                            className="space-y-8"
                        >
                            {categoriesList.map((catItem) => {
                                const catName = catItem.name;
                                return (
                                <div key={catItem.id} className="category-section p-6" data-category={catName}>
                                    <div className="category-title cursor-grab">
                                        <div className="flex items-center gap-2 flex-1">
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
                                                    className="cat-display-text"
                                                    onDoubleClick={() => {
                                                        if (isEditMode) {
                                                            setEditingCategoryName(catName);
                                                            setNewCategoryName(catName);
                                                        }
                                                    }}
                                                >
                                                    {catName}
                                                </span>
                                            )}
                                        </div>
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
                                    </div>

                                    <ReactSortable
                                        list={groupedLinks[catName] || []}
                                        setList={(newList) => handleTilesSort(newList, catName)}
                                        group={{ name: 'shared_tiles', pull: true, put: true }}
                                        disabled={!isDragMode}
                                        animation={200}
                                        ghostClass="sortable-ghost"
                                        chosenClass="sortable-chosen"
                                        filter=".delete-tile-btn, .edit-tile-pencil-btn, .tile-3d-plus"
                                        className="grid tiles-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-4"
                                    >
                                        {(groupedLinks[catName] || []).map((link) => (
                                            <a
                                                key={link.id}
                                                href={link.url || '#'}
                                                target={link.open_in_new_tab ? "_blank" : "_self"}
                                                className={`tile group block ${link.is_hidden ? 'hidden-tile' : ''}`}
                                                onClick={(e) => { if (isEditMode || isDragMode) e.preventDefault(); }}
                                                rel="noopener noreferrer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="tile-icon bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                                        {getFaviconHtml(link)}
                                                    </div>
                                                    <div className="overflow-hidden flex-1 pr-14">
                                                        <div className="tile-title">
                                                            {link.title || 'Без названия'}
                                                            {link.is_hidden && <i className="bi bi-eye-slash text-slate-400 text-xs ml-1"></i>}
                                                        </div>
                                                        <div className={`tile-desc ${link.hide_url ? 'url-text-hidden' : ''}`}>
                                                            {link.url ? link.url.replace(/^https?:\/\/(www\.)?/, '') : 'Без URL'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="edit-tile-pencil-btn" onClick={(e) => openEditLinkModal(link, e)}><i className="bi bi-pencil"></i></span>
                                                <span className="delete-tile-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteLink(link.id); }}><i className="bi bi-x-lg"></i></span>
                                            </a>
                                        ))}
                                        <div className={`tile-3d-plus generic-no-drag ${isDragMode ? '!hidden' : ''}`} onClick={() => openAddLinkModal(catName)}>
                                            <div className="tile-3d-plus-icon-circle"><i className="bi bi-plus-lg"></i></div>
                                        </div>
                                    </ReactSortable>
                                </div>
                            )})}
                        </ReactSortable>
                    )}
                </div>

                <div className="add-cat-inline" onClick={addCategory}>
                    <i className="bi bi-plus-circle opacity-50 text-xl"></i> Добавить новый раздел
                </div>
            </div>

            <Footer />

            <div className="ap-trigger group" onClick={handleTogglePanel} title="Панель управления">
                <i className="bi bi-sliders transition-transform duration-300 group-hover:rotate-90"></i>
            </div>

            <div className={`ap-panel ${isPanelOpen ? 'active' : ''}`}>
                <div className="ap-header">
                    <div className="ap-header-title"><div className="ap-pulse"></div>Управление</div>
                    <span className="ap-badge">Admin</span>
                </div>
                <button onClick={() => openAddLinkModal()} className="ap-btn ap-btn-dark"><i className="bi bi-plus-lg"></i> Быстрая ссылка</button>
                <button onClick={handleToggleDragMode} className="ap-btn ap-btn-primary">
                    {isDragMode ? <><i className="bi bi-check-lg"></i> Завершить перетаскивание</> : <><i className="bi bi-arrows-move"></i> Управление плитками</>}
                </button>
            </div>

            <div className={`ap-modal-overlay ${isModalOpen ? 'active' : ''}`} onClick={() => setIsModalOpen(false)}>
                <div className="ap-modal-box" onClick={e => e.stopPropagation()}>
                    <div className="ap-modal-header">
                        <h3 className="ap-modal-title">{formData.id ? 'Параметры ссылки' : 'Новая ссылка'}</h3>
                        <button type="button" className="ap-modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
                    </div>
                    <form onSubmit={handleSaveLink}>
                        <div className="ap-modal-grid">
                            <div>
                                <div className="ap-form-group">
                                    <label className="ap-form-label">URL Адрес</label>
                                    <input required type="url" placeholder="https://..." className="ap-input-lg" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} />
                                </div>
                                <div className="ap-form-group">
                                    <label className="ap-form-label">Название ссылки</label>
                                    <input required type="text" placeholder="Например: Google Документы" className="ap-input-lg" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                                </div>
                                <div className="ap-form-group">
                                    <label className="ap-form-label">Раздел плиток</label>
                                    <select className="ap-select" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                        {categoriesList.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 gap-2 mt-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-xl cursor-pointer">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase">Плитка видима</span>
                                            <input type="checkbox" checked={!formData.is_hidden} onChange={e => setFormData({...formData, is_hidden: !e.target.checked})} className="w-4 h-4 accent-indigo-600" />
                                        </label>
                                        <label className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-xl cursor-pointer">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase">Адрес видим</span>
                                            <input type="checkbox" checked={!formData.hide_url} onChange={e => setFormData({...formData, hide_url: !e.target.checked})} className="w-4 h-4 accent-indigo-600" />
                                        </label>
                                    </div>
                                    <label className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-xl cursor-pointer mt-1">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase"><i className="bi bi-box-arrow-up-right mr-1"></i> В новой вкладке</span>
                                        <input type="checkbox" checked={formData.open_in_new_tab} onChange={e => setFormData({...formData, open_in_new_tab: e.target.checked})} className="w-4 h-4 accent-indigo-600" />
                                    </label>
                                </div>
                            </div>
                            <div className="flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="ap-form-label m-0"><i className="bi bi-image"></i> Картинка / Иконка</label>
                                    </div>
                                    <div className="modal-fav-grid">
                                        {formData.custom_favicon && (
                                            <div className="modal-fav-item active">
                                                <img src={`/${formData.custom_favicon}`} alt="favicon" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="ap-modal-footer">
                            <button type="button" className="ap-btn-cancel" onClick={() => setIsModalOpen(false)}>Отмена</button>
                            <button type="submit" className="ap-btn ap-btn-primary" style={{ width: 'auto', padding: '0 28px' }}>Сохранить</button>
                        </div>
                    </form>
                </div>
            </div>

            <div className={`ap-modal-overlay ${isConfirmDeleteOpen ? 'active' : ''}`} onClick={() => setIsConfirmDeleteOpen(false)}>
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