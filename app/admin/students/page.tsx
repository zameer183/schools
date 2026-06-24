import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminStudentsPageClient from './page.client';

export const dynamic = 'force-dynamic';

type CanonicalFeeStatus = 'PAID' | 'UNPAID' | 'PARTIAL' | 'OVERDUE';

type RestStudent = {
  id: string;
  userId: string;
  admissionNo: string;
  dateOfBirth: string | null;
  createdAt: string;
  updatedAt: string;
  currentAddress: string | null;
  emergencyContact: string | null;
  classId: string | null;
  fatherName: string | null;
  aadharNo: string | null;
  gender: string | null;
  whatsApp: string | null;
  schoolName: string | null;
  rollNumber: string | null;
  joinDate: string | null;
  guardianPhone: string | null;
};

type RestUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
};

type RestClass = {
  id: string;
  name: string;
  section: string;
};

type RestAttendance = {
  studentId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  date: string;
};

type RestFee = {
  id: string;
  studentId: string;
  title: string;
  amount: string | number;
  discount: string | number;
  dueDate: string;
  feeCategory: string | null;
  feeType: string | null;
  fromDate: string | null;
  toDate: string | null;
  partialFeeSupported: boolean;
  collectOnMonthStart: boolean;
  status: string;
  updatedAt: string;
  createdAt: string;
};

type RestPayment = {
  feeId: string;
  amountPaid: string | number;
};

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

function toAttendanceStatus(rawStatus: string): 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' {
  if (rawStatus === 'PRESENT' || rawStatus === 'ABSENT' || rawStatus === 'LATE' || rawStatus === 'EXCUSED') {
    return rawStatus;
  }
  return 'ABSENT';
}

function isDatabaseConnectionError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'PrismaClientInitializationError' ||
      error.message.includes("Can't reach database server") ||
      error.message.includes('Timed out fetching a new connection'))
  );
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
    throw new Error(`Supabase REST ${table} failed with ${response.status}`);
  }

  return (await response.json()) as T[];
}

function inFilter(ids: string[]) {
  return `in.(${ids.join(',')})`;
}

async function getStudentsDataViaSupabaseRest() {
  const [students, classes] = await Promise.all([
    supabaseRest<RestStudent>('Student', {
      select: 'id,userId,admissionNo,dateOfBirth,createdAt,updatedAt,currentAddress,emergencyContact,classId,fatherName,aadharNo,gender,whatsApp,schoolName,rollNumber,joinDate,guardianPhone',
      order: 'createdAt.desc'
    }),
    supabaseRest<RestClass>('Class', {
      select: 'id,name,section',
      order: 'name.asc,section.asc'
    })
  ]);

  const studentIds = students.map((student) => student.id);
  const userIds = Array.from(new Set(students.map((student) => student.userId).filter(Boolean)));
  const [users, attendanceRows, feeRows] = await Promise.all([
    userIds.length
      ? supabaseRest<RestUser>('User', {
          select: 'id,fullName,email,phone,isActive',
          id: inFilter(userIds)
        })
      : Promise.resolve([]),
    studentIds.length
      ? supabaseRest<RestAttendance>('Attendance', {
          select: 'studentId,status,date',
          studentId: inFilter(studentIds),
          order: 'date.desc',
          limit: '3000'
        })
      : Promise.resolve([]),
    studentIds.length
      ? supabaseRest<RestFee>('Fee', {
          select: 'id,studentId,title,amount,discount,dueDate,feeCategory,feeType,fromDate,toDate,partialFeeSupported,collectOnMonthStart,status,updatedAt,createdAt',
          studentId: inFilter(studentIds),
          order: 'createdAt.desc',
          limit: '1000'
        })
      : Promise.resolve([])
  ]);

  const latestFeeByStudentId = new Map<string, RestFee>();
  for (const fee of feeRows) {
    if (!latestFeeByStudentId.has(fee.studentId)) {
      latestFeeByStudentId.set(fee.studentId, fee);
    }
  }

  const latestFeeIds = Array.from(latestFeeByStudentId.values()).map((fee) => fee.id);
  const payments = latestFeeIds.length
    ? await supabaseRest<RestPayment>('Payment', {
        select: 'feeId,amountPaid',
        feeId: inFilter(latestFeeIds)
      })
    : [];

  const paymentsByFeeId = new Map<string, RestPayment[]>();
  for (const payment of payments) {
    paymentsByFeeId.set(payment.feeId, [...(paymentsByFeeId.get(payment.feeId) ?? []), payment]);
  }

  const attendanceByStudentId = new Map<string, RestAttendance[]>();
  for (const row of attendanceRows) {
    const current = attendanceByStudentId.get(row.studentId) ?? [];
    if (current.length < 30) {
      attendanceByStudentId.set(row.studentId, [...current, row]);
    }
  }

  const userById = new Map(users.map((user) => [user.id, user]));
  const classById = new Map(classes.map((cls) => [cls.id, cls]));

  const enrichedStudents = students.map((student) => {
    const fee = latestFeeByStudentId.get(student.id);
    return {
      ...student,
      user: userById.get(student.userId) ?? {
        id: student.userId,
        fullName: 'Unknown Student',
        email: '',
        phone: null,
        isActive: false
      },
      class: student.classId ? classById.get(student.classId) ?? null : null,
      attendance: (attendanceByStudentId.get(student.id) ?? []).map((row) => ({
        status: toAttendanceStatus(row.status),
        date: row.date
      })),
      fees: fee
        ? [{
            id: fee.id,
            title: fee.title,
            amount: String(fee.amount),
            discount: String(fee.discount),
            dueDate: fee.dueDate,
            feeCategory: fee.feeCategory,
            feeType: fee.feeType,
            fromDate: fee.fromDate,
            toDate: fee.toDate,
            partialFeeSupported: fee.partialFeeSupported,
            collectOnMonthStart: fee.collectOnMonthStart,
            status: fee.status,
            updatedAt: fee.updatedAt,
            payments: paymentsByFeeId.get(fee.id) ?? []
          }]
        : []
    };
  });

  return { students: enrichedStudents, classes };
}

