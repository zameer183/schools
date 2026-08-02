import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

export async function GET() {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.PARENT]);
  if (!auth.authorized) return auth.response;

  let feeFilter: Record<string, unknown> = {};

  if (auth.session.role === UserRole.PARENT) {
    const parent = await prisma.parent.findUnique({
      where: { userId: auth.session.id },
      select: { children: { select: { studentId: true } } }
    });
    if (!parent) return NextResponse.json([]);
    const childIds = parent.children.map((c) => c.studentId);
    if (!childIds.length) return NextResponse.json([]);
    feeFilter = { fee: { studentId: { in: childIds } } };
  }

  const payments = await prisma.payment.findMany({
    where: feeFilter,
    include: { fee: true, parent: { include: { user: true } } },
    orderBy: { paidAt: 'desc' }
  });

  return NextResponse.json(payments);
}
