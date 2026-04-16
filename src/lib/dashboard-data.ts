import { PaymentStatus, UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function getAdminKpis() {
  const [students, teachers, feeAgg, pendingFees] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.payment.aggregate({ _sum: { amountPaid: true } }),
    prisma.fee.count({ where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] } } })
  ]);

  return {
    students,
    teachers,
    revenue: Number(feeAgg._sum.amountPaid ?? 0),
    pendingFees
  };
}

export async function getEnrollmentTrend() {
  const byMonth = await prisma.student.groupBy({
    by: ['createdAt'],
    _count: true,
    orderBy: { createdAt: 'asc' }
  });

  const map = new Map<string, number>();
  for (const row of byMonth) {
    const month = row.createdAt.toLocaleString('en-US', { month: 'short' });
    map.set(month, (map.get(month) ?? 0) + row._count);
  }

  return Array.from(map.entries()).map(([month, students]) => ({ month, students }));
}

export async function getRecentNotifications(role: UserRole) {
  return prisma.notification.findMany({
    where: { user: { role } },
    take: 6,
    orderBy: { createdAt: 'desc' }
  });
}
