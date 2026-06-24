import { SignJWT, jwtVerify } from 'jose';
import { compare } from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { SessionPayload, SessionUser } from '@/types/auth';

const COOKIE_NAME = 'hms_session';
const TTL_SECONDS = 60 * 60 * 8;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return new TextEncoder().encode(secret);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

const decodeSessionToken = cache(async (token?: string): Promise<SessionPayload | null> => {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
});

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return decodeSessionToken(token);
}

export async function getVerifiedSession(): Promise<SessionUser | null> {
  try {
    const session = await getSession();
    if (!session) return null;

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, email: true, fullName: true, role: true, isActive: true }
    });

    if (!user?.isActive) return null;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as SessionUser['role']
    };
  } catch (error) {
    const session = await getSession();
    if (
      session &&
      error instanceof Error &&
      (error.name === 'PrismaClientInitializationError' ||
        error.message.includes("Can't reach database server") ||
        error.message.includes('Timed out fetching a new connection'))
    ) {
      console.warn('[auth][getVerifiedSession] using signed-session fallback because database is unavailable');
      return {
        id: session.id,
        email: session.email,
        fullName: session.fullName,
        role: session.role
      };
    }

    console.error('[auth][getVerifiedSession]', error);
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getVerifiedSession();
  if (!session) return null;

  return {
    id: session.id,
    email: session.email,
    fullName: session.fullName,
    role: session.role,
    isActive: true
  };
}

export async function requireAuth(roles?: UserRole[]) {
  const session = await getVerifiedSession();
  if (!session) redirect('/login');

  if (roles && roles.length > 0 && !roles.includes(session.role as UserRole)) {
    redirect('/unauthorized');
  }

  return session;
}

export function roleHomePath(role: UserRole) {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'TEACHER':
      return '/teacher';
    case 'STUDENT':
      return '/student';
    case 'PARENT':
      return '/parent';
    default:
      return '/login';
  }
}
