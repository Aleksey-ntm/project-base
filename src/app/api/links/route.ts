import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [links, categories] = await Promise.all([
      prisma.quickButton.findMany({
        orderBy: { position: 'asc' },
      }),
      prisma.quickCategory.findMany({
        orderBy: { position: 'asc' },
      }),
    ]);

    const formattedLinks = links.map((l) => ({
      id: l.id,
      title: l.title,
      url: l.url,
      category: l.category,
      is_hidden: l.isHidden,
      hide_url: l.hideUrl,
      open_in_new_tab: l.openInNewTab,
      custom_favicon: l.customFavicon || '',
      position: l.position,
    }));

    return NextResponse.json({ links: formattedLinks, categories });
  } catch (error: any) {
    console.error('Ошибка GET /api/links:', error);
    return NextResponse.json({ error: error.message || 'Ошибка базы данных' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    // --- ТОЧЕЧНОЕ СОХРАНЕНИЕ ССЫЛКИ СО ВСЕМИ ПОЛЯМИ ---
    if (action === 'save_link') {
      const link = payload;
      const dataToSave = {
        title: String(link.title || '').trim(),
        url: String(link.url || '').trim(),
        category: String(link.category || 'Разное').trim(),
        isHidden: Boolean(link.is_hidden),
        hideUrl: Boolean(link.hide_url),
        openInNewTab: Boolean(link.open_in_new_tab),
        customFavicon: String(link.custom_favicon || ''),
        position: typeof link.position === 'number' ? link.position : 0,
      };

      const saved = await prisma.quickButton.upsert({
        where: { id: String(link.id) },
        update: dataToSave,
        create: {
          id: String(link.id),
          ...dataToSave,
        },
      });

      return NextResponse.json({ success: true, link: saved });
    }

    // --- УДАЛЕНИЕ ССЫЛКИ ---
    if (action === 'delete_link') {
      await prisma.quickButton.delete({
        where: { id: String(payload.id) },
      });
      return NextResponse.json({ success: true });
    }

    // --- СОХРАНЕНИЕ ПОРЯДКА И РАСПРЕДЕЛЕНИЯ ПОСЛЕ DRAG & DROP ---
    if (action === 'save_links_order') {
      const links = payload.links || [];
      await prisma.$transaction(
        links.map((link: any, index: number) =>
          prisma.quickButton.update({
            where: { id: String(link.id) },
            data: {
              category: link.category,
              position: index,
            },
          })
        )
      );
      return NextResponse.json({ success: true });
    }

    // --- СОХРАНЕНИЕ / ПОРЯДОК КАТЕГОРИЙ ---
    if (action === 'save_categories') {
      const cats = payload.categories || [];
      await prisma.$transaction(
        cats.map((cat: any, index: number) =>
          prisma.quickCategory.upsert({
            where: { name: cat.name },
            update: { position: index },
            create: { name: cat.name, position: index },
          })
        )
      );
      return NextResponse.json({ success: true });
    }

    // --- УДАЛЕНИЕ КАТЕГОРИИ СО ВСЕМИ ПЛИТКАМИ ---
    if (action === 'delete_category') {
      const catName = payload.category;
      await prisma.$transaction([
        prisma.quickButton.deleteMany({ where: { category: catName } }),
        prisma.quickCategory.deleteMany({ where: { name: catName } }),
      ]);
      return NextResponse.json({ success: true });
    }

    // --- ПЕРЕИМЕНОВАНИЕ КАТЕГОРИИ ---
    if (action === 'edit_category') {
      const { old_category, new_category } = payload;
      await prisma.$transaction([
        prisma.quickCategory.update({
          where: { name: old_category },
          data: { name: new_category },
        }),
        prisma.quickButton.updateMany({
          where: { category: old_category },
          data: { category: new_category },
        }),
      ]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch (error: any) {
    console.error('Ошибка POST /api/links:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}