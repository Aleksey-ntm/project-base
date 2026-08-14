import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    // 🔒 Двойная защита: Проверка прав администратора на сервере
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'У вас нет прав для создания пользователей' }, { status: 403 });
    }

    const { username, password, role, firstName, lastName, email } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Заполните обязательные поля (Логин и Пароль)' }, { status: 400 });
    }

    // Проверяем существование логина
    const existingUser = await prisma.user.findFirst({
      where: {
        username: {
          equals: username.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Пользователь с таким логином уже существует' }, { status: 400 });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Сохраняем в БД
    const newUser = await prisma.user.create({
      data: {
        username: username.trim(),
        password: hashedPassword,
        role: role || 'manager',
        firstName: firstName || null,
        lastName: lastName || null,
        email: email || null,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('[Create User Error]:', error);
    return NextResponse.json({ error: 'Ошибка сервера при создании пользователя' }, { status: 500 });
  }
}