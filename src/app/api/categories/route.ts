import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Получение категорий
export async function GET() {
  try {
    const { data, error } = await supabase.from('categories').select('*');
    
    if (error) {
      console.error('Supabase categories error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const categories = (data || []).map((row: any) => {
      let val = row.name || row.NAME || row;
      if (typeof val === 'string' && val.startsWith('{') && val.endsWith('}')) {
        try {
          const parsed = JSON.parse(val);
          return parsed.NAME || parsed.name || val;
        } catch {
          return val;
        }
      }
      return String(val);
    });

    return NextResponse.json(categories);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Сохранение категорий
export async function POST(req: Request) {
  try {
    const { categories } = await req.json();

    if (Array.isArray(categories)) {
      // 1. Безопасно очищаем таблицу категорий без привязки к типу ID
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .filter('name', 'neq', '___NON_EXISTENT_VALUE___');

      if (deleteError) {
        console.error('Ошибка при очистке категорий:', deleteError);
        return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
      }

      // 2. Вставляем новые категории
      if (categories.length > 0) {
        const rows = categories.map((name: string) => ({ name: String(name) }));
        const { error: insertError } = await supabase.from('categories').insert(rows);

        if (insertError) {
          console.error('Ошибка при вставке категорий:', insertError);
          return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Server POST error:', err);
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}