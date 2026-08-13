import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createToken, getCurrentUser } from '@/lib/auth';

// POST: Логин
export async function POST(req: NextRequest) {
  try {
    const { username, password, remember } = await req.json();

    const cleanUsername = username?.trim();

    if (!cleanUsername || !password) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
    }

    // Ищем пользователя в БД
    let user = await prisma.user.findFirst({
      where: {
        username: {
          equals: cleanUsername,
          mode: 'insensitive', // Игнорируем регистр (Admin / admin)
        },
      },
    });

    // 🚀 ПРИНУДИТЕЛЬНЫЙ ОБХОД ДЛЯ АДМИНА:
    // Если вводится admin / admin10, мы пропускаем в любом случае!
    const isAdminBypass = cleanUsername.toLowerCase() === 'admin' && (password === 'admin10' || password === 'admin');

    if (!user && !isAdminBypass) {
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 });
    }

    // Проверяем пароль (если это не хардкод-обход)
    if (!isAdminBypass && user) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 });
      }
    }

    // Если юзера не было в БД, но заходит админ — формируем виртуального админа
    const userId = user?.id ?? 1;
    const userRole = user?.role ?? 'admin';
    const fullName = user ? ([user.firstName, user.lastName].filter(Boolean).join(' ') || user.username) : 'Administrator';

    // Генерируем токен
    const token = await createToken({
      id: userId,
      username: cleanUsername,
      role: userRole,
      fullName,
    });

    // Формируем ответ
    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        username: cleanUsername,
        role: userRole,
        fullName,
      },
    });

    const maxAge = remember ? 30 * 24 * 60 * 60 : undefined;

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