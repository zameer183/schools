'use server';

import { CampaignItemStatus, CampaignStatus, CampaignType, PaymentStatus, UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFeeReminderCandidates, runFeeAutomation, type FeeReminderStudent } from '@/lib/fee-automation';
import { cleanWhatsAppPhone } from '@/lib/whatsapp-client';

export type AbsentStudentData = {
  attendanceId: string;
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  guardianName: string | null;
  guardianPhone: string | null;
  hasWhatsApp: boolean;
  remarks: string | null;
};

export type AutomationDashboardData = {
  stats: {
    totalPendingAmount: number;
    pendingFeeCount: number;
    studentsWithUnpaidFees: number;
    studentsWithWhatsApp: number;
    todayAbsentCount: number;
    totalActiveStudents: number;
    totalParents: number;
    recentCampaignsCount: number;
  };
  feeCandidates: FeeReminderStudent[];
  todayAbsents: AbsentStudentData[];
  recentCampaigns: {
    id: string;
    createdAt: string;
    type: CampaignType;
    status: CampaignStatus;
    totalStudents: number;
    totalWithWhatsApp: number;
    totalSkipped: number;
    itemsCount: number;
  }[];
};

function getUtcDayRange(dateString?: string) {
  const now = new Date();
  const dateStr = dateString || now.toISOString().split('T')[0];
  const [y, m, d] = dateStr.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  return { start, end, dateStr };
}

export async function getAutomationOverviewData(dateStr?: string): Promise<AutomationDashboardData> {
  await requireAuth([UserRole.ADMIN]);

  const { start, end } = getUtcDayRange(dateStr);

  const [
    pendingAggregate,
    feeCandidates,
    todayAbsentRows,
    activeStudentsCount,
    parentsCount,
    recentCampaigns,
  ] = await Promise.all([
    prisma.fee.aggregate({
      where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    getFeeReminderCandidates(),
    prisma.attendance.findMany({
      where: {
        date: { gte: start, lte: end },
        status: 'ABSENT',
      },
      include: {
        student: {
          select: {
            id: true,
            whatsApp: true,
            guardianPhone: true,
            guardianName: true,
            schoolName: true,
            user: { select: { fullName: true } },
            class: { select: { name: true, section: true } },
          },
        },
      },
      orderBy: { student: { user: { fullName: 'asc' } } },
    }),
    prisma.student.count({
      where: { user: { isActive: true } },
    }),
    prisma.parent.count(),
    prisma.campaign.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { items: true },
        },
      },
    }),
  ]);

  const candidatesWithWhatsApp = feeCandidates.filter((c) => c.hasWhatsApp).length;

  const todayAbsents: AbsentStudentData[] = todayAbsentRows.map((row) => {
    const rawPhone = row.student.whatsApp || row.student.guardianPhone;
    const cleanPhone = cleanWhatsAppPhone(rawPhone);
    return {
      attendanceId: row.id,
      studentId: row.student.id,
      studentName: row.student.user.fullName,
      className: row.student.class?.name || 'Unassigned',
      section: row.student.class?.section || '-',
      guardianName: row.student.guardianName || null,
      guardianPhone: cleanPhone || null,
      hasWhatsApp: Boolean(cleanPhone && cleanPhone.length >= 10),
      remarks: row.remarks || null,
    };
  });

  return {
    stats: {
      totalPendingAmount: Number(pendingAggregate._sum.amount ?? 0),
      pendingFeeCount: pendingAggregate._count._all,
      studentsWithUnpaidFees: feeCandidates.length,
      studentsWithWhatsApp: candidatesWithWhatsApp,
      todayAbsentCount: todayAbsents.length,
      totalActiveStudents: activeStudentsCount,
      totalParents: parentsCount,
      recentCampaignsCount: recentCampaigns.length,
    },
    feeCandidates,
    todayAbsents,
    recentCampaigns: recentCampaigns.map((c) => ({
      id: c.id,
      createdAt: c.createdAt.toISOString(),
      type: c.type,
      status: c.status,
      totalStudents: c.totalStudents,
      totalWithWhatsApp: c.totalWithWhatsApp,
      totalSkipped: c.totalSkipped,
      itemsCount: c._count.items,
    })),
  };
}

