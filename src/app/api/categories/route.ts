import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const categoriesFilePath = path.join(process.cwd(), 'data', 'categories.json');

function readCategories() {
    try {
        if (!fs.existsSync(categoriesFilePath)) {
            return [];
        }
        const content = fs.readFileSync(categoriesFilePath, 'utf-8');
        return content ? JSON.parse(content) : [];
    } catch {
        return [];
    }
}

function writeCategories(categories: string[]) {
    try {
        fs.writeFileSync(categoriesFilePath, JSON.stringify(categories, null, 4), 'utf-8');
        return true;
    } catch {
        return false;
    }
}

export async function GET() {
    return NextResponse.json(readCategories());
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { categories } = body;
        if (!categories || !Array.isArray(categories)) {
            return NextResponse.json({ success: false, message: 'Invalid data' }, { status: 400 });
        }
        writeCategories(categories);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
    }
}