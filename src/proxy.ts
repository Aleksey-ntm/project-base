import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

// Публичные маршруты (не требуют проверки)
if (
  pathname.startsWith('/login') ||
  pathname.startsWith('/_next') ||
  pathname.startsWith('/favicon.ico') ||
  pathname.startsWith('/api/auth')
) {
  return NextResponse.next();
}

  const token = req.cookies.get('ntm_auth_token')?.value;
  const user = token ? await verifyToken(token) : null;

  // Если не авторизован — редирект на /login
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Защита админских маршрутов (например /users_admin)
  if (pathname.startsWith('/users_admin') && user.role !== 'admin') {
    return new NextResponse('Доступ ограничен. Требуются права администратора.', { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

