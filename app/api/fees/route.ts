import { PaymentStatus, TransactionType, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { runFeeAutomation } from '@/lib/fee-automation';

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthlyFeeTitle(date: Date) {
  return `Monthly Tuition Fee - ${date.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`;
}

function deriveStatus(net: number, paid: number): PaymentStatus {
  if (paid >= net && net > 0) return PaymentStatus.PAID;
  if (paid > 0) return PaymentStatus.PARTIAL;
  return PaymentStatus.PENDING;
}

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

  let studentFilter: Record<string, unknown> = {};

  if (auth.session.role === UserRole.STUDENT) {
    const student = await prisma.student.findUnique({ where: { userId: auth.session.id }, select: { id: true } });
    if (!student) return NextResponse.json([]);
    studentFilter = { studentId: student.id };
  } else if (auth.session.role === UserRole.PARENT) {
    const parent = await prisma.parent.findUnique({
      where: { userId: auth.session.id },
      select: { children: { select: { studentId: true } } }
    });
    if (!parent) return NextResponse.json([]);
    const childIds = parent.children.map((c) => c.studentId);
    const effectiveStudentId = studentId && childIds.includes(studentId) ? studentId : undefined;
    studentFilter = effectiveStudentId ? { studentId: effectiveStudentId } : { studentId: { in: childIds } };
  } else {
    if (studentId) studentFilter = { studentId };
  }

  const fees = await prisma.fee.findMany({
    take: 100,
    where: {
      ...studentFilter,
      ...(classId && auth.session.role === UserRole.ADMIN ? { student: { classId } } : {}),
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

  const body = await request.json();

  if (body.action === 'sync') {
    const studentId = body.studentId || undefined;
    const result = await runFeeAutomation(new Date(), studentId);
    return NextResponse.json({ success: true, ...result });
  }

  const { studentId, title, dueDate, amount, discount, feeCategory, feeType } = body;
  const normalizedDueDate = monthStart(new Date(dueDate));
  const fee = await prisma.fee.create({
    data: {
      studentId,
      title,
      dueDate: normalizedDueDate,
      amount,
      discount: discount ?? 0,
      feeCategory: feeCategory || 'TUITION',
      feeType: feeType || 'MONTHLY',
      partialFeeSupported: true,
      collectOnMonthStart: true,
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
        ...(dueDate !== undefined ? { dueDate: monthStart(new Date(dueDate)) } : {})
      }
    });
    return NextResponse.json(updated);
  }

  // Add payment
  const { feeId, studentId, amountPaid, method, transactionRef, parentId, allocateToOldest = true } = body;
  if (!Object.values(TransactionType).includes(method)) {
    return NextResponse.json({ error: 'Invalid transaction method' }, { status: 400 });
  }

  const amountToAllocate = Number(amountPaid);
  if (!Number.isFinite(amountToAllocate) || amountToAllocate <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
  }

  const payments = await prisma.$transaction(async (tx) => {
    let targetStudentId = studentId as string | undefined;
    let sourceFee = null;

    if (feeId) {
      sourceFee = await tx.fee.findUnique({
        where: { id: feeId },
        select: {
          id: true,
          studentId: true,
          title: true,
          dueDate: true,
          amount: true,
          discount: true,
          payments: { select: { amountPaid: true } }
        }
      });
      if (!sourceFee && !targetStudentId) throw new Error('Fee not found');
      if (sourceFee) targetStudentId = sourceFee.studentId;
    }

    if (!targetStudentId) {
      throw new Error('studentId or feeId is required');
    }

    const createdPayments = [];
    let remainingPayment = amountToAllocate;

    if (allocateToOldest) {
      // Find all unpaid or partial fees for this student in chronological order (oldest first)
      const unpaidFees = await tx.fee.findMany({
        where: {
          studentId: targetStudentId,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] }
        },
        select: {
          id: true,
          studentId: true,
          title: true,
          dueDate: true,
          amount: true,
          discount: true,
          payments: { select: { amountPaid: true } }
        },
        orderBy: { dueDate: 'asc' }
      });

      for (const targetFee of unpaidFees) {
        if (remainingPayment <= 0.0001) break;

        const net = Math.max(Number(targetFee.amount) - Number(targetFee.discount), 0);
        const alreadyPaid = targetFee.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0);
        const feeRemaining = Math.max(net - alreadyPaid, 0);
        if (feeRemaining <= 0) continue;

        const appliedAmount = Math.min(remainingPayment, feeRemaining);
        const payment = await tx.payment.create({
          data: {
            feeId: targetFee.id,
            amountPaid: appliedAmount,
            method,
            transactionRef: transactionRef || null,
            parentId
          }
        });
        createdPayments.push(payment);
        remainingPayment -= appliedAmount;

        const totalPaidAfter = alreadyPaid + appliedAmount;
        const newStatus = totalPaidAfter >= net && net > 0
          ? PaymentStatus.PAID
          : (totalPaidAfter > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PENDING);

        await tx.fee.update({
          where: { id: targetFee.id },
          data: { status: newStatus }
        });
      }
    } else if (sourceFee) {
      // Apply specifically to sourceFee only
      const net = Math.max(Number(sourceFee.amount) - Number(sourceFee.discount), 0);
      const alreadyPaid = sourceFee.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0);
      const feeRemaining = Math.max(net - alreadyPaid, 0);
      const appliedAmount = Math.min(remainingPayment, feeRemaining);

      if (appliedAmount > 0) {
        const payment = await tx.payment.create({
          data: {
            feeId: sourceFee.id,
            amountPaid: appliedAmount,
            method,
            transactionRef: transactionRef || null,
            parentId
          }
        });
        createdPayments.push(payment);
        remainingPayment -= appliedAmount;

        const totalPaidAfter = alreadyPaid + appliedAmount;
        const newStatus = totalPaidAfter >= net && net > 0
          ? PaymentStatus.PAID
          : (totalPaidAfter > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PENDING);

        await tx.fee.update({
          where: { id: sourceFee.id },
          data: { status: newStatus }
        });
      }
    }

    // If remainingPayment > 0.0001 (Advance payment)
    if (remainingPayment > 0.0001) {
      const latestFee = await tx.fee.findFirst({
        where: { studentId: targetStudentId },
        orderBy: { dueDate: 'desc' }
      });
      const baseDueDate = latestFee?.dueDate || new Date();
      const monthlyAmount = latestFee ? Number(latestFee.amount) : 2500;
      const monthlyDiscount = latestFee ? Number(latestFee.discount) : 0;

      for (let monthOffset = 1; remainingPayment > 0.0001 && monthOffset < 36; monthOffset += 1) {
        const targetMonth = addMonths(baseDueDate, monthOffset);
        let targetFee = await tx.fee.findFirst({
          where: {
            studentId: targetStudentId,
            dueDate: { gte: monthStart(targetMonth), lte: monthEnd(targetMonth) }
          },
          include: { payments: { select: { amountPaid: true } } }
        });

        if (!targetFee) {
          targetFee = await tx.fee.create({
            data: {
              studentId: targetStudentId,
              title: monthlyFeeTitle(targetMonth),
              dueDate: monthStart(targetMonth),
              amount: monthlyAmount,
              discount: monthlyDiscount,
              status: PaymentStatus.PENDING
            },
            include: { payments: { select: { amountPaid: true } } }
          });
        }

        const net = Math.max(Number(targetFee.amount) - Number(targetFee.discount), 0);
        const alreadyPaid = targetFee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
        const feeRemaining = Math.max(net - alreadyPaid, 0);
        if (feeRemaining <= 0) continue;

        const appliedAmount = Math.min(remainingPayment, feeRemaining);
        const payment = await tx.payment.create({
          data: {
            feeId: targetFee.id,
            amountPaid: appliedAmount,
            method,
            transactionRef: transactionRef || 'ADVANCE_PAYMENT',
            parentId
          }
        });
        createdPayments.push(payment);
        remainingPayment -= appliedAmount;

        const totalPaidAfter = alreadyPaid + appliedAmount;
        const newStatus = totalPaidAfter >= net && net > 0
          ? PaymentStatus.PAID
          : (totalPaidAfter > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PENDING);

        await tx.fee.update({
          where: { id: targetFee.id },
          data: { status: newStatus }
        });
      }
    }

    return createdPayments;
  });

  return NextResponse.json(payments[0] ?? { allocated: 0 }, { status: 201 });
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