async function getStudentsData() {
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
            id: true,
            title: true,
            amount: true,
            discount: true,
            dueDate: true,
            feeCategory: true,
            feeType: true,
            fromDate: true,
            toDate: true,
            partialFeeSupported: true,
            collectOnMonthStart: true,
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
}

export default async function AdminStudentsPage() {
  await requireAuth([UserRole.ADMIN]);
  let data: Awaited<ReturnType<typeof getStudentsDataViaSupabaseRest>>;
  try {
    data = process.env.FORCE_SUPABASE_REST_DATA_FALLBACK === '1'
      ? await getStudentsDataViaSupabaseRest()
      : await getStudentsData() as unknown as Awaited<ReturnType<typeof getStudentsDataViaSupabaseRest>>;
  } catch (error) {
    if (!isDatabaseConnectionError(error)) throw error;
    data = await getStudentsDataViaSupabaseRest();
  }

  const { students, classes } = data;
  const normalizedStudents = students.map((student) => {
    const latestFee = student.fees?.[0];
    const latestFeePaid = latestFee
      ? latestFee.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0)
      : 0;
    const canonicalStatus = latestFee
      ? deriveCanonicalFeeStatus({
          dueDate: latestFee.dueDate,
          amount: latestFee.amount,
          discount: latestFee.discount,
          paidAmount: latestFeePaid,
          rawStatus: latestFee.status
        })
      : 'UNPAID';
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
        const dueDateObj = new Date(fee.dueDate);
        const totalPaid = fee.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0);
        const status = deriveCanonicalFeeStatus({
          dueDate: fee.dueDate,
          amount: fee.amount,
          discount: fee.discount,
          paidAmount: totalPaid,
          rawStatus: fee.status
        });
        return {
          title: fee.title,
          id: fee.id,
          dueDate: fee.dueDate,
          amount: fee.amount.toString(),
          discount: fee.discount.toString(),
          feeCategory: fee.feeCategory,
          feeType: fee.feeType,
          fromDate: fee.fromDate,
          toDate: fee.toDate,
          partialFeeSupported: fee.partialFeeSupported,
          collectOnMonthStart: fee.collectOnMonthStart,
          status,
          updatedAt: fee.updatedAt,
          totalPaid: totalPaid.toString(),
          remaining: Math.max(
            Number(fee.amount) -
            Number(fee.discount) -
            totalPaid,
            0
          ).toString(),
          month: dueDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        };
      })
    };
  });

  return <AdminStudentsPageClient initialStudents={normalizedStudents} initialClasses={classes} />;
}
