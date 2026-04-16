import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

export async function GET() {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.PARENT]);
  if (!auth.authorized) return auth.response;

  const payments = await prisma.payment.findMany({
    include: { fee: true, parent: { include: { user: true } } },
    orderBy: { paidAt: 'desc' }
  });

  return NextResponse.json(payments);
}