export async function getAbsentStudentsByDateAction(dateStr: string): Promise<AbsentStudentData[]> {
  await requireAuth([UserRole.ADMIN]);
  const { start, end } = getUtcDayRange(dateStr);

  const rows = await prisma.attendance.findMany({
    where: {
      date: { gte: start, lte: end },
      status: 'ABSENT',
    },
    include: {
      student: {
        select: {
          id: true,
          whatsApp: true,
          guardianPhone: true,
          guardianName: true,
          schoolName: true,
          user: { select: { fullName: true } },
          class: { select: { name: true, section: true } },
        },
      },
    },
    orderBy: { student: { user: { fullName: 'asc' } } },
  });

  return rows.map((row) => {
    const rawPhone = row.student.whatsApp || row.student.guardianPhone;
    const cleanPhone = cleanWhatsAppPhone(rawPhone);
    return {
      attendanceId: row.id,
      studentId: row.student.id,
      studentName: row.student.user.fullName,
      className: row.student.class?.name || 'Unassigned',
      section: row.student.class?.section || '-',
      guardianName: row.student.guardianName || null,
      guardianPhone: cleanPhone || null,
      hasWhatsApp: Boolean(cleanPhone && cleanPhone.length >= 10),
      remarks: row.remarks || null,
    };
  });
}

export async function createFeeReminderCampaignAction(): Promise<{
  success: boolean;
  campaignId: string;
  totalStudents: number;
  totalWithWhatsApp: number;
}> {
  await requireAuth([UserRole.ADMIN]);

  const candidates = await getFeeReminderCandidates();
  if (candidates.length === 0) {
    throw new Error('No students with pending fees found.');
  }

  const totalWithWhatsApp = candidates.filter((c) => c.hasWhatsApp).length;
  const totalSkipped = candidates.length - totalWithWhatsApp;

  const campaign = await prisma.$transaction(async (tx) => {
    const newCamp = await tx.campaign.create({
      data: {
        type: CampaignType.REMINDER,
        status: CampaignStatus.APPROVED,
        totalStudents: candidates.length,
        totalWithWhatsApp,
        totalSkipped,
      },
      select: { id: true },
    });

    await tx.campaignItem.createMany({
      data: candidates.map((student) => {
        const totalAmountDue = student.reminders.reduce(
          (sum, reminder) => sum + Number(reminder.amountDue),
          0
        );
        const earliestDueDate = student.reminders.length > 0 ? student.reminders[0].dueDate : '';
        const dueDateFormatted = earliestDueDate
          ? new Date(earliestDueDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Due Immediately';

        const message = [
          `*Assalam-o-Alaikum / Greetings*`,
          `Dear Guardian of *${student.studentName}* (${student.className || 'Student'}),`,
          ``,
          `This is a fee reminder from *${student.schoolName || 'Manarah Institute'}*.`,
          `Outstanding Fee Dues: *PKR ${totalAmountDue.toLocaleString()}*`,
          `Due Date: *${dueDateFormatted}*`,
          `Pending Items: ${student.reminders.length}`,
          ``,
          `Kindly clear the pending dues at your earliest convenience. If you have already paid, please ignore this notice.`,
          ``,
          `_Thank you - Accounts Department_`,
        ].join('\n');

        return {
          campaignId: newCamp.id,
          studentId: student.studentId,
          studentName: student.studentName,
          whatsApp: student.whatsApp,
          hasWhatsApp: student.hasWhatsApp,
          message,
          templateData: {
            studentName: student.studentName,
            amountDue: totalAmountDue.toFixed(2),
            dueDate: earliestDueDate || new Date().toISOString(),
            schoolName: student.schoolName || 'Manarah Institute',
            month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          },
          status: student.hasWhatsApp ? CampaignItemStatus.PENDING : CampaignItemStatus.SKIPPED,
        };
      }),
    });

    return newCamp;
  });

  return {
    success: true,
    campaignId: campaign.id,
    totalStudents: candidates.length,
    totalWithWhatsApp,
  };
}

export async function markCampaignItemSentAction(campaignId: string, itemId: string) {
  await requireAuth([UserRole.ADMIN]);

  const updated = await prisma.campaignItem.updateMany({
    where: {
      id: itemId,
      campaignId,
      status: CampaignItemStatus.PENDING,
    },
    data: {
      status: CampaignItemStatus.SENT,
      sentAt: new Date(),
    },
  });

  return { success: updated.count > 0 };
}

export async function runManualFeeAutomationAction() {
  await requireAuth([UserRole.ADMIN]);
  const result = await runFeeAutomation();
  return result;
}
