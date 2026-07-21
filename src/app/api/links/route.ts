import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

export async function GET() {
  try {
    // Получаем сразу и ссылки, и категории с правильной сортировкой
    const [linksRes, catsRes] = await Promise.all([
      supabase.from('buttons').select('*').order('position', { ascending: true, nullsFirst: false }),
      supabase.from('categories').select('*').order('position', { ascending: true, nullsFirst: false })
    ]);

    return NextResponse.json({
      links: linksRes.data || [],
      categories: catsRes.data || []
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    // 1. СОХРАНЕНИЕ / ОБНОВЛЕНИЕ ОДНОЙ ПЛИТКИ
    if (action === 'save_link') {
      const link = payload;
      const recordToSave = {
        id: link.id || `b_${Date.now()}`,
        title: link.title || '',
        url: link.url || '',
        category: link.category || 'Основное',
        is_hidden: Boolean(link.is_hidden),
        hide_url: Boolean(link.hide_url),
        open_in_new_tab: Boolean(link.open_in_new_tab),
        custom_favicon: link.custom_favicon || '',
      };

      const { data, error } = await supabase
        .from('buttons')
        .upsert(recordToSave, { onConflict: 'id' })
        .select();

      if (error) throw error;
      return NextResponse.json({ success: true, link: data?.[0] || recordToSave });
    }

    // 2. МАССОВОЕ СОХРАНЕНИЕ ПОРЯДКА ПЛИТОК (Drag & Drop)
    if (action === 'save_links') {
      const links = payload.links || [];
      const formattedLinks = links.map((l: any, index: number) => ({
        id: l.id,
        title: l.title || '',
        url: l.url || '',
        category: l.category || 'Основное',
        is_hidden: Boolean(l.is_hidden),
        hide_url: Boolean(l.hide_url),
        open_in_new_tab: Boolean(l.open_in_new_tab),
        position: index, // Сохраняем физическую позицию
      }));

      const { error } = await supabase.from('buttons').upsert(formattedLinks, { onConflict: 'id' });
      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    // В route.ts замените обработку save_categories на:

// 3. МАССОВОЕ СОХРАНЕНИЕ ПОРЯДКА РАЗДЕЛОВ (Drag & Drop)
if (action === 'save_categories') {
    const categories = payload.categories || [];
    
    // categories может быть либо массивом строк, либо массивом объектов {name, position}
    const formattedCats = categories.map((item: any, index: number) => {
        if (typeof item === 'string') {
            return { name: item, position: index };
        }
        return {
            name: item.name,
            position: item.position !== undefined ? item.position : index
        };
    });

    // Для каждой категории делаем upsert
    for (const cat of formattedCats) {
        const { error } = await supabase
            .from('categories')
            .upsert({ name: cat.name, position: cat.position }, { onConflict: 'name' });
        if (error) throw error;
    }

    return NextResponse.json({ success: true });
}

    // 4. УДАЛЕНИЕ ПЛИТКИ
    if (action === 'delete_link') {
      const { id } = payload;
      const { error } = await supabase.from('buttons').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // 5. ПЕРЕИМЕНОВАНИЕ КАТЕГОРИИ
    if (action === 'edit_category') {
      const { old_category, new_category } = payload;
      const { error } = await supabase.from('buttons').update({ category: new_category }).eq('category', old_category);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // 6. УДАЛЕНИЕ КАТЕГОРИИ
    if (action === 'delete_category') {
      const { category } = payload;
      const { error } = await supabase.from('buttons').delete().eq('category', category);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API links error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}