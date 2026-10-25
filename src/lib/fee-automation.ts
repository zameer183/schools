import { PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type ReminderRuleId = 'UNPAID' | 'OVERDUE';

export type FeeReminderItem = {
  feeId: string;
  title: string;
  dueDate: string;
  amountDue: string;
  reasons: ReminderRuleId[];
};

export type FeeReminderStudent = {
  studentId: string;
  studentName: string;
  className: string | null;
  classSection: string | null;
  schoolName?: string | null;
  whatsApp: string | null;
  hasWhatsApp: boolean;
  reminders: FeeReminderItem[];
  hasUnpaid: boolean;
  hasOverdue: boolean;
};

type ReminderRuleContext = {
  dueDate: Date;
  amountDue: number;
  todayStart: Date;
};

type ReminderRule = {
  id: ReminderRuleId;
  shouldRemind: (ctx: ReminderRuleContext) => boolean;
};

const reminderRules: ReminderRule[] = [
  {
    id: 'UNPAID',
    shouldRemind: ({ amountDue }) => amountDue > 0,
  },
  {
    id: 'OVERDUE',
    shouldRemind: () => false,
  },
];

function normalizeWhatsAppPk(raw?: string | null) {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  while (digits.startsWith('00')) digits = digits.slice(2);

  if (digits.startsWith('92')) {
    digits = digits.slice(2);
    if (digits.startsWith('0')) digits = digits.slice(1);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length === 11 && digits.startsWith('03')) {
    digits = digits.slice(1);
  }

  if (digits.length === 10 && digits.startsWith('3')) {
    return `+92${digits}`;
  }

  return null;
}

export async function getFeeReminderCandidates(asOfDate = new Date()): Promise<FeeReminderStudent[]> {
  const todayStart = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate());

  const fees = await prisma.fee.findMany({
    where: {
      status: { not: PaymentStatus.PAID },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      amount: true,
      discount: true,
      payments: { select: { amountPaid: true } },
      student: {
        select: {
          id: true,
          whatsApp: true,
          guardianPhone: true,
          schoolName: true,
          user: { select: { fullName: true } },
          class: { select: { name: true, section: true } },
        },
      },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  });

  const grouped = new Map<string, FeeReminderStudent>();

  for (const fee of fees) {
    const totalPaid = fee.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0);
    const amountDue = Math.max(Number(fee.amount) - Number(fee.discount) - totalPaid, 0);
    if (amountDue <= 0) continue;

    const reasons = reminderRules
      .filter((rule) => rule.shouldRemind({ amountDue, dueDate: fee.dueDate, todayStart }))
      .map((rule) => rule.id);

    if (!reasons.length) continue;

    const studentId = fee.student.id;
    if (!grouped.has(studentId)) {
      const normalizedWhatsApp = normalizeWhatsAppPk(fee.student.whatsApp);
      const normalizedGuardianPhone = normalizeWhatsAppPk(fee.student.guardianPhone);
      const reminderPhone = normalizedWhatsApp ?? normalizedGuardianPhone;

      grouped.set(studentId, {
        studentId,
        studentName: fee.student.user.fullName,
        className: fee.student.class?.name ?? null,
        classSection: fee.student.class?.section ?? null,
        schoolName: fee.student.schoolName ?? null,
        whatsApp: reminderPhone,
        hasWhatsApp: Boolean(reminderPhone),
        reminders: [],
        hasUnpaid: false,
        hasOverdue: false,
      });
    }

    const entry = grouped.get(studentId);
    if (!entry) continue;

    entry.reminders.push({
      feeId: fee.id,
      title: fee.title,
      dueDate: fee.dueDate.toISOString(),
      amountDue: amountDue.toFixed(2),
      reasons,
    });
    entry.hasUnpaid = entry.hasUnpaid || reasons.includes('UNPAID');
    entry.hasOverdue = entry.hasOverdue || reasons.includes('OVERDUE');
  }

  return Array.from(grouped.values());
}

export async function runFeeAutomation(targetDate = new Date(), filterStudentId?: string) {
  const currentMonthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 0, 0, 0, 0);

  const students = await prisma.student.findMany({
    where: filterStudentId ? { id: filterStudentId } : undefined,
    include: {
      user: { select: { fullName: true, isActive: true } },
      fees: { orderBy: { dueDate: 'desc' } }
    }
  });

  let created = 0;
  let skipped = 0;

  // Maximum lookback: up to 24 months before current month to prevent runaway loops
  const minAllowedDate = new Date(targetDate.getFullYear() - 2, targetDate.getMonth(), 1, 0, 0, 0, 0);

  for (const student of students) {
    if (student.user && student.user.isActive === false) {
      skipped++;
      continue;
    }

    // If student was closed and later re-opened on a new date,
    // start generating fees from the new re-join date forward!
    const isReopened = Boolean(student.rejoinDate && (!student.leaveDate || student.rejoinDate >= student.leaveDate));
    const rawStartDate = isReopened && student.rejoinDate
      ? student.rejoinDate
      : (student.joinDate || student.createdAt || targetDate);
    let studentStartMonth = new Date(rawStartDate.getFullYear(), rawStartDate.getMonth(), 1, 0, 0, 0, 0);

    if (studentStartMonth < minAllowedDate) {
      studentStartMonth = minAllowedDate;
    }

    if (studentStartMonth > currentMonthStart) {
      skipped++;
      continue;
    }

    const latestTuitionFee =
      student.fees.find(
        (f) =>
          f.feeCategory === 'TUITION' ||
          f.title.toLowerCase().includes('tuition') ||
          f.title.toLowerCase().includes('monthly')
      ) || student.fees[0];

    const amount = latestTuitionFee ? Number(latestTuitionFee.amount) : 2500;
    const discount = latestTuitionFee ? Number(latestTuitionFee.discount) : 0;
    const feeCategory = latestTuitionFee?.feeCategory || 'TUITION';
    const feeType = latestTuitionFee?.feeType || 'MONTHLY';

    // Iterate month-by-month from studentStartMonth up to currentMonthStart
    let year = studentStartMonth.getUTCFullYear();
    let month = studentStartMonth.getUTCMonth();
    const endYear = currentMonthStart.getUTCFullYear();
    const endMonth = currentMonthStart.getUTCMonth();

    while (year < endYear || (year === endYear && month <= endMonth)) {
      const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
      const monthLabel = monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

      const existing = await prisma.fee.findFirst({
        where: {
          studentId: student.id,
          dueDate: { gte: monthStart, lte: monthEnd }
        }
      });

      if (existing) {
        skipped++;
      } else {
        const isPastMonth = monthStart < currentMonthStart;
        const initialStatus = isPastMonth ? PaymentStatus.OVERDUE : PaymentStatus.PENDING;

        await prisma.fee.create({
          data: {
            studentId: student.id,
            title: `Monthly Tuition Fee - ${monthLabel}`,
            dueDate: monthStart,
            amount,
            discount,
            feeCategory,
            feeType,
            partialFeeSupported: true,
            collectOnMonthStart: true,
            status: initialStatus
          }
        });
        created++;
      }

      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
  }

  // Auto-mark past unpaid fees (strictly before this month) from PENDING to OVERDUE
  const overdueResult = await prisma.fee.updateMany({
    where: {
      ...(filterStudentId ? { studentId: filterStudentId } : {}),
      dueDate: { lt: currentMonthStart },
      status: PaymentStatus.PENDING
    },
    data: {
      status: PaymentStatus.OVERDUE
    }
  });

  return { overdueMarked: overdueResult.count, feesCreated: created, feesSkipped: skipped };
}

