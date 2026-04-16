import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ensureApiRole } from '@/lib/rbac';
import { getAdminKpis } from '@/lib/dashboard-data';

export async function GET() {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const kpis = await getAdminKpis();
  return NextResponse.json(kpis);
}
