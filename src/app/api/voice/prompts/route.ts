import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const promptsDir = path.join(process.cwd(), 'public', 'prompts');

    const seoPath = path.join(promptsDir, 'seo_kr.txt');
    const tpPath = path.join(promptsDir, 'tp.txt');
    const devPath = path.join(promptsDir, 'develop.txt');

    const seo_kr = fs.existsSync(seoPath) ? fs.readFileSync(seoPath, 'utf-8') : '';
    const tp = fs.existsSync(tpPath) ? fs.readFileSync(tpPath, 'utf-8') : '';
    const develop = fs.existsSync(devPath) ? fs.readFileSync(devPath, 'utf-8') : '';

    return NextResponse.json({ seo_kr, tp, develop });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to read prompts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, content } = body;

    if (!['seo_kr', 'tp', 'develop'].includes(type) || content === undefined) {
      return NextResponse.json({ error: 'Некорректные параметры' }, { status: 400 });
    }

    const promptsDir = path.join(process.cwd(), 'public', 'prompts');
    if (!fs.existsSync(promptsDir)) {
      fs.mkdirSync(promptsDir, { recursive: true });
    }

    const targetPath = path.join(promptsDir, `${type}.txt`);
    fs.writeFileSync(targetPath, content, 'utf-8');

    return NextResponse.json({ success: true, message: 'Шаблон успешно обновлен!' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Не удалось сохранить файл: ' + error.message }, { status: 500 });
  }
}