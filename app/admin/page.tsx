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

export const dynamic = 'force-dynamic';

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

export default async function AdminDashboardPage() {
  let data: Awaited<ReturnType<typeof getCachedAdminDashboardData>> | null = null;
  try {
    data = process.env.FORCE_SUPABASE_REST_DATA_FALLBACK === '1'
      ? await getAdminDashboardDataViaSupabaseRest()
      : await getCachedAdminDashboardData();
  } catch (error) {
    if (!isDatabaseConnectionError(error)) {
      return <DbOfflineBanner />;
    }

    try {
      data = await getAdminDashboardDataViaSupabaseRest();
    } catch (fallbackError) {
      console.error('[admin/dashboard] REST fallback failed', fallbackError);
      return <DbOfflineBanner />;
    }
  }

  const { kpi, enrollmentData, attendanceSummary, invoices } = data;

  const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));

  const avgAttendance =
    attendanceSummary.length > 0
      ? Math.round(
          attendanceSummary.reduce((sum, item) => sum + item.value, 0) / attendanceSummary.length
        )
      : 0;

  const staffEngagement = Math.max(0, Math.min(100, Math.round(avgAttendance * 0.9)));

  const activeDue = invoices
    .filter((inv) => inv.status !== 'PAID')
    .reduce((sum, inv) => sum + inv.amountPaid, 0);

  const collected = invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.amountPaid, 0);

  const quickActions = [
    { label: 'Enroll Student', href: '/admin/students/enroll', icon: GraduationCap, color: 'text-[#10B981]', bg: 'bg-[#D1FAE5]' },
    { label: 'Attendance',     href: '/admin/attendance',      icon: ClipboardList,  color: 'text-[#1F5A5C]', bg: 'bg-[#f0f9ff]' },
    { label: 'Reports',        href: '/admin/reports',         icon: BarChart3,      color: 'text-[#1F5A5C]', bg: 'bg-[#E0EBEC]' },
    { label: 'Notifications',  href: '/admin/notifications',   icon: Bell,           color: 'text-[#D69E3F]', bg: 'bg-[#F5E6CC]' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── PAGE HEADER ── */}
      <PageHeader
        title="Admin Dashboard"
        subtitle="Live institution monitoring — students, staff, fees and attendance at a glance."
        badge={
          <span className="flex items-center gap-1.5 rounded-full bg-[#D1FAE5] px-3 py-1.5 text-xs font-bold text-[#10B981]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
            </span>
            Live
          </span>
        }
      />

      {/* ── KPI CARDS ── */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Link href="/admin/students" className="transition active:scale-[0.98]">
          <KpiCard variant="success" icon={<GraduationCap />} label="Total Students" value={kpi.totalStudents} />
        </Link>
        <Link href="/admin/teachers" className="transition active:scale-[0.98]">
          <KpiCard variant="primary" icon={<UserCog2 />} label="Total Staff" value={kpi.totalStaff} />
        </Link>
        <Link href="/admin/classes" className="transition active:scale-[0.98]">
          <KpiCard variant="primary" icon={<BookOpen />} label="Total Classes" value={kpi.totalClasses} />
        </Link>
        <Link href="/admin/finance" className="transition active:scale-[0.98]">
          <KpiCard variant="accent" icon={<Wallet />} label="Revenue Collected" value={formatCurrency(kpi.revenue)} />
        </Link>
      </section>

      {/* ── QUICK ACTIONS ── */}
      <Card>
        <div className="space-y-4">
          <SectionTitle title="Quick Actions" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const isEnrollStudent = action.label === 'Enroll Student';
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-4 sm:py-3 transition hover:shadow-md active:scale-[0.97] ${
                    isEnrollStudent
                      ? 'col-span-2 sm:col-span-1 bg-gradient-to-r from-[#004649] to-[#1b5e62] text-white'
                      : `${action.bg} ${action.color}`
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isEnrollStudent ? 'text-white' : action.color}`} />
                  <span className={`text-sm font-semibold ${isEnrollStudent ? 'text-white' : action.color}`}>{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── ATTENDANCE ── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Student attendance */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D1FAE5]">
                  <Users2 className="h-4 w-4 text-[#10B981]" />
                </div>
                <p className="text-sm font-bold text-[#1F2937]">Student Attendance</p>
              </div>
              <Link href="/admin/attendance" className="text-xs font-semibold text-[#10B981] hover:underline">
                View
              </Link>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold leading-none text-[#1F2937]">{avgAttendance}%</p>
              <StatusBadge variant={avgAttendance >= 75 ? 'success' : avgAttendance >= 50 ? 'pending' : 'danger'}>
                {avgAttendance >= 75 ? 'Good' : avgAttendance >= 50 ? 'Average' : 'Low'}
              </StatusBadge>
            </div>
            <div className="h-2 w-full rounded-full bg-[#E5E7EB]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${avgAttendance}%`,
                  backgroundColor: avgAttendance >= 75 ? '#10B981' : avgAttendance >= 50 ? '#D69E3F' : '#ef4444',
                }}
              />
            </div>
            <p className="text-xs text-[#6B7280]">
              Out of <span className="font-semibold text-[#1F2937]">{kpi.totalStudents}</span> enrolled students
            </p>
          </div>
        </Card>

        {/* Staff attendance */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0EBEC]">
                  <UserCog2 className="h-4 w-4 text-[#1F5A5C]" />
                </div>
                <p className="text-sm font-bold text-[#1F2937]">Staff Engagement</p>
              </div>
              <Link href="/admin/teachers" className="text-xs font-semibold text-[#1F5A5C] hover:underline">
                View
              </Link>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold leading-none text-[#1F2937]">{staffEngagement}%</p>
              <StatusBadge variant={staffEngagement >= 75 ? 'info' : staffEngagement >= 50 ? 'pending' : 'danger'}>
                {staffEngagement >= 75 ? 'Good' : staffEngagement >= 50 ? 'Average' : 'Low'}
              </StatusBadge>
            </div>
            <div className="h-2 w-full rounded-full bg-[#E5E7EB]">
              <div
                className="h-full rounded-full bg-[#1F5A5C] transition-all"
                style={{ width: `${staffEngagement}%` }}
              />
            </div>
            <p className="text-xs text-[#6B7280]">
              Out of <span className="font-semibold text-[#1F2937]">{kpi.totalStaff}</span> staff members
            </p>
          </div>
        </Card>
      </div>

      {/* ── FEE OVERVIEW ── */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5E6CC]">
                <Wallet className="h-4 w-4 text-[#D69E3F]" />
              </div>
              <h3 className="font-semibold text-[#1F2937]">Fee Overview</h3>
            </div>
            <Link href="/admin/finance" className="text-xs font-semibold text-[#D69E3F] hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-[#FEE2E2] p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#991B1B]">Pending / Overdue</p>
              <p className="mt-2 text-2xl font-bold text-[#991B1B]">{formatCurrency(activeDue)}</p>
              <p className="mt-1 text-xs text-[#DC2626]">
                {invoices.filter((i) => i.status !== 'PAID').length} unpaid records
              </p>
            </div>
            <div className="rounded-lg bg-[#D1FAE5] p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#065F46]">Collected</p>
              <p className="mt-2 text-2xl font-bold text-[#065F46]">{formatCurrency(collected)}</p>
              <p className="mt-1 text-xs text-[#10B981]">
                {invoices.filter((i) => i.status === 'PAID').length} paid records
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── ENROLLMENT CHART ── */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0EBEC]">
                <TrendingUp className="h-4 w-4 text-[#1F5A5C]" />
              </div>
              <h3 className="font-semibold text-[#1F2937]">Enrollment Trend</h3>
            </div>
            <span className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">Last 12 months</span>
          </div>
          <EnrollmentAreaChart data={enrollmentData} />
        </div>
      </Card>

      {/* ── RECENT PAYMENTS ── */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F9FAFB]">
                <Wallet className="h-4 w-4 text-[#6B7280]" />
              </div>
              <h3 className="font-semibold text-[#1F2937]">Recent Payments</h3>
            </div>
            <Link
              href="/admin/finance"
              className="text-xs font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
            >
              View all →
            </Link>
          </div>

          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Wallet className="h-10 w-10 text-[#E5E7EB]" />
              <p className="mt-2 text-sm text-[#9CA3AF]">No payment records yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D1FAE5] text-[11px] font-bold text-[#10B981]">
                    {invoice.studentName.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1F2937]">{invoice.studentName}</p>
                    <p className="text-[11px] text-[#9CA3AF]">
                      {invoice.classLabel} · {toDate(invoice.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="text-sm font-bold text-[#1F2937]">{formatCurrency(invoice.amountPaid)}</p>
                    <StatusBadge
                      variant={
                        invoice.status === 'PAID' ? 'success' :
                        invoice.status === 'OVERDUE' ? 'danger' :
                        invoice.status === 'PARTIAL' ? 'info' :
                        'pending'
                      }
                    >
                      {invoice.status}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

    </div>
  );
}
