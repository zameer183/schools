import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminStudentsPageClient from './page.client';

export const dynamic = 'force-dynamic';

type CanonicalFeeStatus = 'PAID' | 'UNPAID' | 'PARTIAL' | 'OVERDUE';

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

function toCanonicalFeeStatus(rawStatus?: string | null): CanonicalFeeStatus {
  if (rawStatus === 'PAID') return 'PAID';
  if (rawStatus === 'PARTIAL') return 'PARTIAL';
  if (rawStatus === 'OVERDUE') return 'OVERDUE';
  return 'UNPAID';
}

const getCachedStudentsData = unstable_cache(
  async () => {
    const [students, classes] = await Promise.all([
      prisma.student.findMany({
        select: {
          id: true,
          admissionNo: true,
          dateOfBirth: true,
          createdAt: true,
          updatedAt: true,
          currentAddress: true,
          emergencyContact: true,
          classId: true,
          fatherName: true,
          aadharNo: true,
          gender: true,
          whatsApp: true,
          schoolName: true,
          rollNumber: true,
          joinDate: true,
          guardianPhone: true,
          attendance: {
            select: { status: true, date: true },
            orderBy: [{ date: 'desc' }],
            take: 30
          },
          class: { select: { id: true, name: true, section: true } },
          user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true } },
          fees: {
            select: {
              title: true,
              amount: true,
              discount: true,
              dueDate: true,
              status: true,
              updatedAt: true,
              payments: {
                select: { amountPaid: true }
              }
            },
            orderBy: [{ createdAt: 'desc' }],
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.class.findMany({
        select: { id: true, name: true, section: true },
        orderBy: [{ name: 'asc' }, { section: 'asc' }]
      })
    ]);

    return { students, classes };
  },
  ['admin-students-page-data'],
  { revalidate: 30 }
);

export default async function AdminStudentsPage() {
  await requireAuth([UserRole.ADMIN]);
  const { students, classes } = await getCachedStudentsData();
  const normalizedStudents = students.map((student) => {
    const latestFee = student.fees?.[0];
    const canonicalStatus = latestFee ? toCanonicalFeeStatus(latestFee.status) : 'UNPAID';
    const normalizedWhatsApp =
      normalizeWhatsAppPk(student.whatsApp) ?? normalizeWhatsAppPk(student.guardianPhone) ?? null;

    return {
      ...student,
      whatsApp: normalizedWhatsApp,
      guardianPhone: normalizeWhatsAppPk(student.guardianPhone) ?? null,
      attendancePercentage: student.attendance.length
        ? Math.round((student.attendance.filter((row) => row.status === 'PRESENT').length / student.attendance.length) * 100)
        : 0,
      feeStatus: canonicalStatus,
      lastActivityAt:
        student.attendance?.[0]?.date ??
        student.fees?.[0]?.updatedAt ??
        student.updatedAt,
      fees: (student.fees ?? []).map((fee) => {
        const dueDateObj = fee.dueDate instanceof Date ? fee.dueDate : new Date(fee.dueDate);
        return {
          title: fee.title,
          dueDate: fee.dueDate,
          amount: fee.amount.toString(),
          discount: fee.discount.toString(),
          status: toCanonicalFeeStatus(fee.status),
          updatedAt: fee.updatedAt,
          totalPaid: fee.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0).toString(),
          remaining: Math.max(
            Number(fee.amount) -
            Number(fee.discount) -
            fee.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0),
            0
          ).toString(),
          month: dueDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        };
      })
    };
  });

  return <AdminStudentsPageClient initialStudents={normalizedStudents} initialClasses={classes} />;
}
