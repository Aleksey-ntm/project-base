import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

    const formattedLinks = (links || []).map((l) => ({
      id: String(l.id),
      title: String(l.title || ''),
      url: String(l.url || ''),
      category: String(l.category || 'Разное'),
      is_hidden: Boolean(l.isHidden),
      hide_url: Boolean(l.hideUrl),
      open_in_new_tab: Boolean(l.openInNewTab),
      custom_favicon: String(l.customFavicon || ''),
      position: typeof l.position === 'number' ? l.position : 0,
    }));

    const formattedCategories = (categories || []).map((c) => ({
      id: String(c.id || c.name),
      name: String(c.name),
      position: typeof c.position === 'number' ? c.position : 0,
    }));

    return NextResponse.json({ links: formattedLinks, categories: formattedCategories });
  } catch (error: any) {
    console.error('[API GET] Ошибка:', error);
    return NextResponse.json({ error: error.message || 'Ошибка базы данных' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    // --- СОХРАНЕНИЕ / РЕДАКТИРОВАНИЕ ОДНОЙ ССЫЛКИ ---
    if (action === 'save_link') {
      const link = payload;
      const linkId = String(link.id);
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
        where: { id: linkId },
        update: dataToSave,
        create: {
          id: linkId,
          ...dataToSave,
        },
      });

      return NextResponse.json({ success: true, link: saved });
    }

    // --- УДАЛЕНИЕ ССЫЛКИ ---
    if (action === 'delete_link') {
      await prisma.quickButton.deleteMany({
        where: { id: String(payload.id) },
      });
      return NextResponse.json({ success: true });
    }

    // --- СОХРАНЕНИЕ ПОРЯДКА ССЫЛОК ---
    if (action === 'save_links_order') {
      const incomingLinks = Array.isArray(payload?.links) ? payload.links : [];

      if (incomingLinks.length > 0) {
        await prisma.$transaction(
          async (tx) => {
            for (let i = 0; i < incomingLinks.length; i++) {
              const link = incomingLinks[i];
              if (!link?.id) continue;
              await tx.quickButton.updateMany({
                where: { id: String(link.id) },
                data: {
                  category: String(link.category || 'Разное'),
                  position: i,
                },
              });
            }
          },
          {
            timeout: 10000,
          }
        );
      }

      return NextResponse.json({ success: true });
    }

    // --- СОХРАНЕНИЕ ПОРЯДКА РАЗДЕЛОВ ---
    if (action === 'save_categories') {
      const cats = Array.isArray(payload?.categories) ? payload.categories : [];
      if (cats.length > 0) {
        await prisma.$transaction(
          async (tx) => {
            for (let i = 0; i < cats.length; i++) {
              const cat = cats[i];
              if (!cat?.name) continue;
              await tx.quickCategory.upsert({
                where: { name: String(cat.name) },
                update: { position: i },
                create: { name: String(cat.name), position: i },
              });
            }
          },
          {
            timeout: 10000,
          }
        );
      }
      return NextResponse.json({ success: true });
    }

    // --- УДАЛЕНИЕ РАЗДЕЛА ---
    if (action === 'delete_category') {
      const catName = String(payload.category);
      await prisma.$transaction([
        prisma.quickButton.deleteMany({ where: { category: catName } }),
        prisma.quickCategory.deleteMany({ where: { name: catName } }),
      ]);
      return NextResponse.json({ success: true });
    }

    // --- ПЕРЕИМЕНОВАНИЕ РАЗДЕЛА ---
    if (action === 'edit_category') {
      const { old_category, new_category } = payload;
      await prisma.$transaction([
        prisma.quickCategory.update({
          where: { name: String(old_category) },
          data: { name: String(new_category) },
        }),
        prisma.quickButton.updateMany({
          where: { category: String(old_category) },
          data: { category: String(new_category) },
        }),
      ]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch (error: any) {
    console.error('[API POST] Ошибка обработки:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}