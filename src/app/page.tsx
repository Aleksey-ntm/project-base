"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import * as Icons from 'lucide-react';
import {
    DndContext,
    pointerWithin,
    rectIntersection,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    DragOverlay,
    useDroppable,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import Tilt3DCard from '../components/Tilt3DCard';
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

const ICON_CATEGORIES = [
    {
        title: 'Разработка & Технологии',
        icons: [
            { name: 'Code2', label: 'Код' },
            { name: 'Terminal', label: 'Терминал' },
            { name: 'FolderGit2', label: 'Git' },
            { name: 'GitBranch', label: 'Ветка' },
            { name: 'GitPullRequest', label: 'PR' },
            { name: 'Cpu', label: 'Процессор' },
            { name: 'Database', label: 'База данных' },
            { name: 'Server', label: 'Сервер' },
            { name: 'Layers', label: 'Стек/Слои' },
            { name: 'Binary', label: 'Бинарный' },
            { name: 'Workflow', label: 'CI/CD' },
            { name: 'Webhook', label: 'Вебхук' },
            { name: 'Bug', label: 'Баг' },
            { name: 'Bot', label: 'Бот / AI' },
            { name: 'Boxes', label: 'Пакеты' },
            { name: 'Blocks', label: 'Компоненты' },
            { name: 'FileCode2', label: 'Файл кода' },
            { name: 'Cloud', label: 'Облако' },
            { name: 'Braces', label: 'Синтаксис' },
            { name: 'CircuitBoard', label: 'Плата' },
        ],
    },
    {
        title: 'Бизнес, Финансы & Аналитика',
        icons: [
            { name: 'BarChart3', label: 'Графики' },
            { name: 'TrendingUp', label: 'Рост' },
            { name: 'LineChart', label: 'Тренды' },
            { name: 'PieChart', label: 'Диаграмма' },
            { name: 'Wallet', label: 'Кошелек' },
            { name: 'CreditCard', label: 'Карта' },
            { name: 'Coins', label: 'Монеты' },
            { name: 'DollarSign', label: 'Доллар' },
            { name: 'BadgeDollarSign', label: 'Оплата' },
            { name: 'Receipt', label: 'Чек' },
            { name: 'Briefcase', label: 'Бизнес' },
            { name: 'Building2', label: 'Офис' },
            { name: 'Presentation', label: 'Презентация' },
            { name: 'Landmark', label: 'Банк' },
            { name: 'Scale', label: 'Баланс' },
            { name: 'FileSpreadsheet', label: 'Таблица' },
        ],
    },
    {
        title: 'Медиа, Дизайн & Творчество',
        icons: [
            { name: 'Sparkles', label: 'Премиум' },
            { name: 'Palette', label: 'Палитра' },
            { name: 'PenTool', label: 'Перо' },
            { name: 'Figma', label: 'Figma' },
            { name: 'Wand2', label: 'Магия / AI' },
            { name: 'Image', label: 'Изображение' },
            { name: 'Camera', label: 'Фото' },
            { name: 'Video', label: 'Видео' },
            { name: 'Clapperboard', label: 'Кино' },
            { name: 'Music2', label: 'Аудио' },
            { name: 'Mic2', label: 'Подкаст' },
            { name: 'Brush', label: 'Кисть' },
            { name: 'Shapes', label: 'Формы' },
            { name: 'Eye', label: 'Превью' },
        ],
    },
    {
        title: 'Управление, Задачи & Документы',
        icons: [
            { name: 'Kanban', label: 'Канбан' },
            { name: 'CheckSquare', label: 'Задачи' },
            { name: 'CalendarCheck2', label: 'Календарь' },
            { name: 'Clock', label: 'Время' },
            { name: 'Folder', label: 'Папка' },
            { name: 'FolderKanban', label: 'Проекты' },
            { name: 'FileText', label: 'Документ' },
            { name: 'Bookmark', label: 'Закладка' },
            { name: 'Target', label: 'Цель' },
            { name: 'Flame', label: 'Срочно' },
            { name: 'Zap', label: 'Энергия' },
            { name: 'Award', label: 'Награда' },
            { name: 'StickyNote', label: 'Заметка' },
            { name: 'Files', label: 'Файлы' },
        ],
    },
    {
        title: 'Связь, Безопасность & Сеть',
        icons: [
            { name: 'Globe', label: 'Глобус / Веб' },
            { name: 'Compass', label: 'Компас' },
            { name: 'Send', label: 'Телеграм / Чат' },
            { name: 'MessageSquareText', label: 'Сообщения' },
            { name: 'Mail', label: 'Почта' },
            { name: 'ShieldCheck', label: 'Защита' },
            { name: 'Lock', label: 'Безопасность' },
            { name: 'KeyRound', label: 'Ключи' },
            { name: 'Users2', label: 'Команда' },
            { name: 'UserCheck', label: 'Профиль' },
            { name: 'Share2', label: 'Поделиться' },
            { name: 'BellRing', label: 'Уведомления' },
            { name: 'Radio', label: 'Трансляция' },
            { name: 'Headphones', label: 'Поддержка' },
            { name: 'HelpCircle', label: 'Справка' },
            { name: 'Settings2', label: 'Настройки' },
        ],
    },
];

function renderIconVisual(iconValue?: string) {
    const MatchedIcon = iconValue && (Icons as any)[iconValue] ? (Icons as any)[iconValue] : Icons.Sparkles;
    return (
        <div className="w-12 h-12 rounded-2xl icon-badge flex items-center justify-center shrink-0">
            <MatchedIcon className="w-5 h-5 text-stone-700" />
        </div>
    );
}

function SortableLinkItem({
    link,
    onEdit,
    onDelete,
}: {
    link: LinkItem;
    onEdit: (link: LinkItem) => void;
    onDelete: (id: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: link.id,
        data: { type: 'link', link },
    });

    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="relative group/wrapper cursor-grab active:cursor-grabbing select-none touch-none"
        >
            <div className={`luxury-tile ${link.is_hidden ? 'opacity-40 grayscale' : ''}`}>
                <div className="flex items-center gap-4">
    {renderIconVisual(link.custom_favicon)}
    <div className="overflow-hidden flex-1 pr-6">
        <div className="font-extrabold text-[15px] text-slate-900 tracking-tight truncate group-hover:text-slate-700 transition-colors flex items-center justify-between">
            <span className="truncate">{link.title || 'Без названия'}</span>
            <Icons.ArrowUpRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all shrink-0 ml-2" />
        </div>
        {!link.hide_url && (
            <div className="mt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 tracking-tight">
                    {link.url ? link.url.replace(/^https?:\/\/(www\.)?/, '') : 'Без URL'}
                </span>
            </div>
        )}
    </div>
</div>
            </div>

            <div className="absolute top-4 right-4 z-50 flex items-center gap-1.5 pointer-events-auto">
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(link); }}
                    className="w-7 h-7 rounded-lg bg-stone-100/90 hover:bg-stone-200 text-stone-700 flex items-center justify-center shadow-xs transition-all cursor-pointer"
                >
                    <Icons.Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(link.id); }}
                    className="w-7 h-7 rounded-lg bg-stone-100/90 hover:bg-rose-600 hover:text-white text-rose-600 flex items-center justify-center shadow-xs transition-all cursor-pointer"
                >
                    <Icons.Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

