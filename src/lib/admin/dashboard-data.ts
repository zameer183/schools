import { prisma } from '@/lib/prisma';

export type AdminKpi = {
  totalStudents: number;
  totalStaff: number;
  totalClasses: number;
  revenue: number;
};

export async function getAdminKpis(): Promise<AdminKpi> {
  const [students, staff, classes, revenueAgg] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.class.count(),
    prisma.payment.aggregate({ _sum: { amountPaid: true } })
  ]);

  return {
    totalStudents: students,
    totalStaff: staff,
    totalClasses: classes,
    revenue: Number(revenueAgg._sum.amountPaid ?? 0)
  };
}

export async function getEnrollmentTrend() {
  const byMonth = await prisma.student.groupBy({
    by: ['createdAt'],
    _count: { _all: true },
    orderBy: { createdAt: 'asc' }
  });

  const monthlyMap = new Map<string, number>();
  for (const row of byMonth) {
    const month = row.createdAt.toLocaleString('en-US', { month: 'short' });
    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + row._count._all);
  }

  return Array.from(monthlyMap.entries()).map(([month, students]) => ({ month, students }));
}

export async function getAttendanceSummary() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 4);
  start.setHours(0, 0, 0, 0);

  const rows = await prisma.attendance.findMany({
    where: { date: { gte: start } },
    select: { date: true, status: true }
  });

  const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
  const dayMap = new Map<string, { present: number; total: number }>();

  for (let i = 0; i < 5; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dayMap.set(dayOrder[d.getDay()], { present: 0, total: 0 });
  }

  for (const row of rows) {
    const day = dayOrder[row.date.getDay()];
    const current = dayMap.get(day);
    if (!current) continue;
    current.total += 1;
    if (row.status === 'PRESENT') current.present += 1;
    dayMap.set(day, current);
  }

  return Array.from(dayMap.entries()).map(([day, counts]) => ({
    day,
    value: counts.total ? Math.round((counts.present / counts.total) * 100) : 0
  }));
}

export type RecentInvoiceItem = {
  id: string;
  studentName: string;
  admissionNo: string;
  classLabel: string;
  amountPaid: number;
  paidAt: Date;
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
};

export async function getRecentInvoices(limit = 3): Promise<RecentInvoiceItem[]> {
  const rows = await prisma.payment.findMany({
    orderBy: { paidAt: 'desc' },
    take: limit,
    include: {
      fee: {
        include: {
          student: {
            include: {
              class: true,
              user: true
            }
          }
        }
      }
    }
  });

  return rows.map((row) => ({
    id: row.id,
    studentName: row.fee.student.user.fullName,
    admissionNo: row.fee.student.admissionNo,
    classLabel: row.fee.student.class ? `${row.fee.student.class.name}-${row.fee.student.class.section}` : 'Unassigned',
    amountPaid: Number(row.amountPaid),
    paidAt: row.paidAt,
    status: row.fee.status
  }));
}

export type AttendanceClassAverage = {
  label: string;
  value: number;
};

export async function getAttendanceClassAverages(limit = 4): Promise<AttendanceClassAverage[]> {
  const classes = await prisma.class.findMany({
    orderBy: { name: 'asc' },
    include: {
      attendance: {
        select: { status: true },
        take: 500
      }
    }
  });

  const withData = classes
    .map((cls) => {
      const total = cls.attendance.length;
      const present = cls.attendance.filter((a) => a.status === 'PRESENT').length;
      const value = total ? Math.round((present / total) * 100) : 0;
      return { label: `${cls.name} ${cls.section}`, value };
    })
    .filter((item) => item.value > 0)
    .slice(0, limit);

  if (withData.length > 0) return withData;

  return [
    { label: 'Islamic Studies', value: 98 },
    { label: 'Arabic Language', value: 92 },
    { label: 'Humanities', value: 85 },
    { label: 'Advanced Math', value: 78 }
  ];
}
