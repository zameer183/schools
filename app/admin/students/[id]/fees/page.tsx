import { UserRole } from '@prisma/client';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import StudentFeesClient from './fees-client';

export const dynamic = 'force-dynamic';

type StudentFeesPageProps = { params: Promise<{ id: string }> };

type StudentView = {
  id: string;
  admissionNo: string;
  whatsApp: string | null;
  guardianPhone: string | null;
  user: { fullName: string; isActive: boolean };
  class: { name: string; section: string } | null;
};

type FeeView = {
  id: string;
  title: string;
  dueDate: string;
  amount: number;
  discount: number;
  status: string;
  payments: Array<{
    id: string;
    amountPaid: number;
    method: string;
    paidAt: string;
    transactionRef: string | null;
  }>;
};

type FeesPayload = {
  student: StudentView;
  fees: FeeView[];
  totalAssigned: number;
  totalPaid: number;
  totalRemaining: number;
  totalOverdue: number;
};

function isDatabaseConnectionError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'PrismaClientInitializationError' ||
      error.message.includes("Can't reach database server") ||
      error.message.includes('Timed out fetching a new connection') ||
      error.message.includes('Connection terminated unexpectedly'))
  );
}

function isLocalRestFallbackEnabled() {
  return process.env.FORCE_SUPABASE_REST_DATA_FALLBACK === '1';
}

async function supabaseRest<T>(table: string, params: Record<string, string>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase REST fallback is not configured');
  }

  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase REST ${table} failed with ${response.status}: ${text}`);
  }

  return (await response.json()) as T[];
}

function inFilter(ids: string[]) {
  return `in.(${ids.join(',')})`;
}

async function loadFeesViaRest(studentId: string): Promise<FeesPayload | null> {
  const [student] = await supabaseRest<{
    id: string;
    userId: string;
    admissionNo: string;
    whatsApp: string | null;
    guardianPhone: string | null;
    classId: string | null;
  }>('Student', {
    select: 'id,userId,admissionNo,whatsApp,guardianPhone,classId',
    id: `eq.${studentId}`,
    limit: '1'
  });
  if (!student) return null;

  const [users, classes, fees] = await Promise.all([
    supabaseRest<{ id: string; fullName: string; isActive: boolean }>('User', {
      select: 'id,fullName,isActive',
      id: `eq.${student.userId}`,
      limit: '1'
    }).catch(() => []),
    student.classId
      ? supabaseRest<{ id: string; name: string; section: string }>('Class', {
          select: 'id,name,section',
          id: `eq.${student.classId}`,
          limit: '1'
        }).catch(() => [])
      : Promise.resolve([]),
    supabaseRest<{
      id: string;
      title: string;
      dueDate: string;
      amount: string | number;
      discount: string | number;
      status: string;
    }>('Fee', {
      select: 'id,title,dueDate,amount,discount,status,studentId',
      studentId: `eq.${student.id}`,
      order: 'dueDate.desc'
    }).catch(() => []),
  ]);

  const feeIds = fees.map((fee) => fee.id);
  const feePayments = feeIds.length
    ? await supabaseRest<{
        id: string;
        feeId: string;
        amountPaid: string | number;
        method: string;
        paidAt: string;
        transactionRef: string | null;
      }>('Payment', {
        select: 'id,feeId,amountPaid,method,paidAt,transactionRef',
        feeId: inFilter(feeIds)
      }).catch(() => [])
      : [];

  const paymentsByFeeId = new Map<string, FeeView['payments']>();
  for (const payment of feePayments) {
    paymentsByFeeId.set(payment.feeId, [...(paymentsByFeeId.get(payment.feeId) ?? []), {
      id: payment.id,
      amountPaid: Number(payment.amountPaid),
      method: payment.method,
      paidAt: payment.paidAt,
      transactionRef: payment.transactionRef ?? null
    }]);
  }

  const serializedFees = fees.map((fee) => {
    const amount = Number(fee.amount ?? 0);
    const discount = Number(fee.discount ?? 0);
    const feePaymentsList = paymentsByFeeId.get(fee.id) ?? [];
    return {
      id: fee.id,
      title: fee.title,
      dueDate: fee.dueDate,
      amount,
      discount,
      status: fee.status,
      payments: feePaymentsList
    };
  });

  const totalAssigned = serializedFees.reduce((sum, fee) => sum + (fee.amount - fee.discount), 0);
  const totalPaid = serializedFees.reduce((sum, fee) => sum + fee.payments.reduce((paymentSum, payment) => paymentSum + payment.amountPaid, 0), 0);
  const totalRemaining = totalAssigned - totalPaid;
  const totalOverdue = totalRemaining;

  return {
    student: {
      id: student.id,
      admissionNo: student.admissionNo,
      whatsApp: student.whatsApp,
      guardianPhone: student.guardianPhone,
      user: users[0] ?? { fullName: 'Unknown Student', isActive: false },
      class: classes[0] ?? null
    },
    fees: serializedFees,
    totalAssigned,
    totalPaid,
    totalRemaining,
    totalOverdue
  };
}

async function loadFeesViaPrisma(studentId: string): Promise<FeesPayload | null> {
  const [student, fees] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        admissionNo: true,
        whatsApp: true,
        guardianPhone: true,
        user: { select: { fullName: true, isActive: true } },
        class: { select: { name: true, section: true } }
      }
    }),
    prisma.fee.findMany({
      where: { studentId },
      select: {
        id: true,
        title: true,
        dueDate: true,
        amount: true,
        discount: true,
        status: true,
        payments: {
          select: { id: true, amountPaid: true, method: true, paidAt: true, transactionRef: true }
        }
      },
      orderBy: { dueDate: 'desc' }
    })
  ]);

  if (!student) return null;

  const serializedFees = fees.map((f) => ({
    id: f.id,
    title: f.title,
    dueDate: f.dueDate instanceof Date ? f.dueDate.toISOString() : f.dueDate,
    amount: typeof f.amount === 'number' ? f.amount : Number(f.amount),
    discount: typeof f.discount === 'number' ? f.discount : Number(f.discount),
    status: f.status,
    payments: f.payments.map((p) => ({
      id: p.id,
      amountPaid: typeof p.amountPaid === 'number' ? p.amountPaid : Number(p.amountPaid),
      method: p.method,
      paidAt: p.paidAt.toISOString(),
      transactionRef: p.transactionRef ?? null
    }))
  }));

  const totalAssigned = serializedFees.reduce((sum, f) => sum + (f.amount - f.discount), 0);
  const totalPaid = serializedFees.reduce((sum, f) => sum + f.payments.reduce((s, p) => s + p.amountPaid, 0), 0);
  const totalRemaining = totalAssigned - totalPaid;
  const totalOverdue = totalRemaining;

  return {
    student,
    fees: serializedFees,
    totalAssigned,
    totalPaid,
    totalRemaining,
    totalOverdue
  };
}

export default async function StudentFeesPage({ params }: StudentFeesPageProps) {
  await requireAuth([UserRole.ADMIN]);
  const { id } = await params;

  try {
    const data = await loadFeesViaPrisma(id);
    if (!data) notFound();
    return <StudentFeesClient {...data} />;
  } catch (error) {
    console.error('[admin/student-fees] prisma load failed', error);
    try {
      const restData = await loadFeesViaRest(id);
      if (!restData) notFound();
      return <StudentFeesClient {...restData} />;
    } catch (restError) {
      console.error('[admin/student-fees] rest fallback failed', restError);
      if (!isDatabaseConnectionError(error) && !isLocalRestFallbackEnabled()) {
        throw error;
      }
      notFound();
    }
  }
}
