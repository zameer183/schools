'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UserRole, PaymentStatus } from '@prisma/client';

export async function runAutoFeesAction(): Promise<{ feesCreated: number; overdueMarked: number }> {
  await requireAuth([UserRole.ADMIN]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = await prisma.fee.updateMany({
    where: {
      status: PaymentStatus.PENDING,
      dueDate: { lt: today }
    },
    data: { status: PaymentStatus.OVERDUE }
  });

  return { feesCreated: 0, overdueMarked: overdue.count };
}