function SortableCategoryContainer({
    category,
    links,
    editingCategoryName,
    newCategoryName,
    setNewCategoryName,
    setEditingCategoryName,
    onRenameCategory,
    onDeleteCategoryClick,
    onAddLinkClick,
    onEditLink,
    onDeleteLink,
}: {
    category: CategoryItem;
    links: LinkItem[];
    editingCategoryName: string | null;
    newCategoryName: string;
    setNewCategoryName: (val: string) => void;
    setEditingCategoryName: (val: string | null) => void;
    onRenameCategory: (oldName: string, newName: string) => void;
    onDeleteCategoryClick: (name: string) => void;
    onAddLinkClick: (categoryName: string) => void;
    onEditLink: (link: LinkItem) => void;
    onDeleteLink: (id: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: `cat_${category.name}`,
        data: { type: 'category', category },
    });

    const { setNodeRef: setDropNodeRef } = useDroppable({
        id: `droppable_${category.name}`,
        data: { type: 'category_droppable', categoryName: category.name },
    });

    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="luxury-section p-8 rounded-[36px] border border-stone-200/90"
        >
            <div className="flex items-center justify-between mb-7 select-none">
                <div className="flex items-center gap-3">
                    <div
                        {...attributes}
                        {...listeners}
                        className="w-7 h-7 rounded-xl bg-stone-100 text-stone-400 hover:text-stone-800 flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors"
                    >
                        <Icons.GripVertical className="w-4 h-4" />
                    </div>

                    <div className="w-2 h-2 rounded-full bg-amber-600/70" />

                    {editingCategoryName === category.name ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onRenameCategory(category.name, newCategoryName);
                                    if (e.key === 'Escape') setEditingCategoryName(null);
                                }}
                                className="px-3 py-1 text-sm font-black uppercase tracking-widest text-stone-800 bg-white border border-stone-300 rounded-xl outline-none shadow-xs"
                                autoFocus
                            />
                            <button
                                onClick={() => onRenameCategory(category.name, newCategoryName)}
                                className="text-emerald-600 hover:scale-110 transition-transform cursor-pointer"
                            >
                                <Icons.Check className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setEditingCategoryName(null)}
                                className="text-stone-400 hover:scale-110 transition-transform cursor-pointer"
                            >
                                <Icons.X className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <h2
                            className="text-sm font-black uppercase tracking-widest text-stone-700 cursor-pointer hover:text-stone-900 transition-colors"
                            onDoubleClick={() => {
                                setEditingCategoryName(category.name);
                                setNewCategoryName(category.name);
                            }}
                        >
                            {category.name}
                        </h2>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-stone-500 bg-white px-3.5 py-1 rounded-full border border-stone-200 shadow-xs">
                        {links.length}
                    </span>

                    <button
                        onClick={() => onDeleteCategoryClick(category.name)}
                        className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                        title="Удалить раздел"
                    >
                        <Icons.Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div ref={setDropNodeRef}>
                <SortableContext items={links.map((l) => l.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 min-h-[120px] pb-4">
                        {links.map((link) => (
                            <SortableLinkItem
                                key={link.id}
                                link={link}
                                onEdit={onEditLink}
                                onDelete={onDeleteLink}
                            />
                        ))}

                        <div
                            onClick={() => onAddLinkClick(category.name)}
                            className="min-h-[88px] rounded-[26px] border-2 border-dashed border-stone-300/80 hover:border-stone-400 bg-stone-50/60 hover:bg-white flex flex-col items-center justify-center gap-1 text-stone-600 hover:text-stone-900 font-extrabold text-xs transition-all cursor-pointer select-none"
                        >
                            <Icons.Plus className="w-5 h-5" />
                            <span>Добавить плитку</span>
                        </div>
                    </div>
                </SortableContext>
            </div>
        </div>
    );
}

