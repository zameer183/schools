import React from 'react';
import { DashboardRouteLoading } from '@/components/ui/dashboard-route-loading';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import {
  BookOpen,
  GraduationCap,
  TrendingUp,
  Users2,
  UserCog2,
  Wallet,
  ClipboardList,
  Bell,
  BarChart3,
  WifiOff,
} from 'lucide-react';
import { EnrollmentAreaChart } from '@/components/admin/admin-charts';
import {
  type AdminKpi,
  getAdminKpis,
  getAttendanceSummary,
  getEnrollmentTrend,
  getRecentInvoices,
  type RecentInvoiceItem,
} from '@/lib/admin/dashboard-data';
import { formatCurrency } from '@/lib/utils';
import { PageHeader, KpiCard, Card, SectionTitle, StatusBadge } from '@/components/ui';


type RestStudent = {
  id: string;
  userId: string;
  admissionNo: string;
  classId: string | null;
  createdAt: string;
};

type RestPayment = {
  id: string;
  feeId: string;
  amountPaid: number | string;
  paidAt: string;
};

type RestFee = {
  id: string;
  studentId: string;
  status: RecentInvoiceItem['status'];
};

type RestUser = {
  id: string;
  fullName: string;
};

type RestClass = {
  id: string;
  name: string;
  section: string;
};

type RestAttendance = {
  date: string;
  status: string;
};

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
  return `in.(${ids.map((id) => `"${id}"`).join(',')})`;
}

async function getAdminDashboardDataViaSupabaseRest() {
  if (process.env.ALLOW_SUPABASE_REST_AUTH_FALLBACK !== '1') {
    throw new Error('Supabase REST dashboard fallback is disabled');
  }

  const [students, teachers, classes, payments, attendanceRows] = await Promise.all([
    supabaseRest<RestStudent>('Student', { select: 'id,userId,admissionNo,classId,createdAt' }),
    supabaseRest<{ id: string }>('Teacher', { select: 'id' }),
    supabaseRest<RestClass>('Class', { select: 'id,name,section' }),
    supabaseRest<RestPayment>('Payment', { select: 'id,feeId,amountPaid,paidAt', order: 'paidAt.desc', limit: '50' }),
    supabaseRest<RestAttendance>('Attendance', {
      select: 'date,status',
      date: `gte.${new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()}`
    })
  ]);

  const kpi: AdminKpi = {
    totalStudents: students.length,
    totalStaff: teachers.length,
    totalClasses: classes.length,
    revenue: payments.reduce((sum, item) => sum + Number(item.amountPaid ?? 0), 0)
  };

  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
  const monthKeys = Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - index));
    return monthFormatter.format(date);
  });
  const enrollmentMap = new Map(monthKeys.map((month) => [month, 0]));
  for (const student of students) {
    const month = monthFormatter.format(new Date(student.createdAt));
    if (enrollmentMap.has(month)) {
      enrollmentMap.set(month, (enrollmentMap.get(month) ?? 0) + 1);
    }
  }
  const enrollmentData = monthKeys.map((month) => ({
    month,
    students: enrollmentMap.get(month) ?? 0
  }));

  const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
  const attendanceMap = new Map<string, { present: number; total: number }>();
  for (let i = 4; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    attendanceMap.set(dayOrder[date.getDay()], { present: 0, total: 0 });
  }
  for (const row of attendanceRows) {
    const day = dayOrder[new Date(row.date).getDay()];
    const current = attendanceMap.get(day);
    if (!current) continue;
    current.total += 1;
    if (row.status === 'PRESENT') current.present += 1;
  }
  const attendanceSummary = Array.from(attendanceMap.entries()).map(([day, counts]) => ({
    day,
    value: counts.total ? Math.round((counts.present / counts.total) * 100) : 0
  }));

  const recentPayments = payments.slice(0, 6);
  const feeIds = Array.from(new Set(recentPayments.map((payment) => payment.feeId).filter(Boolean)));
  const fees = feeIds.length
    ? await supabaseRest<RestFee>('Fee', { select: 'id,studentId,status', id: inFilter(feeIds) })
    : [];
  const feeMap = new Map(fees.map((fee) => [fee.id, fee]));
  const studentIds = Array.from(new Set(fees.map((fee) => fee.studentId).filter(Boolean)));
  const invoiceStudents = studentIds.length
    ? await supabaseRest<RestStudent>('Student', { select: 'id,userId,admissionNo,classId,createdAt', id: inFilter(studentIds) })
    : [];
  const studentMap = new Map(invoiceStudents.map((student) => [student.id, student]));
  const userIds = Array.from(new Set(invoiceStudents.map((student) => student.userId).filter(Boolean)));
  const users = userIds.length
    ? await supabaseRest<RestUser>('User', { select: 'id,fullName', id: inFilter(userIds) })
    : [];
  const userMap = new Map(users.map((user) => [user.id, user]));
  const classMap = new Map(classes.map((item) => [item.id, item]));

  const invoices: RecentInvoiceItem[] = recentPayments.map((payment) => {
    const fee = feeMap.get(payment.feeId);
    const student = fee ? studentMap.get(fee.studentId) : null;
    const user = student ? userMap.get(student.userId) : null;
    const cls = student?.classId ? classMap.get(student.classId) : null;

    return {
      id: payment.id,
      studentName: user?.fullName ?? 'Unknown Student',
      admissionNo: student?.admissionNo ?? 'N/A',
      classLabel: cls ? `${cls.name}-${cls.section}` : 'Unassigned',
      amountPaid: Number(payment.amountPaid ?? 0),
      paidAt: new Date(payment.paidAt),
      status: fee?.status ?? 'PENDING'
    };
  });

  return { kpi, enrollmentData, attendanceSummary, invoices };
}

