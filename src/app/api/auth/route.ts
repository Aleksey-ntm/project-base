import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createToken, getCurrentUser } from '@/lib/auth';

// POST: Логин
export async function POST(req: NextRequest) {
  try {
    const { username, password, remember } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
    }

    // Ищем пользователя в БД
    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!user) {
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 });
    }

    // Проверяем пароль (поддерживает хеши bcrypt из PHP)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 });
    }

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;

    // Генерируем токен
    const token = await createToken({
      id: user.id,
      username: user.username,
      role: user.role,
      fullName,
    });

    // Формируем ответ с установкой HttpOnly куки
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName,
      },
    });

    const maxAge = remember ? 30 * 24 * 60 * 60 : undefined; // 30 дней или до закрытия браузера

    response.cookies.set('ntm_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return response;
  } catch (error: any) {
    console.error('[Auth API Error]:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// GET: Получить информацию о текущем пользователе
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user });
}

// DELETE: Выход (Logout)
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('ntm_auth_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  return response;
}