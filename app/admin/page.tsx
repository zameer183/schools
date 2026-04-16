import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  DoorOpen,
  Download,
  GraduationCap,
  MoreVertical,
  ReceiptText,
  School,
  TrendingUp,
  Users
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
      ? 'bg-[#bcebef] text-[#124346]'
      : status === 'PARTIAL'
        ? 'bg-[#ffdcbd] text-[#895100]'
        : status === 'OVERDUE'
          ? 'bg-[#ffdad6] text-[#93000a]'
          : 'bg-[#fff0d8] text-[#895100]';

  return <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${classes}`}>{status}</span>;
}

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [kpi, enrollmentData, attendanceSummary, attendanceClasses, invoices] = await Promise.all([
    getAdminKpis(),
    getEnrollmentTrend(),
    getAttendanceSummary(),
    getAttendanceClassAverages(),
    getRecentInvoices(3)
  ]);

  const mobileRevenue = formatCurrency(kpi.revenue);

  return (
    <>
      <div className="hidden space-y-8 lg:block">
        <section className="flex items-end justify-between">
          <div>
            <h2 className="font-headline text-5xl font-extrabold tracking-[-0.03em] text-[#124346]">Academic Overview</h2>
            <p className="mt-2 text-base font-medium text-[#5f6b6d]">Welcome back, here is what&apos;s happening today.</p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center gap-2 rounded-xl border border-[#c0c8c9]/40 bg-white px-4 py-2 text-sm font-semibold text-[#124346]">
              <CalendarDays className="h-4 w-4" />
              Last 30 Days
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#124346] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-[#124346]/20">
              <Download className="h-4 w-4" />
              Export Report
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl bg-white p-6 shadow-[0px_12px_32px_rgba(26,28,28,0.04)]">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#bcebef] text-[#124346]">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-[#ffdcbd]/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#895100]">Total Students</span>
            </div>
            <h3 className="font-headline text-5xl font-extrabold tracking-[-0.03em] text-[#124346]">{kpi.totalStudents.toLocaleString()}</h3>
            <p className="mt-2 flex items-center gap-1 text-sm font-medium text-emerald-700">
              <TrendingUp className="h-4 w-4" />
              Live enrollment signal
            </p>
          </article>

          <article className="rounded-xl bg-white p-6 shadow-[0px_12px_32px_rgba(26,28,28,0.04)]">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffdcbd] text-[#895100]">
                <Users className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-[#ffdcbd]/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#895100]">Active Staff</span>
            </div>
            <h3 className="font-headline text-5xl font-extrabold tracking-[-0.03em] text-[#895100]">{kpi.totalStaff.toLocaleString()}</h3>
            <p className="mt-2 text-sm font-medium text-[#6e7778]">Current teaching and admin team</p>
          </article>

          <article className="rounded-xl bg-white p-6 shadow-[0px_12px_32px_rgba(26,28,28,0.04)]">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#a1cfd3] text-[#124346]">
                <DoorOpen className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-[#ffdcbd]/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#895100]">Active Classes</span>
            </div>
            <h3 className="font-headline text-5xl font-extrabold tracking-[-0.03em] text-[#124346]">{kpi.totalClasses.toLocaleString()}</h3>
            <p className="mt-2 text-sm font-medium text-[#6e7778]">Academic sections currently running</p>
          </article>

          <article className="rounded-xl bg-[#124346] p-6 text-white shadow-[0px_12px_32px_rgba(26,28,28,0.10)]">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white">
                <ReceiptText className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#fead51]">Total Revenue</span>
            </div>
            <h3 className="font-headline text-5xl font-extrabold tracking-[-0.03em] text-white">{formatCurrency(kpi.revenue)}</h3>
            <p className="mt-2 flex items-center gap-1 text-sm font-medium text-[#bcebef]">
              <CheckCircle2 className="h-4 w-4" />
              Finance status synced
            </p>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-8 xl:grid-cols-3">
          <article className="xl:col-span-2 rounded-xl bg-white p-8 shadow-[0px_12px_32px_rgba(26,28,28,0.04)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-headline text-2xl font-bold text-[#124346]">Enrollment Trends</h3>
                <p className="text-sm text-[#6e7778]">New registrations this year</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-[#5f6b6d]">
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#124346]" /> Primary</span>
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#895100]" /> Secondary</span>
              </div>
            </div>
            <EnrollmentAreaChart data={enrollmentData} />
          </article>

          <article className="rounded-xl bg-[#edeeee] p-8">
            <h3 className="font-headline text-2xl font-bold text-[#124346]">Attendance Avg.</h3>
            <div className="mt-6 space-y-5">
              {attendanceClasses.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1a1c1c]">
                    <span>{item.label}</span>
                    <span>{item.value}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-[#124346]" style={{ width: `${Math.min(item.value, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-lg border border-[#124346]/10 bg-white/50 p-4 text-xs italic text-[#5f6b6d]">
              Attendance quality is pulled from current records and refreshed live.
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-8 xl:grid-cols-4">
          <article className="xl:col-span-3 rounded-xl bg-white p-8 shadow-[0px_12px_32px_rgba(26,28,28,0.04)]">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="font-headline text-2xl font-bold text-[#124346]">Recent Academic Invoices</h3>
              <button className="inline-flex items-center gap-1 text-sm font-bold text-[#895100]">
                View All Records
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              {invoices.map((invoice) => {
                const initials = invoice.studentName
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((v) => v[0]?.toUpperCase() ?? '')
                  .join('');

                return (
                  <div key={invoice.id} className="group flex items-center justify-between rounded-xl p-4 transition hover:bg-[#f3f4f3]">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#bcebef] text-sm font-bold text-[#124346]">{initials}</div>
                      <div>
                        <h4 className="text-sm font-bold text-[#1a1c1c]">{invoice.studentName}</h4>
                        <p className="text-[10px] uppercase tracking-[0.1em] text-[#6e7778]">
                          ID: {invoice.admissionNo} - {invoice.classLabel}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#1a1c1c]">{formatCurrency(invoice.amountPaid)}</p>
                        <p className="text-[10px] text-[#7a8486]">{formatShortDate(invoice.paidAt)}</p>
                      </div>
                      <InvoiceStatus status={invoice.status} />
                      <button className="opacity-0 transition group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4 text-[#7a8486]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-[#2d5a5e] p-8 text-white">
            <div>
              <h3 className="font-headline text-xl font-bold">Academic Insight</h3>
              <p className="mt-4 text-sm leading-relaxed text-[#cde4e7]">
                Retention trend is improving after curriculum alignment. Track attendance + fee collections together for stronger forecasting.
              </p>
            </div>
            <button className="mt-8 rounded-lg bg-white py-2 text-xs font-bold text-[#124346]">Review Strategy</button>
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full border-[20px] border-white/10" />
          </article>
        </section>
      </div>

      <div className="space-y-6 pb-24 lg:hidden">
        <section className="mt-2 flex items-end justify-between">
          <div>
            <span className="block text-sm font-semibold uppercase tracking-[0.15em] text-[#895100]">Administrative Portal</span>
            <h2 className="font-headline text-4xl font-extrabold tracking-[-0.03em] text-[#124346]">Academic Overview</h2>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-[#bcebef] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#124346]">
            <span className="h-2 w-2 rounded-full bg-[#124346]" />
            Live
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <article className="relative h-40 overflow-hidden rounded-[1.1rem] bg-white p-5 shadow-[0px_12px_32px_rgba(26,28,28,0.04)]">
            <GraduationCap className="h-9 w-9 rounded-xl bg-[#bcebef] p-2 text-[#124346]" />
            <p className="mt-7 font-headline text-4xl font-extrabold text-[#124346]">{kpi.totalStudents}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#707979]">Total Students</p>
          </article>
          <article className="relative h-40 overflow-hidden rounded-[1.1rem] bg-white p-5 shadow-[0px_12px_32px_rgba(26,28,28,0.04)]">
            <School className="h-9 w-9 rounded-xl bg-[#ffdcbd] p-2 text-[#895100]" />
            <p className="mt-7 font-headline text-4xl font-extrabold text-[#1a1c1c]">{kpi.totalStaff}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#707979]">Total Staff</p>
          </article>
          <article className="relative h-40 overflow-hidden rounded-[1.1rem] bg-white p-5 shadow-[0px_12px_32px_rgba(26,28,28,0.04)]">
            <DoorOpen className="h-9 w-9 rounded-xl bg-[#cce8ea] p-2 text-[#284143]" />
            <p className="mt-7 font-headline text-4xl font-extrabold text-[#1a1c1c]">{kpi.totalClasses}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#707979]">Total Classes</p>
          </article>
          <article className="relative h-40 overflow-hidden rounded-[1.1rem] bg-[#124346] p-5 text-white shadow-[0px_12px_32px_rgba(18,67,70,0.22)]">
            <ReceiptText className="h-9 w-9 rounded-xl bg-[#2d5a5e] p-2 text-white" />
            <p className="mt-7 font-headline text-3xl font-extrabold">{mobileRevenue}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">Revenue</p>
          </article>
        </section>

        <section className="rounded-[1.1rem] bg-white p-6 shadow-[0px_12px_32px_rgba(26,28,28,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-headline text-xl font-bold text-[#124346]">Enrollment Trend</h3>
            <span className="rounded-full bg-[#895100]/10 px-2 py-1 text-[10px] font-bold uppercase text-[#895100]">Live</span>
          </div>
          <EnrollmentAreaChart data={enrollmentData} />
        </section>

        <section className="rounded-[1.1rem] bg-white p-6 shadow-[0px_12px_32px_rgba(26,28,28,0.04)]">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#124346]" />
            <h3 className="font-headline text-xl font-bold text-[#124346]">Attendance Overview</h3>
          </div>
          <AttendanceBarChartCard data={attendanceSummary} />
          <button className="mt-6 h-11 w-full rounded-xl bg-[#edeeee] text-xs font-bold uppercase tracking-[0.12em] text-[#124346]">View Detailed Report</button>
        </section>

        <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around rounded-t-3xl border-t border-[#c0c8c9]/20 bg-white/90 px-4 pb-5 pt-3 backdrop-blur-xl">
          <button className="flex flex-col items-center rounded-2xl bg-[#bcebef] px-4 py-2 text-[#124346]">
            <School className="h-4 w-4" />
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em]">Dashboard</span>
          </button>
          <button className="flex flex-col items-center px-4 py-2 text-[#707979]">
            <Users className="h-4 w-4" />
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em]">Students</span>
          </button>
          <button className="flex flex-col items-center px-4 py-2 text-[#707979]">
            <Bell className="h-4 w-4" />
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em]">Attendance</span>
          </button>
          <button className="flex flex-col items-center px-4 py-2 text-[#707979]">
            <DoorOpen className="h-4 w-4" />
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em]">Classes</span>
          </button>
        </nav>
      </div>
    </>
  );
}
