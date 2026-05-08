import { PaymentStatus, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

export async function PATCH(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { ids, status } = await request.json();

  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ error: 'No fee IDs provided' }, { status: 400 });

  if (!Object.values(PaymentStatus).includes(status))
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  const result = await prisma.fee.updateMany({ where: { id: { in: ids } }, data: { status } });
  return NextResponse.json({ updated: result.count });
}
