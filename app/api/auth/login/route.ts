import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, verifyPassword } from '@/lib/auth';
import { loginSchema } from '@/lib/validators';
import { normalizeLoginIdentifier, normalizePassword } from '@/lib/login-normalize';
import type { AppRole } from '@/types/auth';

type LoginUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  isActive: boolean;
  passwordHash: string | null;
};

function isDatabaseConnectionError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'PrismaClientInitializationError' ||
      error.message.includes("Can't reach database server"))
  );
}

async function findUserViaSupabaseRest(email: string): Promise<LoginUser | null> {
  if (process.env.ALLOW_SUPABASE_REST_AUTH_FALLBACK !== '1') return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  const url = new URL('/rest/v1/User', supabaseUrl);
  url.searchParams.set('email', `eq.${email}`);
  url.searchParams.set('select', 'id,email,fullName,role,isActive,passwordHash');
  url.searchParams.set('limit', '1');

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    console.error('[auth/login] supabase-rest-fallback-failed', {
      status: response.status,
      statusText: response.statusText
    });
    return null;
  }

  const rows = (await response.json()) as LoginUser[];
  return rows[0] ?? null;
}

async function completeLogin(user: LoginUser, password: string, emailForLogs: string) {
  if (!user.isActive) {
    return NextResponse.json({ error: 'Invalid credentials', code: 'invalid_credentials' }, { status: 401 });
  }

  if (!user.passwordHash) {
    console.error('[auth/login] missing-password-hash', { email: emailForLogs, userId: user.id });
    return NextResponse.json({ error: 'Invalid credentials', code: 'invalid_credentials' }, { status: 401 });
  }

  let valid = false;
  try {
    valid = await verifyPassword(password, user.passwordHash);
  } catch (error) {
    console.error('[auth/login] verify-password-failed', {
      email: emailForLogs,
      userId: user.id,
      error
    });
    return NextResponse.json({ error: 'Invalid credentials', code: 'invalid_credentials' }, { status: 401 });
  }

  if (!valid) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[auth/login] bad-password', {
        email: emailForLogs,
        passwordLength: password.length
      });
    }
    return NextResponse.json({ error: 'Invalid credentials', code: 'invalid_credentials' }, { status: 401 });
  }

  try {
    await createSession({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    });
  } catch (error) {
    console.error('[auth/login] create-session-failed', {
      email: emailForLogs,
      userId: user.id,
      error
    });
    return NextResponse.json({ error: 'Unable to create session', code: 'session_error' }, { status: 500 });
  }

  return NextResponse.json({ success: true, role: user.role });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid payload', code: 'invalid_json' }, { status: 400 });
    }

    const normalizedEmail = normalizeLoginIdentifier((body as { email?: unknown })?.email);
    const normalizedPassword = normalizePassword((body as { password?: unknown })?.password);

    const parsed = loginSchema.safeParse({
      email: normalizedEmail,
      password: normalizedPassword
    });

    if (!parsed.success) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[auth/login] invalid-payload', {
          rawEmail: (body as { email?: unknown })?.email,
          normalizedEmail,
          passwordLength: normalizedPassword.length
        });
      }
      return NextResponse.json({ error: 'Invalid payload', code: 'invalid_payload' }, { status: 400 });
    }

    if (process.env.FORCE_SUPABASE_REST_DATA_FALLBACK === '1') {
      const fallbackUser = await findUserViaSupabaseRest(parsed.data.email);
      if (fallbackUser) {
        return completeLogin(fallbackUser, parsed.data.password, fallbackUser.email);
      }
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[auth/login] user-not-found', {
          email: parsed.data.email
        });
      }
      return NextResponse.json({ error: 'Invalid credentials', code: 'invalid_credentials' }, { status: 401 });
    }

    return completeLogin(user, parsed.data.password, parsed.data.email);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      console.error('[auth/login] database-unavailable', error);
      const fallbackUser = await findUserViaSupabaseRest(normalizeLoginIdentifier((body as { email?: unknown })?.email));
      if (fallbackUser) {
        return completeLogin(fallbackUser, normalizePassword((body as { password?: unknown })?.password), fallbackUser.email);
      }

      return NextResponse.json(
        { error: 'Database connection unavailable. Please verify DATABASE_URL and network access.', code: 'database_unavailable' },
        { status: 503 }
      );
    }

    console.error('[auth/login] unexpected-error', error);
    return NextResponse.json({ error: 'Internal server error', code: 'internal_error' }, { status: 500 });
  }
}
