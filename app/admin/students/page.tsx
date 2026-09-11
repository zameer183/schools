import React from 'react';
import { DashboardRouteLoading } from '@/components/ui/dashboard-route-loading';
import { PageHeader } from '@/components/ui';
import { UserRole } from '@prisma/client';
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
  return 'UNPAID';
}

function deriveCanonicalFeeStatus(params: {
  dueDate?: Date | string | null;
  amount: string | number;
  discount: string | number;
  paidAmount: number;
  rawStatus?: string | null;
}): CanonicalFeeStatus {
  const total = Math.max(Number(params.amount) - Number(params.discount), 0);
  const paidAmount = Math.max(Number(params.paidAmount), 0);
  const remaining = Math.max(total - paidAmount, 0);

  if (remaining <= 0 && total > 0) return 'PAID';
  if (paidAmount > 0) return 'PARTIAL';

  return toCanonicalFeeStatus(params.rawStatus);
}

async function getPaginatedStudentsData(where: any, skip: number, take: number, monthStart: Date) {
  const [totalStudents, active, pendingFees, newThisMonth, students, classes] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.count({ where: { user: { isActive: true } } }),
    prisma.student.count({ where: { fees: { some: { status: { in: ['OVERDUE', 'PARTIAL', 'PENDING'] } } } } }),
    prisma.student.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.student.findMany({
      where,
      select: {
        id: true, admissionNo: true, dateOfBirth: true, createdAt: true, updatedAt: true,
        currentAddress: true, emergencyContact: true, classId: true,
        fatherName: true, aadharNo: true, gender: true, whatsApp: true, schoolName: true,
        rollNumber: true, joinDate: true, guardianPhone: true,
        attendance: { select: { status: true, date: true }, orderBy: [{ date: 'desc' }], take: 30 },
        class: { select: { id: true, name: true, section: true } },
        user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true } },
        fees: {
          select: {
            id: true, title: true, amount: true, discount: true, dueDate: true, feeCategory: true,
            feeType: true, fromDate: true, toDate: true, partialFeeSupported: true, collectOnMonthStart: true,
            status: true, updatedAt: true, payments: { select: { amountPaid: true } }
          },
          orderBy: [{ createdAt: 'desc' }], take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
      skip, take
    }),
    prisma.class.findMany({
      select: { id: true, name: true, section: true },
      orderBy: [{ name: 'asc' }, { section: 'asc' }]
    })
  ]);
  return { totalStudents, active, pendingFees, newThisMonth, students, classes };
}

async function StudentListContent(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  await requireAuth([UserRole.ADMIN]);
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search = (searchParams.search as string) || '';
  const classFilter = (searchParams.classId as string) || '';
  const statusFilter = (searchParams.status as string) || 'all';
  const view = (searchParams.view as string) || 'grid';
  const pageSize = view === 'grid' ? 12 : 25;
  const skip = (page - 1) * pageSize;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const where: any = {};
  if (classFilter) {
    where.classId = classFilter;
  }
  if (statusFilter === 'active') where.user = { isActive: true };
  if (statusFilter === 'inactive') where.user = { isActive: false };
  if (statusFilter === 'pending') where.fees = { some: { status: { in: ['OVERDUE', 'PARTIAL', 'PENDING'] } } };
  if (search) {
    where.user = { ...where.user, fullName: { contains: search, mode: 'insensitive' } };
  }

  const data = await getPaginatedStudentsData(where, skip, pageSize, monthStart);
  const { totalStudents, active, pendingFees, newThisMonth, students, classes } = data;
  
  const normalizedStudents = students.map((student) => {
    const latestFee = student.fees?.[0];
    const latestFeePaid = latestFee
      ? latestFee.payments.reduce((sum: number, payment: any) => sum + Number(payment.amountPaid), 0)
      : 0;
    const canonicalStatus = latestFee
      ? deriveCanonicalFeeStatus({
          dueDate: latestFee.dueDate,
          amount: Number(latestFee.amount),
          discount: Number(latestFee.discount),
          paidAmount: latestFeePaid,
          rawStatus: String(latestFee.status)
        })
      : 'UNPAID';
    const normalizedWhatsApp =
      normalizeWhatsAppPk(student.whatsApp) ?? normalizeWhatsAppPk(student.guardianPhone) ?? null;

    return {
      ...student,
      whatsApp: normalizedWhatsApp,
      guardianPhone: normalizeWhatsAppPk(student.guardianPhone) ?? null,
      attendancePercentage: student.attendance.length
        ? Math.round((student.attendance.filter((row: any) => row.status === 'PRESENT').length / student.attendance.length) * 100)
        : 0,
      feeStatus: canonicalStatus,
      lastActivityAt:
        student.attendance?.[0]?.date ??
        student.fees?.[0]?.updatedAt ??
        student.updatedAt,
      fees: (student.fees ?? []).map((fee: any) => {
        const dueDateObj = new Date(fee.dueDate);
        const totalPaid = fee.payments.reduce((sum: number, payment: any) => sum + Number(payment.amountPaid), 0);
        const status = deriveCanonicalFeeStatus({
          dueDate: fee.dueDate,
          amount: Number(fee.amount),
          discount: Number(fee.discount),
          paidAmount: totalPaid,
          rawStatus: String(fee.status)
        });
        return {
          title: fee.title,
          id: fee.id,
          dueDate: fee.dueDate,
          amount: String(fee.amount),
          discount: String(fee.discount),
          feeCategory: fee.feeCategory,
          feeType: fee.feeType,
          fromDate: fee.fromDate,
          toDate: fee.toDate,
          partialFeeSupported: fee.partialFeeSupported,
          collectOnMonthStart: fee.collectOnMonthStart,
          status,
          updatedAt: fee.updatedAt,
          totalPaid: String(totalPaid),
          remaining: String(Math.max(Number(fee.amount) - Number(fee.discount) - totalPaid, 0)),
          month: dueDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        };
      })
    } as any;
  });

  return <AdminStudentsPageClient initialStudents={normalizedStudents} initialClasses={classes as any} totalStudents={totalStudents} stats={{ total: totalStudents, active, pendingFees, newThisMonth }} currentPage={page} pageSize={pageSize} viewMode={view as 'grid' | 'list'} searchQ={search} classIdQ={classFilter} statusQ={statusFilter as any} />;
}


export default function AdminStudentsPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  return (
    <div className="w-full space-y-6">
      <PageHeader title="Student Directory" description="Manage enrolled students and fee records." />
      <React.Suspense fallback={<DashboardRouteLoading title="Loading Students..." hint="Fetching student directory from database..." />}>
        <StudentListContent searchParams={props.searchParams} />
      </React.Suspense>
    </div>
  );
}