export default function LinksPage() {
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [isSavingLink, setIsSavingLink] = useState(false);

    const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [links, setLinks] = useState<LinkItem[]>([]);
    const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);

    const [isEditMode, setIsEditMode] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState('');
    const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');

    const [activeDragItem, setActiveDragItem] = useState<LinkItem | null>(null);
    const [iconSearchQuery, setIconSearchQuery] = useState('');

    const [rawUrlInput, setRawUrlInput] = useState('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const saveLinksTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [formData, setFormData] = useState<LinkItem>({
        id: '',
        title: '',
        url: '',
        category: 'Разное',
        is_hidden: false,
        hide_url: false,
        open_in_new_tab: false,
        custom_favicon: 'Sparkles',
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const triggerSuccessEffect = () => {
        confetti({
            particleCount: 45,
            spread: 60,
            origin: { y: 0.85 },
            colors: ['#78716c', '#a8a29e', '#d97706', '#059669'],
        });
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            if (e.key === 'Escape') {
                setSearchQuery('');
                searchInputRef.current?.blur();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const fetchLinks = useCallback(async () => {
        try {
            const res = await fetch('/api/links', { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            const data = await res.json();
            const rawLinks: any[] = Array.isArray(data.links) ? data.links : [];
            const cleanLinks: LinkItem[] = rawLinks
                .map((rest: any) => ({
                    id: String(rest.id),
                    title: String(rest.title || ''),
                    url: String(rest.url || ''),
                    is_hidden: Boolean(rest.is_hidden),
                    hide_url: Boolean(rest.hide_url),
                    open_in_new_tab: Boolean(rest.open_in_new_tab),
                    category: String(rest.category || 'Разное'),
                    custom_favicon: rest.custom_favicon || 'Sparkles',
                    position: typeof rest.position === 'number' ? rest.position : 0,
                }))
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

            setLinks(cleanLinks);

            const rawCats: any[] = Array.isArray(data.categories) ? data.categories : [];
            if (rawCats.length > 0) {
                const sortedCats: CategoryItem[] = [...rawCats]
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                    .map((cat) => ({
                        id: String(cat.id || cat.name),
                        name: String(cat.name),
                        position: cat.position,
                    }));
                setCategoriesList(sortedCats);
            } else {
                const categoriesFromLinks = new Set<string>();
                cleanLinks.forEach((link) => categoriesFromLinks.add(link.category));
                setCategoriesList(
                    Array.from(categoriesFromLinks)
                        .sort()
                        .map((name, idx) => ({ id: `cat_${idx}`, name, position: idx }))
                );
            }
        } catch (error) {
            console.error('[Frontend] Ошибка fetchLinks:', error);
            showToast('Не удалось загрузить данные');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            try {
                const res = await fetch('/api/auth');
                if (res.ok) {
                    const data = await res.json();
                    if (!data.authenticated || data.user?.role !== 'admin') {
                        router.replace('/login');
                        return;
                    }
                }
            } catch {
                console.warn('[Frontend] /api/auth недоступен');
            }
            await fetchLinks();
        };
        init();
    }, [router, fetchLinks]);

    const debouncedSaveLinksOrder = useCallback((newLinks: LinkItem[]) => {
        setSyncStatus('saving');
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        if (saveLinksTimeoutRef.current) clearTimeout(saveLinksTimeoutRef.current);

        saveLinksTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch('/api/links', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'save_links_order', payload: { links: newLinks } }),
                });
                if (res.ok) {
                    setSyncStatus('saved');
                    syncTimeoutRef.current = setTimeout(() => {
                        setSyncStatus('idle');
                    }, 2000);
                } else {
                    setSyncStatus('idle');
                    showToast('Ошибка сохранения порядка');
                }
            } catch (error) {
                setSyncStatus('idle');
                console.error('[Frontend] Ошибка сохранения:', error);
            }
        }, 400);
    }, []);

    const saveCategoriesOrder = async (newCats: CategoryItem[]) => {
        setSyncStatus('saving');
        try {
            const payload = newCats.map((cat, index) => ({ name: cat.name, position: index }));
            const res = await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_categories', payload: { categories: payload } }),
            });
            if (res.ok) {
                setSyncStatus('saved');
                setTimeout(() => setSyncStatus('idle'), 2000);
            } else {
                setSyncStatus('idle');
            }
        } catch (error) {
            setSyncStatus('idle');
            console.error('Ошибка сохранения разделов:', error);
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const activeData = active.data.current;
        if (activeData?.type === 'link') {
            setActiveDragItem(activeData.link);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        if (activeId === overId) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        if (activeType === 'link') {
            setLinks((prev) => {
                const activeIndex = prev.findIndex((l) => l.id === activeId);
                if (activeIndex === -1) return prev;

                const activeItem = prev[activeIndex];
                let targetCategory = activeItem.category;

                if (overType === 'link') {
                    const overIndex = prev.findIndex((l) => l.id === overId);
                    if (overIndex !== -1) targetCategory = prev[overIndex].category;
                } else if (overType === 'category_droppable') {
                    targetCategory = over.data.current?.categoryName;
                }

                if (activeItem.category === targetCategory) return prev;

                const updated = [...prev];
                const movedItem = { ...updated[activeIndex], category: targetCategory };
                updated.splice(activeIndex, 1);

                if (overType === 'link') {
                    const newOverIndex = updated.findIndex((l) => l.id === overId);
                    const isBelow =
                        active.rect.current.translated &&
                        over.rect &&
                        active.rect.current.translated.top > over.rect.top + over.rect.height;
                    const modifier = isBelow ? 1 : 0;
                    updated.splice(newOverIndex + modifier, 0, movedItem);
                } else {
                    const catItems = updated.filter(l => l.category === targetCategory);
                    if (catItems.length > 0) {
                        const lastItemId = catItems[catItems.length - 1].id;
                        const insertIndex = updated.findIndex(l => l.id === lastItemId) + 1;
                        updated.splice(insertIndex, 0, movedItem);
                    } else {
                        updated.push(movedItem);
                    }
                }
                return updated;
            });
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragItem(null);
        const { active, over } = event;

        if (active.data.current?.type === 'category') {
            if (over && String(active.id) !== String(over.id)) {
                const oldIndex = categoriesList.findIndex((c) => `cat_${c.name}` === String(active.id));
                const newIndex = categoriesList.findIndex((c) => `cat_${c.name}` === String(over.id));
                if (oldIndex !== -1 && newIndex !== -1) {
                    const newCats = arrayMove(categoriesList, oldIndex, newIndex);
                    setCategoriesList(newCats);
                    saveCategoriesOrder(newCats);
                }
            }
            return;
        }

        if (active.data.current?.type === 'link') {
            const activeId = String(active.id);
            const overId = over ? String(over.id) : null;

            setLinks((prev) => {
                let updated = [...prev];

                if (overId) {
                    const activeIndex = updated.findIndex((l) => l.id === activeId);
                    const overIndex = updated.findIndex((l) => l.id === overId);

                    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
                        updated = arrayMove(updated, activeIndex, overIndex);
                    }
                }

                const finalLinks = updated.map((item, index) => ({ ...item, position: index }));
                debouncedSaveLinksOrder(finalLinks);
                return finalLinks;
            });
        }
    };

    const handleSaveLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingLink(true);

        let finalUrl = rawUrlInput.trim();
        if (finalUrl && !/^https?:\/\//i.test(finalUrl) && !finalUrl.startsWith('/')) {
            finalUrl = `https://${finalUrl}`;
        }

        const payloadToSave: LinkItem = {
            id: formData.id || `btn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            title: formData.title.trim(),
            url: finalUrl,
            category: formData.category || 'Разное',
            is_hidden: Boolean(formData.is_hidden),
            hide_url: Boolean(formData.hide_url),
            open_in_new_tab: Boolean(formData.open_in_new_tab),
            custom_favicon: formData.custom_favicon || 'Sparkles',
            position: typeof formData.position === 'number' ? formData.position : links.length,
        };

        try {
            const res = await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_link', payload: payloadToSave }),
                signal: AbortSignal.timeout(5000),
            });
            if (!res.ok) throw new Error('Ошибка сохранения');

            setIsModalOpen(false);
            triggerSuccessEffect();
            showToast('Плитка сохранена');
            await fetchLinks();
        } catch (error: any) {
            showToast(error.message || 'Ошибка сети');
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
                body: JSON.stringify({ action: 'delete_link', payload: { id } }),
            });
            showToast('Ссылка удалена');
            await fetchLinks();
        } catch {}
    };

    const deleteCategory = async (category: string) => {
        if (!isEditMode) return;
        try {
            await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_category', payload: { category } }),
            });
            setIsConfirmDeleteOpen(false);
            showToast('Раздел удален');
            await fetchLinks();
        } catch {}
    };

    const addCategory = async () => {
        if (!isEditMode) return;
        const catName = prompt('Название нового раздела:');
        if (!catName || !catName.trim()) return;

        try {
            await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_categories',
                    payload: {
                        categories: [
                            ...categoriesList,
                            { name: catName.trim(), position: categoriesList.length },
                        ],
                    },
                }),
            });
            showToast('Раздел создан');
            await fetchLinks();
        } catch {}
    };

    const renameCategory = async (oldName: string, newName: string) => {
        if (!isEditMode || !newName || newName === oldName) {
            setEditingCategoryName(null);
            return;
        }
        try {
            await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'edit_category',
                    payload: { old_category: oldName, new_category: newName },
                }),
            });
            setEditingCategoryName(null);
            showToast('Раздел переименован');
            await fetchLinks();
        } catch {}
    };

    const query = searchQuery.trim().toLowerCase();

    const getCategoryLinks = (categoryName: string) => {
        return links
            .filter((link) => link.category === categoryName)
            .filter((link) => {
                if (!isEditMode && link.is_hidden) return false;
                if (!query) return true;
                return (
                    link.title.toLowerCase().includes(query) ||
                    link.url.toLowerCase().includes(query)
                );
            });
    };

    const filteredIconCategories = useMemo(() => {
        const q = iconSearchQuery.trim().toLowerCase();
        if (!q) return ICON_CATEGORIES;

        return ICON_CATEGORIES.map(cat => ({
            ...cat,
            icons: cat.icons.filter(icon => 
                icon.name.toLowerCase().includes(q) || 
                icon.label.toLowerCase().includes(q)
            )
        })).filter(cat => cat.icons.length > 0);
    }, [iconSearchQuery]);

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen bg-[#fbfbf9] items-center justify-center">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="luxury-hero p-8 rounded-3xl flex items-center gap-4 text-stone-700 font-bold border border-stone-200"
                >
                    <Icons.Loader2 className="w-6 h-6 animate-spin text-stone-700" />
                    <span>Загрузка ссылок...</span>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#fbfbf9] text-stone-850 relative selection:bg-stone-800 selection:text-white">
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-8 right-8 z-[100000] pointer-events-none"
                    >
                        <div className="luxury-hero px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-stone-200 bg-white">
                            <div className="w-5 h-5 rounded-full bg-stone-800 text-white flex items-center justify-center text-xs">
                                <Icons.Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <span className="text-xs font-black tracking-wide text-stone-800">
                                {toastMessage}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {syncStatus !== 'idle' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-8 right-8 z-[100001] pointer-events-none"
                    >
                        <div className="px-4 py-2.5 rounded-2xl bg-white border border-stone-200 shadow-xl flex items-center gap-2.5 text-stone-800">
                            {syncStatus === 'saving' ? (
                                <>
                                    <Icons.Loader2 className="w-4 h-4 animate-spin text-stone-600 shrink-0" />
                                    <span className="text-xs font-bold text-stone-600 tracking-tight">Сохранение изменений...</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                        <Icons.Check className="w-2.5 h-2.5 stroke-[3]" />
                                    </div>
                                    <span className="text-xs font-bold text-stone-800 tracking-tight">Сохранено</span>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="max-w-[1440px] w-full mx-auto px-6 pt-10 pb-20 flex-grow">
                <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="luxury-hero rounded-[36px] p-8 mb-12 flex flex-col md:flex-row items-center justify-between gap-6 border border-stone-200 bg-white/90"
                >
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-stone-100 text-stone-700 border border-stone-200 shadow-xs flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600/80" />
                                Private Dashboard
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-stone-900">
                            Быстрые ссылки
                        </h1>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Icons.Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Поиск по ссылкам..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-14 py-3.5 bg-white rounded-2xl text-xs font-bold text-stone-800 placeholder-stone-400 outline-none border border-stone-200 focus:border-stone-400 shadow-xs transition-all"
                            />
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-0.5">
                                <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-stone-400 bg-stone-50 border border-stone-200 rounded-md">
                                    ⌘K
                                </kbd>
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => setIsEditMode((prev) => !prev)}
                            className={`px-7 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all shadow-xs cursor-pointer ${
                                isEditMode
                                    ? 'bg-stone-850 text-white'
                                    : 'bg-white text-stone-800 border border-stone-200 hover:bg-stone-50'
                            }`}
                        >
                            {isEditMode ? (
                                <Icons.Check className="w-4 h-4" />
                            ) : (
                                <Icons.SlidersHorizontal className="w-4 h-4 text-stone-700" />
                            )}
                            <span>{isEditMode ? 'Готово' : 'Настроить'}</span>
                        </motion.button>
                    </div>
                </motion.div>

                {isEditMode ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={(args) => {
                            const pointerCollisions = pointerWithin(args);
                            if (pointerCollisions.length > 0) return pointerCollisions;
                            return rectIntersection(args);
                        }}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={categoriesList.map((c) => `cat_${c.name}`)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-12">
                                {categoriesList.map((catItem) => {
                                    const catLinks = getCategoryLinks(catItem.name);
                                    return (
                                        <SortableCategoryContainer
                                            key={catItem.id}
                                            category={catItem}
                                            links={catLinks}
                                            editingCategoryName={editingCategoryName}
                                            newCategoryName={newCategoryName}
                                            setNewCategoryName={setNewCategoryName}
                                            setEditingCategoryName={setEditingCategoryName}
                                            onRenameCategory={renameCategory}
                                            onDeleteCategoryClick={(name) => {
                                                setCategoryToDelete(name);
                                                setIsConfirmDeleteOpen(true);
                                            }}
                                            onAddLinkClick={(categoryName) => {
                                                setFormData({
                                                    id: '',
                                                    title: '',
                                                    url: '',
                                                    category: categoryName,
                                                    is_hidden: false,
                                                    hide_url: false,
                                                    open_in_new_tab: false,
                                                    custom_favicon: 'Sparkles',
                                                });
                                                setRawUrlInput('');
                                                setIconSearchQuery('');
                                                setIsModalOpen(true);
                                            }}
                                            onEditLink={(link) => {
                                                setFormData({ ...link });
                                                setRawUrlInput(link.url || '');
                                                setIconSearchQuery('');
                                                setIsModalOpen(true);
                                            }}
                                            onDeleteLink={deleteLink}
                                        />
                                    );
                                })}
                            </div>
                        </SortableContext>

                        <DragOverlay>
                            {activeDragItem ? (
                                <div className="luxury-tile shadow-2xl scale-105 opacity-95 border border-stone-300 bg-white">
                                    <div className="flex items-center gap-4">
                                        {renderIconVisual(activeDragItem.custom_favicon)}
                                        <div className="overflow-hidden flex-1">
                                            <div className="font-extrabold text-[15px] text-stone-900">
                                                {activeDragItem.title}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                ) : (
                    <div className="space-y-12">
                        {categoriesList.map((catItem) => {
                            const catLinks = getCategoryLinks(catItem.name);
                            if (catLinks.length === 0) return null;

                            return (
                                <div key={catItem.id} className="luxury-section p-8 rounded-[36px] border border-stone-200 bg-white/90">
                                    <div className="flex items-center justify-between mb-8 select-none">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-amber-600/70" />
                                            <h2 className="text-sm font-black uppercase tracking-widest text-stone-700">
                                                {catItem.name}
                                            </h2>
                                        </div>
                                        <span className="text-xs font-bold text-stone-500 bg-white px-3.5 py-1 rounded-full border border-stone-200 shadow-xs">
                                            {catLinks.length}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                        {catLinks.map((link) => (
                                            <div key={link.id} className="relative group/wrapper">
                                                <Tilt3DCard
                                                    href={link.url || '#'}
                                                    target={link.open_in_new_tab ? '_blank' : '_self'}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        {renderIconVisual(link.custom_favicon)}
                                                        <div className="overflow-hidden flex-1 pr-6">
                                                            <div className="font-extrabold text-[15px] text-stone-900 tracking-tight truncate group-hover:text-stone-700 transition-colors">
                                                                {link.title || 'Без названия'}
                                                            </div>
                                                            {!link.hide_url && (
                                                                <div className="text-[11px] font-semibold text-stone-400 truncate mt-0.5 tracking-tight flex items-center gap-1">
                                                                    {link.open_in_new_tab && <Icons.ExternalLink className="w-3 h-3 text-stone-400 shrink-0" />}
                                                                    <span>{link.url ? link.url.replace(/^https?:\/\/(www\.)?/, '') : 'Без URL'}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Tilt3DCard>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {isEditMode && (
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={addCategory}
                        className="w-full mt-10 py-5 rounded-[32px] border-2 border-dashed border-stone-300 hover:border-stone-400 hover:bg-white text-stone-700 font-extrabold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xs"
                    >
                        <Icons.FolderPlus className="w-5 h-5 text-stone-700" />
                        <span>Создать новый раздел</span>
                    </motion.button>
                )}
            </main>

            <Footer />

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[9999] bg-stone-900/30 backdrop-blur-xs flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.96, opacity: 0, y: 10 }}
                            className="bg-white w-full max-w-xl rounded-[32px] p-7 md:p-8 shadow-2xl border border-stone-200 space-y-6 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                                <div>
                                    <h3 className="text-lg font-black text-stone-900">
                                        {formData.id ? 'Редактировать плитку' : 'Создать быструю ссылку'}
                                    </h3>
                                    <p className="text-xs text-stone-400 font-semibold mt-0.5">
                                        Настройте параметры адреса, иконки и отображения
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold flex items-center justify-center cursor-pointer transition-colors"
                                >
                                    <Icons.X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveLink} className="space-y-5">
                                <div>
                                    <label className="text-[11px] font-black text-stone-600 uppercase tracking-wider mb-1.5 block">
                                        Адрес (URL)
                                    </label>
                                    <div className="relative flex items-center">
                                        <Icons.Link2 className="w-4 h-4 text-stone-400 absolute left-4 pointer-events-none" />
                                        <input
                                            required
                                            type="text"
                                            placeholder="https://example.com или /dashboard"
                                            className="w-full pl-11 pr-4 py-3 bg-stone-50/80 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 placeholder-stone-400 outline-none focus:border-stone-400 focus:bg-white transition-all shadow-xs"
                                            value={rawUrlInput}
                                            onChange={(e) => setRawUrlInput(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] font-black text-stone-600 uppercase tracking-wider mb-1.5 block">
                                        Название
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Например: Аналитика проектов"
                                        className="w-full px-4 py-3 bg-stone-50/80 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 placeholder-stone-400 outline-none focus:border-stone-400 focus:bg-white transition-all shadow-xs"
                                        value={formData.title}
                                        onChange={(e) =>
                                            setFormData({ ...formData, title: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="p-5 bg-stone-50/70 rounded-2xl border border-stone-200/90 space-y-3.5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="text-[11px] font-black text-stone-700 uppercase tracking-wider block">
                                                Иконка плитки
                                            </label>
                                            <span className="text-[10px] text-stone-400 font-semibold">Выберите подходящую иконку из каталога</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {renderIconVisual(formData.custom_favicon)}
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <Icons.Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input 
                                            type="text"
                                            placeholder="Поиск по иконкам (код, git, figma, база...)"
                                            value={iconSearchQuery}
                                            onChange={(e) => setIconSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-[11px] font-bold text-stone-700 placeholder-stone-400 outline-none focus:border-stone-400"
                                        />
                                    </div>

                                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                                        {filteredIconCategories.length === 0 ? (
                                            <div className="py-6 text-center text-xs font-bold text-stone-400">
                                                Ничего не найдено
                                            </div>
                                        ) : (
                                            filteredIconCategories.map((group) => (
                                                <div key={group.title} className="space-y-1.5">
                                                    <div className="text-[10px] font-black uppercase tracking-wider text-stone-400 px-1">
                                                        {group.title}
                                                    </div>
                                                    <div className="grid grid-cols-7 gap-1.5">
                                                        {group.icons.map((item) => {
                                                            const IconComp = (Icons as any)[item.name];
                                                            if (!IconComp) return null;
                                                            const isSelected = formData.custom_favicon === item.name;

                                                            return (
                                                                <button
                                                                    key={item.name}
                                                                    type="button"
                                                                    title={item.label}
                                                                    onClick={() =>
                                                                        setFormData({
                                                                            ...formData,
                                                                            custom_favicon: item.name,
                                                                        })
                                                                    }
                                                                    className={`h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                                                                        isSelected
                                                                            ? 'bg-stone-850 text-white border-stone-850 shadow-xs'
                                                                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                                                                    }`}
                                                                >
                                                                    <IconComp className="w-4 h-4" />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] font-black text-stone-600 uppercase tracking-wider mb-1.5 block">
                                        Раздел
                                    </label>
                                    <select
                                        className="w-full px-4 py-3 bg-stone-50/80 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:border-stone-400 focus:bg-white cursor-pointer shadow-xs"
                                        value={formData.category}
                                        onChange={(e) =>
                                            setFormData({ ...formData, category: e.target.value })
                                        }
                                    >
                                        {categoriesList.map((cat) => (
                                            <option key={cat.id} value={cat.name}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="p-4 bg-stone-50/70 rounded-2xl border border-stone-200/90 space-y-2.5">
                                    <div
                                        onClick={() =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                open_in_new_tab: !prev.open_in_new_tab,
                                            }))
                                        }
                                        className="flex items-center justify-between p-3 bg-white border border-stone-200/80 rounded-xl cursor-pointer hover:bg-stone-50 select-none transition-colors"
                                    >
                                        <span className="text-xs font-bold text-stone-700">
                                            Открывать в новой вкладке
                                        </span>
                                        <div
                                            className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                                                formData.open_in_new_tab
                                                    ? 'bg-amber-600'
                                                    : 'bg-stone-300'
                                            }`}
                                        >
                                            <div
                                                className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                                                    formData.open_in_new_tab
                                                        ? 'translate-x-4'
                                                        : 'translate-x-0'
                                                }`}
                                            />
                                        </div>
                                    </div>

                                    <div
                                        onClick={() =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                hide_url: !prev.hide_url,
                                            }))
                                        }
                                        className="flex items-center justify-between p-3 bg-white border border-stone-200/80 rounded-xl cursor-pointer hover:bg-stone-50 select-none transition-colors"
                                    >
                                        <span className="text-xs font-bold text-stone-700">
                                            Скрывать подпись адреса URL
                                        </span>
                                        <div
                                            className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                                                formData.hide_url ? 'bg-amber-600' : 'bg-stone-300'
                                            }`}
                                        >
                                            <div
                                                className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                                                    formData.hide_url
                                                        ? 'translate-x-4'
                                                        : 'translate-x-0'
                                                }`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-3.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer transition-colors"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSavingLink}
                                        className="px-8 py-3.5 rounded-2xl bg-stone-850 hover:bg-stone-800 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
                                    >
                                        {isSavingLink ? 'Сохранение...' : 'Сохранить'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {isConfirmDeleteOpen && (
                <div className="fixed inset-0 z-[10000] bg-stone-900/30 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white max-w-sm w-full p-6 text-center space-y-4 rounded-3xl border border-stone-200 shadow-xl">
                        <h3 className="font-extrabold text-base text-stone-900">
                            Удалить раздел «{categoryToDelete}»?
                        </h3>
                        <p className="text-xs text-stone-500">
                            Все ссылки внутри него также будут удалены.
                        </p>
                        <div className="flex gap-2 justify-center pt-2">
                            <button
                                onClick={() => setIsConfirmDeleteOpen(false)}
                                className="px-4 py-2 text-xs font-bold rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={() => deleteCategory(categoryToDelete)}
                                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs"
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}