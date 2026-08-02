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
  const rows = await prisma.$queryRaw<{ month_key: string; students: number }[]>`
    SELECT
      to_char(date_trunc('month', "createdAt"), 'Mon') AS month_key,
      COUNT(*)::int AS students
    FROM "Student"
    WHERE "createdAt" >= NOW() - INTERVAL '11 months'
    GROUP BY date_trunc('month', "createdAt"), month_key
    ORDER BY date_trunc('month', "createdAt") ASC;
  `;

  return rows.map((row) => ({
    month: row.month_key,
    students: Number(row.students)
  }));
}

export async function getAttendanceSummary() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 4);
  start.setHours(0, 0, 0, 0);

  const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
  const dayMap = new Map<string, { present: number; total: number }>();

  for (let i = 0; i < 5; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dayMap.set(dayOrder[d.getDay()], { present: 0, total: 0 });
  }

  const rows = await prisma.$queryRaw<{ day_date: Date; present_count: number; total_count: number }[]>`
    SELECT
      date_trunc('day', "date") AS day_date,
      COUNT(*) FILTER (WHERE "status" = 'PRESENT')::int AS present_count,
      COUNT(*)::int AS total_count
    FROM "Attendance"
    WHERE "date" >= ${start}
    GROUP BY date_trunc('day', "date")
    ORDER BY day_date ASC;
  `;

  for (const row of rows) {
    const day = dayOrder[new Date(row.day_date).getDay()];
    const current = dayMap.get(day);
    if (!current) continue;
    current.total += Number(row.total_count);
    current.present += Number(row.present_count);
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
  const payments = await prisma.payment.findMany({
    orderBy: { paidAt: 'desc' },
    take: limit,
    select: {
      id: true,
      feeId: true,
      amountPaid: true,
      paidAt: true
    }
  });

  const feeIds = Array.from(new Set(payments.map((payment) => payment.feeId).filter((id): id is string => Boolean(id))));
  if (feeIds.length === 0) return [];

  const fees = await prisma.fee.findMany({
    where: { id: { in: feeIds } },
    select: {
      id: true,
      status: true,
      studentId: true
    }
  });
  const feeMap = new Map(fees.map((fee) => [fee.id, fee]));

  const studentIds = Array.from(new Set(fees.map((fee) => fee.studentId).filter((id): id is string => Boolean(id))));
  const students = studentIds.length
    ? await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: {
          id: true,
          admissionNo: true,
          classId: true,
          userId: true
        }
      })
    : [];
  const studentMap = new Map(students.map((student) => [student.id, student]));

  const userIds = Array.from(new Set(students.map((student) => student.userId).filter((id): id is string => Boolean(id))));
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          fullName: true
        }
      })
    : [];
  const userMap = new Map(users.map((user) => [user.id, user]));

  const classIds = Array.from(new Set(students.map((student) => student.classId).filter((id): id is string => Boolean(id))));
  const classes = classIds.length
    ? await prisma.class.findMany({
        where: { id: { in: classIds } },
        select: {
          id: true,
          name: true,
          section: true
        }
      })
    : [];
  const classMap = new Map(classes.map((cls) => [cls.id, cls]));

  return payments.map((payment) => {
    const fee = feeMap.get(payment.feeId);
    const student = fee ? studentMap.get(fee.studentId) : null;
    const user = student ? userMap.get(student.userId) : null;
    const cls = student?.classId ? classMap.get(student.classId) : null;

    return {
      id: payment.id,
      studentName: user?.fullName ?? 'Unknown Student',
      admissionNo: student?.admissionNo ?? 'N/A',
      classLabel: cls ? `${cls.name}-${cls.section}` : 'Unassigned',
      amountPaid: Number(payment.amountPaid),
      paidAt: payment.paidAt,
      status: fee?.status ?? 'PENDING'
    };
  });
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

  return [];
}
