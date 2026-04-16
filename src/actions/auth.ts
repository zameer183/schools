'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createSession, roleHomePath, verifyPassword } from '@/lib/auth';
import { loginSchema } from '@/lib/validators';
import { normalizeLoginIdentifier, normalizePassword } from '@/lib/login-normalize';

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData
) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.includes('[YOUR-PASSWORD]')) {
    return { error: 'Database is not configured. Please set a valid DATABASE_URL in .env.' };
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'replace-with-long-random-secret') {
    return { error: 'JWT secret is not configured. Please update JWT_SECRET in .env.' };
  }

  let destination = '/login';

  try {
    const payload = loginSchema.safeParse({
      email: normalizeLoginIdentifier(formData.get('email')),
      password: normalizePassword(formData.get('password'))
    });

    if (!payload.success) {
      return { error: 'Please provide valid credentials.' };
    }

    const user = await prisma.user.findUnique({ where: { email: payload.data.email } });
    if (!user || !user.isActive) {
      return { error: 'Invalid email or password.' };
    }

    const isValid = await verifyPassword(payload.data.password, user.passwordHash);
    if (!isValid) {
      return { error: 'Invalid email or password.' };
    }

    await createSession({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    });

    destination = roleHomePath(user.role);
  } catch (error) {
    const maybeRedirect = error as { digest?: string };
    if (maybeRedirect?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }

    return { error: 'Unable to login right now. Please verify DB settings and try again.' };
  }

  redirect(destination);
}
