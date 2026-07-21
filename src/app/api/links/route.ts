import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Получение всех ссылок
export async function GET() {
  try {
    const { data, error } = await supabase.from('buttons').select('*');
    if (error) {
      console.error('Supabase links error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('Server error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Обработка действий со ссылками
export async function POST(req: Request) {
  try {
    const { action, payload } = await req.json();

    if (action === 'save_links') {
      await supabase.from('buttons').delete().neq('id', '');
      if (payload.links && payload.links.length > 0) {
        await supabase.from('buttons').insert(payload.links);
      }
    } else if (action === 'save_link') {
      const { error } = await supabase.from('buttons').upsert(payload);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (action === 'delete_link') {
      await supabase.from('buttons').delete().eq('id', payload.id);
    } else if (action === 'delete_category') {
      await supabase.from('buttons').delete().eq('category', payload.category);
    } else if (action === 'edit_category') {
      await supabase
        .from('buttons')
        .update({ category: payload.new_category })
        .eq('category', payload.old_category);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}