import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// GET: Получить список категорий, отсортированных по позиции
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('name')
      .order('position', { ascending: true });

    if (error) throw error;
    
    // Возвращаем простой массив строк с именами категорий
    const categoryNames = (data || []).map((c) => c.name);
    return NextResponse.json(categoryNames);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Сохранить новый порядок категорий
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const categories: string[] = body.categories || [];

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json({ success: true });
    }

    // Готовим объекты с позициями для перезаписи
    const payload = categories.map((name, index) => ({
      name,
      position: index,
    }));

    // Перезаписываем позиции в таблице categories
    const { error } = await supabase
      .from('categories')
      .upsert(payload, { onConflict: 'name' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}