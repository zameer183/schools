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

function buildMonthRange(monthParam: string | null) {
  const now = new Date();
  const parsed = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearStr, monthStr] = parsed.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const start = new Date(year, month - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, month, 0);
  end.setHours(23, 59, 59, 999);
  return { monthKey: parsed, start, end };
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
  const classId = searchParams.get('classId');
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

  if (type === 'finance-individual') {
    if (!studentId) {
      return new NextResponse('studentId is required', { status: 400 });
    }

    const year = Number(searchParams.get('year') || new Date().getFullYear());
    const from = new Date(year, 0, 1);
    const to = new Date(year, 11, 31, 23, 59, 59, 999);

    const fees = await prisma.fee.findMany({
      where: { studentId, dueDate: { gte: from, lte: to } },
      include: { student: { include: { user: true } }, payments: true },
      orderBy: { dueDate: 'asc' }
    });

    const monthRows = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(year, i, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      fee: 0,
      discount: 0,
      paid: 0,
      unpaid: 0
    }));

    for (const fee of fees) {
      const idx = fee.dueDate.getMonth();
      const amount = Number(fee.amount || 0);
      const discount = Number(fee.discount || 0);
      const net = Math.max(amount - discount, 0);
      const paid = fee.payments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
      const unpaid = Math.max(net - paid, 0);
      monthRows[idx].fee += net;
      monthRows[idx].discount += discount;
      monthRows[idx].paid += paid;
      monthRows[idx].unpaid += unpaid;
    }

    const csv = toCsv(
      monthRows.map((row) => ({
        student: fees[0]?.student.user.fullName ?? studentId,
        month: row.month,
        fee: row.fee,
        discount: row.discount,
        paid: row.paid,
        unpaid: row.unpaid
      }))
    );

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="finance-individual-${year}.csv"`
      }
    });
  }

  if (type === 'finance-class') {
    if (!classId) {
      return new NextResponse('classId is required', { status: 400 });
    }

    const { monthKey, start: monthStart, end: monthEnd } = buildMonthRange(searchParams.get('month'));
    const classRecord = await prisma.class.findUnique({ where: { id: classId }, select: { name: true, section: true } });

    const students = await prisma.student.findMany({
      where: { classId },
      select: {
        user: { select: { fullName: true } },
        fees: {
          where: { dueDate: { gte: monthStart, lte: monthEnd } },
          select: { amount: true, discount: true, payments: { select: { amountPaid: true } } }
        }
      },
      orderBy: { user: { fullName: 'asc' } }
    });

    const rows = students.map((student) => {
      const fee = student.fees.reduce((sum, item) => sum + Math.max(Number(item.amount || 0) - Number(item.discount || 0), 0), 0);
      const paid = student.fees.reduce(
        (sum, item) => sum + item.payments.reduce((inner, p) => inner + Number(p.amountPaid || 0), 0),
        0
      );
      const unpaid = Math.max(fee - paid, 0);
      return {
        class: classRecord ? `${classRecord.name} ${classRecord.section}` : classId,
        month: monthKey,
        student: student.user.fullName,
        fee,
        paid,
        unpaid,
        status: unpaid > 0 ? 'UNPAID' : 'PAID'
      };
    });

    const csv = toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="finance-class-${monthKey}.csv"`
      }
    });
  }

  if (type === 'finance-all') {
    const { monthKey, start: monthStart, end: monthEnd } = buildMonthRange(searchParams.get('month'));
    const students = await prisma.student.findMany({
      where: classId ? { classId } : {},
      select: {
        user: { select: { fullName: true } },
        class: { select: { name: true, section: true } },
        fees: {
          where: { dueDate: { gte: monthStart, lte: monthEnd } },
          select: { amount: true, discount: true, payments: { select: { amountPaid: true } } }
        }
      },
      orderBy: { user: { fullName: 'asc' } }
    });

    const rows = students.map((student) => {
      const fee = student.fees.reduce((sum, item) => sum + Math.max(Number(item.amount || 0) - Number(item.discount || 0), 0), 0);
      const paid = student.fees.reduce(
        (sum, item) => sum + item.payments.reduce((inner, p) => inner + Number(p.amountPaid || 0), 0),
        0
      );
      const unpaid = Math.max(fee - paid, 0);
      return {
        month: monthKey,
        student: student.user.fullName,
        class: student.class ? `${student.class.name} ${student.class.section}` : 'Unassigned',
        fee,
        paid,
        unpaid,
        status: unpaid > 0 ? 'UNPAID' : 'PAID'
      };
    });

    const csv = toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="finance-all-${monthKey}.csv"`
      }
    });
  }

  if (type === 'finance-higher') {
    const { monthKey, start: monthStart, end: monthEnd } = buildMonthRange(searchParams.get('month'));
    const higherFilter =
      classId
        ? { classId }
        : {
            class: {
              is: {
                OR: [
                  { name: { contains: 'hifz', mode: 'insensitive' as const } },
                  { name: { contains: 'session', mode: 'insensitive' as const } },
                  { section: { contains: 'hifz', mode: 'insensitive' as const } },
                  { section: { contains: 'session', mode: 'insensitive' as const } }
                ]
              }
            }
          };

    const students = await prisma.student.findMany({
      where: higherFilter,
      select: {
        user: { select: { fullName: true } },
        class: { select: { name: true, section: true } },
        fees: {
          where: { dueDate: { gte: monthStart, lte: monthEnd } },
          select: { amount: true, discount: true, payments: { select: { amountPaid: true } } }
        }
      },
      orderBy: { user: { fullName: 'asc' } }
    });

    const rows = students.map((student) => {
      const fee = student.fees.reduce((sum, item) => sum + Math.max(Number(item.amount || 0) - Number(item.discount || 0), 0), 0);
      const paid = student.fees.reduce(
        (sum, item) => sum + item.payments.reduce((inner, p) => inner + Number(p.amountPaid || 0), 0),
        0
      );
      const unpaid = Math.max(fee - paid, 0);
      return {
        month: monthKey,
        student: student.user.fullName,
        class: student.class ? `${student.class.name} ${student.class.section}` : 'Unassigned',
        fee,
        paid,
        unpaid,
        status: unpaid > 0 ? 'UNPAID' : 'PAID'
      };
    });

    const csv = toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="finance-higher-${monthKey}.csv"`
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
    const dueFeeRows = await safeQuery(
      'fee.outstanding.findMany',
      () =>
        prisma.fee.findMany({
          where: {
            status: { not: PaymentStatus.PAID },
            dueDate: { lte: end }
          },
          select: {
            amount: true,
            discount: true,
            payments: { select: { amountPaid: true } }
          }
        }),
      []
    );
    const dueFeeTotal = dueFeeRows.reduce((sum, fee) => {
      const gross = Number(fee.amount || 0);
      const discount = Number(fee.discount || 0);
      const paid = fee.payments.reduce((inner, payment) => inner + Number(payment.amountPaid || 0), 0);
      const outstanding = Math.max(gross - discount - paid, 0);
      return sum + outstanding;
    }, 0);
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
      { metric: 'Due Fee', value: dueFeeTotal },
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
