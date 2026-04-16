import { PaymentStatus, TransactionType, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

export async function GET(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.PARENT, UserRole.STUDENT]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId') ?? undefined;

  const fees = await prisma.fee.findMany({
    where: { studentId },
    include: { student: { include: { user: true } }, payments: true },
    orderBy: { dueDate: 'asc' }
  });

  return NextResponse.json(fees);
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { studentId, title, dueDate, amount, discount } = await request.json();
  const fee = await prisma.fee.create({
    data: {
      studentId,
      title,
      dueDate: new Date(dueDate),
      amount,
      discount: discount ?? 0,
      status: PaymentStatus.PENDING
    }
  });

  return NextResponse.json(fee, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { id, status } = await request.json();
  if (!Object.values(PaymentStatus).includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const fee = await prisma.fee.update({ where: { id }, data: { status } });
  return NextResponse.json(fee);
}

export async function PUT(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.PARENT]);
  if (!auth.authorized) return auth.response;

  const { feeId, amountPaid, method, transactionRef, parentId } = await request.json();
  if (!Object.values(TransactionType).includes(method)) {
    return NextResponse.json({ error: 'Invalid transaction method' }, { status: 400 });
  }

  const payment = await prisma.payment.create({
    data: {
      feeId,
      amountPaid,
      method,
      transactionRef,
      parentId
    }
  });

  return NextResponse.json(payment, { status: 201 });
}
