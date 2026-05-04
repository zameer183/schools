import { AttendanceStatus, PaymentStatus, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ensureApiRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { toCsv } from '@/lib/export';

type PeriodKey = 'daily' | 'weekly' | 'monthly';

function parsePeriod(value: string | null): PeriodKey {
  if (value === 'daily' || value === 'weekly' || value === 'monthly') return value;
  return 'monthly';
}

function buildRange(searchParams: URLSearchParams) {
  const periodParam = searchParams.get('period');

  if (periodParam === 'all') {
    return { period: 'all' as const, start: new Date('1970-01-01'), end: new Date('2099-12-31') };
  }

  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  if (fromParam && toParam) {
    const from = new Date(fromParam);
    const to = new Date(toParam);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      return { period: 'custom' as const, start: from, end: to };
    }
  }

  const now = new Date();
  const period = parsePeriod(periodParam);

  if (period === 'daily') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { period, start, end: now };
  }

  if (period === 'weekly') {
    const start = new Date(now);
    const day = start.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);
    return { period, start, end: now };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return { period, start, end: now };
}

function dateOnly(date: Date) {
  return date.toISOString().split('T')[0];
}

function toNumber(value: unknown) {
  if (value == null) return 0;
  return Number(value);
}

async function safeQuery<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[api/reports/export] ${label} failed`, error);
    return fallback;
  }
}

export async function GET(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'results';
  const studentId = searchParams.get('studentId');
  const { period, start, end } = buildRange(searchParams);

  const studentFilter = studentId ? { studentId } : {};

  if (type === 'attendance') {
    const rows = await prisma.attendance.findMany({
      where: { date: { gte: start, lte: end }, ...studentFilter },
      include: { student: { include: { user: true } }, class: true },
      orderBy: { date: 'desc' }
    });

    const csv = toCsv(
      rows.map((row) => ({
        date: dateOnly(row.date),
        student: row.student.user.fullName,
        class: `${row.class.name}-${row.class.section}`,
        status: row.status,
        remarks: row.remarks ?? ''
      }))
    );

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="attendance-${period}.csv"`
      }
    });
  }

  if (type === 'fees') {
    const rows = await prisma.fee.findMany({
      where: {
        ...studentFilter,
        OR: [
          { createdAt: { gte: start, lte: end } },
          { dueDate: { gte: start, lte: end } }
        ]
      },
      include: { student: { include: { user: true } } },
      orderBy: { dueDate: 'asc' }
    });

    const csv = toCsv(
      rows.map((row) => ({
        student: row.student.user.fullName,
        title: row.title,
        dueDate: dateOnly(row.dueDate),
        amount: Number(row.amount),
        status: row.status,
        createdAt: dateOnly(row.createdAt)
      }))
    );

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="fees-${period}.csv"`
      }
    });
  }

  if (type === 'overview') {
    const studentsAdded = await safeQuery('student.count.period', () => prisma.student.count({ where: { createdAt: { gte: start, lte: end } } }), 0);
    const teachersAdded = await safeQuery('teacher.count.period', () => prisma.teacher.count({ where: { createdAt: { gte: start, lte: end } } }), 0);
    const classesAdded = await safeQuery('class.count.period', () => prisma.class.count({ where: { createdAt: { gte: start, lte: end } } }), 0);
    const resultsAdded = await safeQuery('result.count.period', () => prisma.result.count({ where: { createdAt: { gte: start, lte: end } } }), 0);
    const attendanceRows = await safeQuery('attendance.period', () => prisma.attendance.findMany({ where: { date: { gte: start, lte: end } }, select: { status: true } }), []);
    const feesGenerated = await safeQuery('fee.count.period', () => prisma.fee.count({ where: { createdAt: { gte: start, lte: end } } }), 0);
    const paymentsAggregate = await safeQuery(
      'payment.aggregate.period',
      () => prisma.payment.aggregate({ where: { paidAt: { gte: start, lte: end } }, _sum: { amountPaid: true } }),
      { _sum: { amountPaid: null } }
    );
    const dueAggregate = await safeQuery(
      'fee.overdue.aggregate',
      () =>
        prisma.fee.aggregate({
          where: {
            status: { not: PaymentStatus.PAID },
            dueDate: { lte: end }
          },
          _sum: { amount: true }
        }),
      { _sum: { amount: null } }
    );
    const messagesSent = await safeQuery('message.count.period', () => prisma.message.count({ where: { createdAt: { gte: start, lte: end } } }), 0);
    const notificationsSent = await safeQuery('notification.count.period', () => prisma.notification.count({ where: { createdAt: { gte: start, lte: end } } }), 0);
    const progressEntries = await safeQuery('studentProgress.count.period', () => prisma.studentProgress.count({ where: { date: { gte: start, lte: end } } }), 0);

    const attendanceTotal = attendanceRows.length;
    const attendancePresent = attendanceRows.filter((entry) => entry.status === AttendanceStatus.PRESENT).length;
    const attendanceRate = attendanceTotal === 0 ? 0 : Math.round((attendancePresent / attendanceTotal) * 100);

    const metrics = [
      { metric: 'Period', value: String(period).toUpperCase() },
      { metric: 'From', value: dateOnly(start) },
      { metric: 'To', value: dateOnly(end) },
      { metric: 'Students Added', value: studentsAdded },
      { metric: 'Teachers Added', value: teachersAdded },
      { metric: 'Classes Created', value: classesAdded },
      { metric: 'Results Published', value: resultsAdded },
      { metric: 'Attendance Entries', value: attendanceTotal },
      { metric: 'Attendance Rate (%)', value: attendanceRate },
      { metric: 'Fees Generated', value: feesGenerated },
      { metric: 'Collected Fee', value: toNumber(paymentsAggregate._sum.amountPaid) },
      { metric: 'Due Fee', value: toNumber(dueAggregate._sum.amount) },
      { metric: 'Messages Sent', value: messagesSent },
      { metric: 'Notifications Sent', value: notificationsSent },
      { metric: 'Progress Entries', value: progressEntries }
    ];

    const csv = toCsv(metrics);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="overview-${period}.csv"`
      }
    });
  }

  const results = await prisma.result.findMany({
    where: { createdAt: { gte: start, lte: end }, ...studentFilter },
    include: { student: { include: { user: true } }, subject: true, exam: true }
  });

  const csv = toCsv(
    results.map((row) => ({
      exam: row.exam.title,
      examDate: dateOnly(row.exam.examDate),
      student: row.student.user.fullName,
      subject: row.subject.name,
      marks: row.marksObtained,
      grade: row.grade,
      createdAt: dateOnly(row.createdAt)
    }))
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="results-${period}.csv"`
    }
  });
}
