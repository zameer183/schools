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
  getAdminKpis,
  getAttendanceSummary,
  getEnrollmentTrend,
  getRecentInvoices,
} from '@/lib/admin/dashboard-data';
import { formatCurrency } from '@/lib/utils';
import { PageHeader, KpiCard, Card, SectionTitle, StatusBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';

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
    data = await getCachedAdminDashboardData();
  } catch {
    return <DbOfflineBanner />;
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
            {quickActions.map((action, idx) => {
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
