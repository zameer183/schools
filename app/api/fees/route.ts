import { PaymentStatus, TransactionType, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

export async function GET(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.PARENT, UserRole.STUDENT]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId') ?? undefined;
  const classId = searchParams.get('classId') ?? undefined;
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;
  if (toDate) toDate.setHours(23, 59, 59, 999);

  const fees = await prisma.fee.findMany({
    where: {
      ...(studentId ? { studentId } : {}),
      ...(classId ? { student: { classId } } : {}),
      ...((fromDate || toDate)
        ? {
            dueDate: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {})
            }
          }
        : {})
    },
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
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const body = await request.json();

  // Fee edit: { feeId, _edit: true, title, amount, discount, dueDate }
  if (body._edit) {
    const { feeId, title, amount, discount, dueDate } = body;
    if (!feeId) return NextResponse.json({ error: 'feeId required' }, { status: 400 });
    const updated = await prisma.fee.update({
      where: { id: feeId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
        ...(discount !== undefined ? { discount: Number(discount) } : {}),
        ...(dueDate !== undefined ? { dueDate: new Date(dueDate) } : {})
      }
    });
    return NextResponse.json(updated);
  }

  // Add payment
  const { feeId, amountPaid, method, transactionRef, parentId } = body;
  if (!Object.values(TransactionType).includes(method)) {
    return NextResponse.json({ error: 'Invalid transaction method' }, { status: 400 });
  }

  const payment = await prisma.payment.create({
    data: { feeId, amountPaid, method, transactionRef, parentId }
  });

  // Auto-update fee status based on payments
  const fee = await prisma.fee.findUnique({
    where: { id: feeId },
    select: { amount: true, discount: true, payments: { select: { amountPaid: true } } }
  });
  if (fee) {
    const net = Number(fee.amount) - Number(fee.discount);
    const paid = fee.payments.reduce((s, p) => s + Number(p.amountPaid), 0);
    const newStatus: PaymentStatus = paid >= net ? PaymentStatus.PAID : paid > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PENDING;
    await prisma.fee.update({ where: { id: feeId }, data: { status: newStatus } });
  }

  return NextResponse.json(payment, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const paymentId = searchParams.get('paymentId');

  if (paymentId) {
    await prisma.payment.delete({ where: { id: paymentId } });
    return NextResponse.json({ success: true });
  }

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.fee.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
