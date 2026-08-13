import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ntm_super_secret_jwt_key_2026'
);

export interface UserPayload {
  id: number;
  username: string;
  role: 'admin' | 'manager';
  fullName: string;
}

// Создание JWT токена
export async function createToken(payload: UserPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // Живет 30 дней, как в старом конфиге
    .sign(SECRET_KEY);
}

// Расшифровка и проверка токена
export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const verified = await jwtVerify(token, SECRET_KEY);
    return verified.payload as unknown as UserPayload;
  } catch {
    return null;
  }
}

// Получение текущего пользователя из Cookies (для Server Components и API)
export async function getCurrentUser(): Promise<UserPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('ntm_auth_token')?.value;

  if (!token) return null;
  return await verifyToken(token);
}