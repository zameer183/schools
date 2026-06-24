import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth';
import type { SessionUser } from '@/types/auth';

type ApiAuthFailure = {
  authorized: false;
  response: NextResponse;
};

type ApiAuthSuccess = {
  authorized: true;
  session: SessionUser;
};

export async function ensureApiRole(roles: UserRole[]): Promise<ApiAuthFailure | ApiAuthSuccess> {
  const session = await getVerifiedSession();
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  if (!roles.includes(session.role as UserRole)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    };
  }

  return { authorized: true, session };
}
