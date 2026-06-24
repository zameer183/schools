import { PaymentStatus, TransactionType, UserRole } from '@prisma/client';
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

  if (status === PaymentStatus.PAID) {
    const updated = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const id of ids as string[]) {
        const fee = await tx.fee.findUnique({
          where: { id },
          select: { id: true, amount: true, discount: true, payments: { select: { amountPaid: true } } }
        });
        if (!fee) continue;

        const net = Number(fee.amount) - Number(fee.discount);
        const paid = fee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
        const remaining = Math.max(net - paid, 0);

        if (remaining > 0) {
          await tx.payment.create({
            data: {
              feeId: fee.id,
              amountPaid: remaining,
              method: TransactionType.CASH,
              transactionRef: 'AUTO_MARK_PAID'
            }
          });
        }

        await tx.fee.update({
          where: { id: fee.id },
          data: { status: PaymentStatus.PAID }
        });
        count += 1;
      }
      return count;
    });

    return NextResponse.json({ updated });
  }

  if (status === PaymentStatus.PENDING) {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({
        where: { feeId: { in: ids as string[] } }
      });
      const result = await tx.fee.updateMany({
        where: { id: { in: ids } },
        data: { status: PaymentStatus.PENDING }
      });
      return result.count;
    });

    return NextResponse.json({ updated });
  }

  const result = await prisma.fee.updateMany({
    where: { id: { in: ids } },
    data: { status }
  });
  return NextResponse.json({ updated: result.count });
}
