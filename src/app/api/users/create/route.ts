import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'У вас нет прав для создания пользователей' }, { status: 403 });
    }

    const { email, password, role, firstName, lastName } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Заполните обязательные поля (Email и Пароль)' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Проверяем существование email
    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        role: role === 'admin' ? Role.admin : Role.manager,
        firstName: firstName ? String(firstName).trim() : null,
        lastName: lastName ? String(lastName).trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('[Create User Error]:', error);
    return NextResponse.json({ error: 'Ошибка сервера при создании пользователя' }, { status: 500 });
  }
}