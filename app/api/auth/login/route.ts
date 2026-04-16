import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, verifyPassword } from '@/lib/auth';
import { loginSchema } from '@/lib/validators';
import { normalizeLoginIdentifier, normalizePassword } from '@/lib/login-normalize';

export async function POST(request: Request) {
  const body = await request.json();
  const normalizedEmail = normalizeLoginIdentifier(body?.email);
  const normalizedPassword = normalizePassword(body?.password);

  const parsed = loginSchema.safeParse({
    email: normalizedEmail,
    password: normalizedPassword
  });

  if (!parsed.success) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[auth/login] invalid-payload', {
        rawEmail: body?.email,
        normalizedEmail,
        passwordLength: normalizedPassword.length
      });
    }
    return NextResponse.json({ error: 'Invalid payload', code: 'invalid_payload' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.isActive) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[auth/login] user-not-found', {
        email: parsed.data.email
      });
    }
    return NextResponse.json({ error: 'Invalid credentials', code: 'user_not_found' }, { status: 401 });
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[auth/login] bad-password', {
        email: parsed.data.email,
        passwordLength: parsed.data.password.length
      });
    }
    return NextResponse.json({ error: 'Invalid credentials', code: 'bad_password' }, { status: 401 });
  }

  await createSession({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role
  });

  return NextResponse.json({ success: true, role: user.role });
}
