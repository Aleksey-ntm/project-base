import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'buttons.json');
const categoriesFilePath = path.join(process.cwd(), 'data', 'categories.json');

function readData() {
    try {
        if (!fs.existsSync(dataFilePath)) {
            fs.writeFileSync(dataFilePath, JSON.stringify([], null, 4), 'utf-8');
            return [];
        }
        const content = fs.readFileSync(dataFilePath, 'utf-8');
        return content ? JSON.parse(content) : [];
    } catch {
        return [];
    }
}

function writeData(data: any[]) {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 4), 'utf-8');
        return true;
    } catch {
        return false;
    }
}

// Вспомогательная функция для синхронизации категорий
function ensureCategoryExists(categoryName: string) {
    if (!categoryName) return;
    try {
        let categories: string[] = [];
        if (fs.existsSync(categoriesFilePath)) {
            const content = fs.readFileSync(categoriesFilePath, 'utf-8');
            categories = content ? JSON.parse(content) : [];
        }
        if (!categories.includes(categoryName)) {
            categories.push(categoryName);
            fs.writeFileSync(categoriesFilePath, JSON.stringify(categories, null, 4), 'utf-8');
        }
    } catch (e) {
        console.error('Error auto-saving category:', e);
    }
}

export async function GET() {
    return NextResponse.json(readData());
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, payload } = body;
        let buttons = readData();

        switch (action) {
            case 'save_links': {
                const { links } = payload;
                if (links && Array.isArray(links)) {
                    buttons = links;
                }
                break;
            }
            case 'save_link': {
                const { id, title, url, category, is_hidden, hide_url, open_in_new_tab, custom_favicon } = payload;
                const existingIndex = buttons.findIndex((b: any) => b.id === id);
                const targetCategory = category || 'Разное';
                
                const newLink = {
                    id: id || `b_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    title: title || 'Новая ссылка',
                    url: url || '#',
                    category: targetCategory,
                    is_hidden: is_hidden ?? false,
                    hide_url: hide_url ?? false,
                    open_in_new_tab: open_in_new_tab ?? false,
                    custom_favicon: custom_favicon || ''
                };
                
                if (existingIndex > -1) {
                    buttons[existingIndex] = { ...buttons[existingIndex], ...newLink };
                } else {
                    buttons.push(newLink);
                }

                // Гарантируем, что новая категория попадет в categories.json
                ensureCategoryExists(targetCategory);
                break;
            }
            case 'delete_link': {
                buttons = buttons.filter((b: any) => b.id !== payload.id);
                break;
            }
            case 'delete_category': {
                buttons = buttons.filter((b: any) => b.category !== payload.category);
                // Также удаляем из categories.json
                try {
                    if (fs.existsSync(categoriesFilePath)) {
                        const content = fs.readFileSync(categoriesFilePath, 'utf-8');
                        let categories: string[] = content ? JSON.parse(content) : [];
                        categories = categories.filter(c => c !== payload.category);
                        fs.writeFileSync(categoriesFilePath, JSON.stringify(categories, null, 4), 'utf-8');
                    }
                } catch (_) {}
                break;
            }
            case 'edit_category': {
                buttons = buttons.map((b: any) => {
                    if (b.category === payload.old_category) {
                        return { ...b, category: payload.new_category };
                    }
                    return b;
                });
                ensureCategoryExists(payload.new_category);
                break;
            }
            default:
                return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
        }

        writeData(buttons);
        return NextResponse.json({ success: true, count: buttons.length });
    } catch (error) {
        return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
    }
}