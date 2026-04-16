import {
  CalendarDays,
  ChevronRight,
  DollarSign,
  GraduationCap,
  MoreVertical,
  TrendingUp,
  Users,
  UserCog
} from 'lucide-react';
import { AttendanceBarChartCard, EnrollmentAreaChart } from '@/components/admin/admin-charts';
import {
  getAdminKpis,
  getAttendanceClassAverages,
  getAttendanceSummary,
  getEnrollmentTrend,
  getRecentInvoices
} from '@/lib/admin/dashboard-data';
import { formatCurrency } from '@/lib/utils';

function formatShortDate(value: Date) {
  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function InvoiceStatus({ status }: { status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE' }) {
  const classes =
    status === 'PAID'
      ? 'bg-[#afedf2]/40 text-[#004649]'
      : status === 'PARTIAL'
        ? 'bg-[#ffddb8]/50 text-[#865300]'
        : status === 'OVERDUE'
          ? 'bg-[#ffdad6] text-[#ba1a1a]'
          : 'bg-[#ffddb8]/30 text-[#865300]';

  return <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${classes}`}>{status}</span>;
}

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [kpi, enrollmentData, attendanceSummary, attendanceClasses, invoices] = await Promise.all([
    getAdminKpis(),
    getEnrollmentTrend(),
    getAttendanceSummary(),
    getAttendanceClassAverages(),
    getRecentInvoices(5)
  ]);

  const mobileRevenue = formatCurrency(kpi.revenue);

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden space-y-8 lg:block">
        <section className="flex items-end justify-between">
          <div>
            <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[#004649]">Institutional Dashboard</h2>
            <p className="mt-1 text-sm text-[#3f4849]">Welcome back, Admin. Here is what&apos;s happening at Manarah Institute today.</p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-[#865300] transition hover:bg-[#865300]/5">
              Broadcast Message
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#004649] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:shadow-lg">
              Add Student
            </button>
          </div>
        </section>

        {/* KPI Cards */}
        <section className="grid grid-cols-4 gap-6">
          <article className="bg-white rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,70,73,0.04)] relative overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-[#004649]/5 text-[#004649] rounded-lg">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-[#004649] flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> +12%
              </span>
            </div>
            <p className="text-[#6f7979] text-xs font-bold tracking-wider uppercase">Total Students</p>
            <h3 className="font-headline text-3xl font-extrabold text-[#191c1d] mt-1">{kpi.totalStudents.toLocaleString()}</h3>
          </article>

          <article className="bg-white rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,70,73,0.04)]">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-[#865300]/5 text-[#865300] rounded-lg">
                <UserCog className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[#6f7979] text-xs font-bold tracking-wider uppercase">Total Staff</p>
            <h3 className="font-headline text-3xl font-extrabold text-[#191c1d] mt-1">{kpi.totalStaff.toLocaleString()}</h3>
            <p className="text-[10px] text-[#6f7979] mt-2">Active teaching & admin team</p>
          </article>

          <article className="bg-white rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,70,73,0.04)]">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-[#004649]/5 text-[#004649] rounded-lg">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[#6f7979] text-xs font-bold tracking-wider uppercase">Total Classes</p>
            <h3 className="font-headline text-3xl font-extrabold text-[#191c1d] mt-1">{kpi.totalClasses.toLocaleString()}</h3>
            <p className="text-[10px] text-[#6f7979] mt-2">Active across academic blocks</p>
          </article>

          <article className="bg-white rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,70,73,0.04)]">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-[#865300]/5 text-[#865300] rounded-lg">
                <DollarSign className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-[#865300] flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> 8.4%
              </span>
            </div>
            <p className="text-[#6f7979] text-xs font-bold tracking-wider uppercase">Monthly Revenue</p>
            <h3 className="font-headline text-3xl font-extrabold text-[#191c1d] mt-1">{formatCurrency(kpi.revenue)}</h3>
            <p className="text-[10px] text-[#6f7979] mt-2">Compared to previous month</p>
          </article>
        </section>

        {/* Charts */}
        <section className="grid grid-cols-12 gap-8">
          <article className="col-span-8 bg-white rounded-3xl p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-headline text-xl font-extrabold text-[#004649]">Attendance Trends</h3>
                <p className="text-sm text-[#6f7979]">Average daily presence over the last 30 days</p>
              </div>
              <div className="flex gap-2">
                <span className="bg-[#edeeef] border-none text-xs font-bold rounded-lg px-3 py-1.5 text-[#3f4849]">Last 30 Days</span>
              </div>
            </div>
            <AttendanceBarChartCard data={attendanceSummary} />
          </article>

          <article className="col-span-4 bg-white rounded-3xl p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
            <h3 className="font-headline text-xl font-extrabold text-[#004649] mb-1">Student Demographics</h3>
            <p className="text-sm text-[#6f7979] mb-6">By Academic Department</p>
            <div className="space-y-5">
              {attendanceClasses.slice(0, 4).map((item, i) => {
                const colors = ['bg-[#004649]', 'bg-[#1b5e62]', 'bg-[#865300]', 'bg-[#afedf2]'];
                const dotColors = ['#004649', '#1b5e62', '#865300', '#afedf2'];
                return (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: dotColors[i % 4] }} />
                        <span className="text-[#191c1d]">{item.label}</span>
                      </div>
                      <span className="text-[#6f7979]">{item.value}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#edeeef]">
                      <div className={`h-full rounded-full ${colors[i % 4]}`} style={{ width: `${Math.min(item.value, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        {/* Financial Pulse */}
        <section className="grid grid-cols-12 gap-8">
          <article className="col-span-9 bg-white rounded-3xl p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-headline text-xl font-extrabold text-[#004649]">Financial Pulse</h3>
                <p className="text-sm text-[#6f7979]">Enrollment and revenue trends</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-[#004649]" />
                  <span className="text-xs font-bold text-[#6f7979]">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-[#bfc8c9]" />
                  <span className="text-xs font-bold text-[#6f7979]">Expenses</span>
                </div>
              </div>
            </div>
            <EnrollmentAreaChart data={enrollmentData} />
          </article>

          <article className="col-span-3 bg-white rounded-3xl p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
            <h3 className="font-headline text-lg font-extrabold text-[#004649] mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {invoices.slice(0, 4).map((invoice) => {
                const initials = invoice.studentName
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((v) => v[0]?.toUpperCase() ?? '')
                  .join('');
                return (
                  <div key={invoice.id} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#afedf2]/40 text-[10px] font-bold text-[#004649]">
                      {initials}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#191c1d] leading-snug">
                        Fee received from {invoice.studentName}
                      </p>
                      <p className="text-[10px] text-[#6f7979] mt-0.5">{formatShortDate(invoice.paidAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        {/* Recent Admissions */}
        <section className="bg-white rounded-3xl p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-headline text-xl font-extrabold text-[#004649]">Recent Admissions</h3>
              <p className="text-sm text-[#6f7979]">Showing latest {invoices.length} student registrations</p>
            </div>
            <button className="inline-flex items-center gap-1 text-sm font-bold text-[#865300]">
              View All Students
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="w-full">
            <div className="grid grid-cols-12 gap-4 px-4 pb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6f7979]">
              <span className="col-span-5">Student Name</span>
              <span className="col-span-3">Grade / Dept</span>
              <span className="col-span-2">Enrollment Date</span>
              <span className="col-span-2 text-right">Actions</span>
            </div>
            <div className="space-y-1">
              {invoices.map((invoice) => {
                const initials = invoice.studentName
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((v) => v[0]?.toUpperCase() ?? '')
                  .join('');

                return (
                  <div key={invoice.id} className="group grid grid-cols-12 items-center gap-4 rounded-xl px-4 py-3 transition hover:bg-[#f3f4f5]">
                    <div className="col-span-5 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#afedf2]/40 text-xs font-bold text-[#004649]">{initials}</div>
                      <div>
                        <p className="text-sm font-bold text-[#191c1d]">{invoice.studentName}</p>
                        <p className="text-[10px] uppercase tracking-[0.08em] text-[#6f7979]">ID: {invoice.admissionNo}</p>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-[#3f4849]">{invoice.classLabel}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-[#3f4849]">{formatShortDate(invoice.paidAt)}</p>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-3">
                      <InvoiceStatus status={invoice.status} />
                      <button className="opacity-0 transition group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4 text-[#6f7979]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[#edeeef] pt-4 text-xs text-[#6f7979]">
              <span>Page 1 of 12</span>
              <div className="flex gap-2">
                <button className="rounded-lg border border-[#bfc8c9]/40 px-3 py-1.5 font-semibold transition hover:bg-[#f3f4f5]">&larr;</button>
                <button className="rounded-lg border border-[#bfc8c9]/40 bg-[#004649] px-3 py-1.5 font-semibold text-white">1</button>
                <button className="rounded-lg border border-[#bfc8c9]/40 px-3 py-1.5 font-semibold transition hover:bg-[#f3f4f5]">2</button>
                <button className="rounded-lg border border-[#bfc8c9]/40 px-3 py-1.5 font-semibold transition hover:bg-[#f3f4f5]">&rarr;</button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Mobile Layout */}
      <div className="space-y-5 pb-28 lg:hidden">
        <section className="mt-2">
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[#004649]">Academic Overview</h2>
          <p className="mt-1 text-sm text-[#3f4849]">Monitor your institution&apos;s pulse in real-time.</p>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <article className="bg-white rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,70,73,0.04)]">
            <div className="p-2 bg-[#004649]/5 text-[#004649] rounded-lg w-fit mb-3">
              <GraduationCap className="h-5 w-5" />
            </div>
            <p className="font-headline text-3xl font-extrabold text-[#191c1d]">{kpi.totalStudents}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f7979]">Total Students</p>
          </article>
          <article className="bg-white rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,70,73,0.04)]">
            <div className="p-2 bg-[#865300]/5 text-[#865300] rounded-lg w-fit mb-3">
              <UserCog className="h-5 w-5" />
            </div>
            <p className="font-headline text-3xl font-extrabold text-[#191c1d]">{kpi.totalStaff}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f7979]">Total Staff</p>
          </article>
          <article className="bg-white rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,70,73,0.04)]">
            <div className="p-2 bg-[#004649]/5 text-[#004649] rounded-lg w-fit mb-3">
              <Users className="h-5 w-5" />
            </div>
            <p className="font-headline text-3xl font-extrabold text-[#191c1d]">{kpi.totalClasses}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f7979]">Total Classes</p>
          </article>
          <article className="bg-white rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,70,73,0.04)]">
            <div className="p-2 bg-[#865300]/5 text-[#865300] rounded-lg w-fit mb-3">
              <DollarSign className="h-5 w-5" />
            </div>
            <p className="font-headline text-2xl font-extrabold text-[#191c1d]">{mobileRevenue}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f7979]">Total Revenue</p>
          </article>
        </section>

        <section className="bg-white rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,70,73,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-headline text-lg font-bold text-[#004649]">Attendance Overview</h3>
            <span className="rounded-full bg-[#865300]/10 px-2 py-1 text-[10px] font-bold uppercase text-[#865300]">Weekly</span>
          </div>
          <AttendanceBarChartCard data={attendanceSummary} />
        </section>

        <section className="bg-white rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,70,73,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-headline text-lg font-bold text-[#004649]">Recent Admissions</h3>
            <button className="text-xs font-bold text-[#865300]">View All</button>
          </div>
          <div className="space-y-4">
            {invoices.slice(0, 3).map((invoice) => {
              const initials = invoice.studentName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((v) => v[0]?.toUpperCase() ?? '')
                .join('');
              return (
                <div key={invoice.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#afedf2]/40 text-xs font-bold text-[#004649]">{initials}</div>
                    <div>
                      <p className="text-sm font-bold text-[#191c1d]">{invoice.studentName}</p>
                      <p className="text-[10px] text-[#6f7979]">{invoice.classLabel}</p>
                    </div>
                  </div>
                  <InvoiceStatus status={invoice.status} />
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,70,73,0.04)]">
          <h3 className="font-headline text-lg font-bold text-[#004649] mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {invoices.slice(0, 3).map((invoice) => (
              <div key={invoice.id + '-activity'} className="flex items-start gap-3">
                <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-[#afedf2]/40 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-[#004649]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#191c1d]">Fee received from {invoice.studentName}</p>
                  <p className="text-[10px] text-[#6f7979] mt-0.5">{formatShortDate(invoice.paidAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
