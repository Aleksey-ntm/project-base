/*import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const newPassword = 'admin';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        password: hashedPassword,
        role: 'admin',
      },
      create: {
        username: 'admin',
        password: hashedPassword,
        firstName: 'Администратор',
        role: 'admin',
      },
    });

    return NextResponse.json({
      success: true,
      message: '✅ Пароль успешно сброшен!',
      login: user.username,
      newPassword: newPassword,
    });
  } catch (error: any) {
    console.error('ПОЛНАЯ ОШИБКА PRISMA:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || String(error),
      stack: error.stack 
    }, { status: 500 });
  }
}*/