const getCachedAdminDashboardData = unstable_cache(
  async () => {
    const [kpi, enrollmentData, attendanceSummary, invoices] = await Promise.all([
      getAdminKpis(),
      getEnrollmentTrend(),
      getAttendanceSummary(),
      getRecentInvoices(6),
    ]);
    return { kpi, enrollmentData, attendanceSummary, invoices };
  },
  ['admin-dashboard-page-data'],
  { revalidate: 30 }
);

function DbOfflineBanner() {
  return (
    <div className="w-full min-w-0 space-y-5">
      <section className="rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col items-center py-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fef2f2]">
            <WifiOff className="h-8 w-8 text-[#ef4444]" strokeWidth={1.5} />
          </div>
          <h2 className="font-headline mt-4 text-xl font-bold text-[#111827]">Database Unreachable</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#6b7280]">
            Cannot connect to the database server. Check your internet connection or Supabase project status, then refresh.
          </p>
          <a
            href="/admin"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#111827] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f2937] active:scale-[0.98]"
          >
            Retry
          </a>
        </div>
      </section>
    </div>
  );
}

// 1. DATA FETCHING COMPONENT
async function DashboardContent() {
  const data = await getCachedAdminDashboardData();
  const { kpi, enrollmentData, attendanceSummary, invoices } = data;
  
  const toDate = (value) => (value instanceof Date ? value : new Date(value));
  const avgAttendance = attendanceSummary.length > 0
      ? Math.round(attendanceSummary.reduce((sum, item) => sum + item.value, 0) / attendanceSummary.length)
      : 0;
  const staffEngagement = Math.max(0, Math.min(100, Math.round(avgAttendance * 0.9)));
  const collected = invoices.filter((i) => i.status === 'PAID').reduce((sum, item) => sum + Number(item.amountPaid), 0);
  const activeDue = invoices.filter((i) => i.status !== 'PAID').reduce((sum, item) => sum + Number(item.amountPaid), 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Students" value={kpi.totalStudents} icon={<Users2 className="h-5 w-5" />} color="blue" />
        <KpiCard title="Active Classes" value={kpi.totalClasses} icon={<BookOpen className="h-5 w-5" />} color="emerald" />
        <KpiCard title="Total Staff" value={kpi.totalStaff} icon={<UserCog2 className="h-5 w-5" />} color="amber" />
        <KpiCard title="Total Revenue" value={formatCurrency(kpi.revenue)} icon={<Wallet className="h-5 w-5" />} color="purple" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="space-y-4">
            <h3 className="font-semibold text-[#1F2937]">Enrollment Trend</h3>
            <EnrollmentAreaChart data={enrollmentData} />
          </div>
        </Card>
      </div>
    </>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader title="Dashboard Overview" description="Monitor key performance indicators." />
      <React.Suspense fallback={<DashboardRouteLoading title="Loading Dashboard..." hint="Crunching the numbers..." />}>
        <DashboardContent />
      </React.Suspense>
    </div>
  );
}