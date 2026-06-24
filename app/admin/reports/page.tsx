import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import {
  Users, GraduationCap, BookOpen, BarChart3,
  Download, FileText, ClipboardCheck, FileSpreadsheet,
  DollarSign, TrendingUp, ArrowRight
} from 'lucide-react';
import { PaymentStatus } from '@prisma/client';
import type { ReactNode } from 'react';
import { ReportsFilterBar } from './reports-filter-bar';
import { StudentReportActions } from './reports-student-actions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type ReportsPageProps = {
  searchParams?: Promise<{ classId?: string; studentId?: string; period?: string }>;
};

function fmtMoney(v: number) {
  return `AED ${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(v: Date | string) {
  const d = v instanceof Date ? v : new Date(v);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isDatabaseConnectionError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'PrismaClientInitializationError' ||
      error.message.includes("Can't reach database server") ||
      error.message.includes('Timed out fetching a new connection') ||
      error.message.includes('Connection terminated unexpectedly'))
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const CARD = 'rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)]';

function CardHeader({ title, subtitle, trailing }: { title: string; subtitle?: string; trailing?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#f1f5f9] px-5 py-4">
      <div>
        <h2 className="font-headline text-base font-bold text-[#111827]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-[#9ca3af]">{subtitle}</p>}
      </div>
      {trailing}
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-current opacity-60">{label}</p>
      <p className="mt-1.5 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ExportBtn({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      download
      className="flex items-center gap-1.5 rounded-xl bg-[#f0f2f5] px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#e2e8e8] transition"
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

function TemplateCard({ href, icon, title, description, accent = false }: {
  href: string; icon: ReactNode; title: string; description: string; accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-start gap-3 rounded-xl border p-4 transition hover:shadow-md ${
        accent
          ? 'border-[#d0e8ea] bg-[#eaf4f5] hover:border-[#2b676e]'
          : 'border-[#f1f5f9] bg-[#fafafa] hover:border-[#d0e8ea] hover:bg-white'
      }`}
    >
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${accent ? 'bg-[#2b676e] text-white' : 'bg-[#e2e8e8] text-[#374151]'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#111827] leading-snug">{title}</p>
        <p className="mt-0.5 text-xs text-[#9ca3af]">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-[#d1d5db] group-hover:text-[#2b676e] flex-shrink-0 mt-0.5 transition" />
    </Link>
  );
}

const getCachedReportsData = unstable_cache(
  async (selectedClassIdRaw: string, selectedStudentIdRaw: string, selectedPeriod: string) => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const classes = await prisma.class.findMany({
      select: { id: true, name: true, section: true },
      orderBy: { name: 'asc' }
    });

    const selectedClassId = selectedClassIdRaw !== 'all' && classes.some((c) => c.id === selectedClassIdRaw) ? selectedClassIdRaw : 'all';
    const selectedClassFilter = selectedClassId !== 'all' ? { classId: selectedClassId } : {};

    const classStudents = await prisma.student.findMany({
      where: selectedClassFilter,
      select: { id: true, admissionNo: true, whatsApp: true, guardianPhone: true, user: { select: { fullName: true } }, class: { select: { name: true, section: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const selectedStudentId =
      selectedStudentIdRaw !== 'all' && classStudents.some((s) => s.id === selectedStudentIdRaw)
        ? selectedStudentIdRaw
        : 'all';

    const studentScopeFilter = selectedStudentId !== 'all' ? { id: selectedStudentId } : selectedClassId !== 'all' ? { classId: selectedClassId } : {};
    const attendanceFilter = selectedStudentId !== 'all' ? { studentId: selectedStudentId } : selectedClassId !== 'all' ? { classId: selectedClassId } : {};
    const resultFilter = selectedStudentId !== 'all' ? { studentId: selectedStudentId } : selectedClassId !== 'all' ? { student: { classId: selectedClassId } } : {};
    const feeFilter = selectedStudentId !== 'all' ? { studentId: selectedStudentId } : selectedClassId !== 'all' ? { student: { classId: selectedClassId } } : {};
    const paymentFilter = selectedStudentId !== 'all' ? { fee: { studentId: selectedStudentId } } : selectedClassId !== 'all' ? { fee: { student: { classId: selectedClassId } } } : {};
    const progressFilter = selectedStudentId !== 'all' ? { studentId: selectedStudentId } : selectedClassId !== 'all' ? { classId: selectedClassId } : {};

    const [
      teachers,
      results,
      attendanceThisMonth,
      recentPayments,
      feeStatusCounts,
      feeTotals,
      studentFeeSnapshot,
      recentProgressReports
    ] = await prisma.$transaction([
      prisma.teacher.count(),
      prisma.result.count({ where: resultFilter }),
      prisma.attendance.count({ where: { date: { gte: monthStart }, ...attendanceFilter } }),
      prisma.payment.findMany({
        where: paymentFilter,
        select: { id: true, amountPaid: true, paidAt: true, fee: { select: { title: true, student: { select: { user: { select: { fullName: true } } } } } } },
        orderBy: { paidAt: 'desc' },
        take: 10
      }),
      prisma.fee.groupBy({ by: ['status'], where: feeFilter, orderBy: { status: 'asc' }, _count: { _all: true } }),
      prisma.fee.aggregate({ where: feeFilter, _sum: { amount: true, discount: true }, _count: { _all: true } }),
      prisma.student.findMany({
        where: studentScopeFilter,
        select: {
          id: true,
          admissionNo: true,
          whatsApp: true,
          guardianPhone: true,
          user: { select: { fullName: true } },
          class: { select: { name: true, section: true } },
          fees: { select: { status: true, amount: true, discount: true }, orderBy: { dueDate: 'desc' }, take: 5 }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.studentProgress.findMany({
        where: progressFilter,
        select: {
          id: true,
          date: true,
          class: { select: { name: true, section: true } },
          student: { select: { user: { select: { fullName: true } } } },
          teacher: { select: { user: { select: { fullName: true } } } },
          tajweeditotal: true,
          hifzTotal: true
        },
        orderBy: { date: 'desc' },
        take: 8
      })
    ]);

    return {
      classes,
      studentsCount: classStudents.length,
      classStudents,
      teachers,
      results,
      attendanceThisMonth,
      recentPayments,
      feeStatusCounts,
      feeTotals,
      studentFeeSnapshot,
      recentProgressReports,
      selectedClassId,
      selectedStudentId,
      selectedPeriod
    };
  },
  ['admin-reports-page'],
  { revalidate: 30 }
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminReportsPage({ searchParams }: ReportsPageProps) {
  const params = (await searchParams) ?? {};
  const selectedClassId = params.classId ?? 'all';
  const selectedStudentIdRaw = params.studentId ?? 'all';
  const selectedPeriod = params.period ?? 'monthly';
  let data: Awaited<ReturnType<typeof getCachedReportsData>> | null = null;
  try {
    data = await getCachedReportsData(selectedClassId, selectedStudentIdRaw, selectedPeriod);
  } catch (error) {
    console.error('[admin/reports] load failed', error);
    if (!isDatabaseConnectionError(error)) throw error;
  }

  if (!data) {
    return (
      <div className={CARD}>
        <div className="flex items-start justify-between gap-3 border-b border-[#f1f5f9] px-5 py-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-[#111827]">Reports</h1>
            <p className="mt-0.5 text-sm text-[#9ca3af]">Live summary — students, attendance, finance, progress.</p>
          </div>
        </div>
        <div className="p-6">
          <h2 className="font-headline text-lg font-bold text-[#111827]">Database Unreachable</h2>
          <p className="mt-2 text-sm text-[#6b7280]">
            Reports data is temporarily unavailable. The page will work again once the database connection recovers.
          </p>
          <p className="mt-1 text-sm text-[#6b7280]">Please refresh once after a moment.</p>
        </div>
      </div>
    );
  }

  const {
    classes,
    studentsCount,
    classStudents,
    teachers,
    results,
    attendanceThisMonth,
    recentPayments,
    feeStatusCounts,
    feeTotals,
    studentFeeSnapshot,
    recentProgressReports,
    selectedClassId: safeSelectedClassId,
    selectedStudentId
  } = data;

  const totalCollected = recentPayments.reduce((s, p) => s + Number(p.amountPaid || 0), 0);
  const feeCount: Record<PaymentStatus, number> = { PENDING: 0, PARTIAL: 0, PAID: 0, OVERDUE: 0 };
  for (const row of feeStatusCounts as Array<{ status: PaymentStatus; _count: { _all: number } }>) {
    feeCount[row.status] = row._count._all;
  }
  const totalFeeAmount = Number(feeTotals._sum.amount || 0);
  const totalDiscount = Number(feeTotals._sum.discount || 0);
  const netFeeAmount = totalFeeAmount - totalDiscount;

  const exportUrl = (type: string) => {
    const q = new URLSearchParams({ type, period: selectedPeriod });
    if (selectedStudentId !== 'all') q.set('studentId', selectedStudentId);
    return `/api/reports/export?${q.toString()}`;
  };

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className={`${CARD} px-5 py-4 sm:px-6 sm:py-5`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-[#111827]">Reports</h1>
            <p className="mt-0.5 text-sm text-[#9ca3af]">Live summary — students, attendance, finance, progress.</p>
          </div>
          <TrendingUp className="h-8 w-8 text-[#d1d5db]" />
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <ReportsFilterBar
        classes={classes}
        students={classStudents}
        selectedClassId={safeSelectedClassId}
        selectedStudentId={selectedStudentId}
        selectedPeriod={selectedPeriod}
      />

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={`${CARD} p-4`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d0e8ea] text-[#2b676e]">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Students</p>
              <p className="text-xl font-bold text-[#111827]">{studentsCount}</p>
            </div>
          </div>
        </div>
        <div className={`${CARD} p-4`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ede9fe] text-[#7c3aed]">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Teachers</p>
              <p className="text-xl font-bold text-[#111827]">{teachers}</p>
            </div>
          </div>
        </div>
        <div className={`${CARD} p-4`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fef3c7] text-[#b45309]">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Classes</p>
              <p className="text-xl font-bold text-[#111827]">{classes.length}</p>
            </div>
          </div>
        </div>
        <div className={`${CARD} p-4`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#dcfce7] text-[#15803d]">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Results</p>
              <p className="text-xl font-bold text-[#111827]">{results}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Report Templates ────────────────────────────────────────────────── */}
      <div className={CARD}>
        <CardHeader title="Report Templates" subtitle="Generate and download formatted reports" />
        <div className="p-5 space-y-4">
          {/* Attendance templates */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-3">Attendance</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <TemplateCard href="/admin/reports/individual-complete" icon={<FileText className="h-4 w-4" />} title="Individual Complete" description="Daily progress + attendance + exam notes" />
              <TemplateCard href="/admin/reports/individual-attendance" icon={<ClipboardCheck className="h-4 w-4" />} title="Individual Attendance" description="Monthly attendance calendar with totals" />
              <TemplateCard href="/admin/reports/class-attendance" icon={<FileSpreadsheet className="h-4 w-4" />} title="Class Attendance" description="Student-wise monthly attendance sheet" />
            </div>
          </div>
          {/* Finance templates */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-3">Finance</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TemplateCard href="/admin/reports/finance/individual" icon={<DollarSign className="h-4 w-4" />} title="Individual Finance" description="12-month student fee report" accent />
              <TemplateCard href="/admin/reports/finance/class" icon={<DollarSign className="h-4 w-4" />} title="Class Finance" description="Class total paid/unpaid summary" accent />
              <TemplateCard href="/admin/reports/finance/all-students" icon={<DollarSign className="h-4 w-4" />} title="All Students Finance" description="Consolidated paid/unpaid report" accent />
              <TemplateCard href="/admin/reports/finance/higher-students" icon={<DollarSign className="h-4 w-4" />} title="Higher Students Finance" description="Higher-session paid/unpaid report" accent />
            </div>
          </div>
        </div>
      </div>

      {/* ── Finance Overview ─────────────────────────────────────────────────── */}
      <div className={CARD}>
        <CardHeader
          title="Finance Overview"
          subtitle="Fee status and recent payments"
          trailing={
            <div className="flex flex-wrap gap-2">
              <ExportBtn href={exportUrl('fees')} label="Fees CSV" />
              <ExportBtn href={exportUrl('overview')} label="Overview CSV" />
            </div>
          }
        />
        <div className="p-5 space-y-5">

          {/* Fee status 4-grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatChip label="Pending" value={feeCount.PENDING} color="bg-[#fef2f2] text-[#b91c1c]" />
            <StatChip label="Partial" value={feeCount.PARTIAL} color="bg-[#fff7ed] text-[#b45309]" />
            <StatChip label="Paid" value={feeCount.PAID} color="bg-[#f0fdf4] text-[#15803d]" />
            <StatChip label="Overdue" value={feeCount.OVERDUE} color="bg-[#fef2f2] text-[#dc2626]" />
          </div>

          {/* Fee totals */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[#f8fafc] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Gross Amount</p>
              <p className="mt-1 text-lg font-bold text-[#111827]">{fmtMoney(totalFeeAmount)}</p>
            </div>
            <div className="rounded-xl bg-[#f8fafc] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Discount</p>
              <p className="mt-1 text-lg font-bold text-[#b45309]">{fmtMoney(totalDiscount)}</p>
            </div>
            <div className="rounded-xl bg-[#eaf4f5] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Net Amount</p>
              <p className="mt-1 text-lg font-bold text-[#2b676e]">{fmtMoney(netFeeAmount)}</p>
            </div>
          </div>

          {/* Recent payments */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-3">Recent Payments</p>
            {recentPayments.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#9ca3af]">No payments recorded.</p>
            ) : (
              <>
                {/* Mobile */}
                <div className="space-y-2 sm:hidden">
                  {recentPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fafc] px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#111827]">{p.fee?.title ?? 'Fee'}</p>
                        <p className="text-xs text-[#9ca3af]">{p.fee?.student?.user.fullName ?? ''} · {fmtDate(p.paidAt)}</p>
                      </div>
                      <span className="flex-shrink-0 text-sm font-bold text-[#15803d]">{fmtMoney(Number(p.amountPaid || 0))}</span>
                    </div>
                  ))}
                </div>
                {/* Desktop */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full min-w-[540px]">
                    <thead>
                      <tr className="bg-[#fafafa]">
                        <th className="rounded-l-xl px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Fee</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Student</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Amount</th>
                        <th className="rounded-r-xl px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f8fafc]">
                      {recentPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-[#fafafa]">
                          <td className="px-4 py-3 text-sm text-[#374151]">{p.fee?.title ?? 'Fee'}</td>
                          <td className="px-4 py-3 text-sm text-[#6b7280]">{p.fee?.student?.user.fullName ?? '—'}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-[#15803d]">{fmtMoney(Number(p.amountPaid || 0))}</td>
                          <td className="px-4 py-3 text-sm text-[#9ca3af]">{fmtDate(p.paidAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Attendance Overview ──────────────────────────────────────────────── */}
      <div className={CARD}>
        <CardHeader
          title="Attendance Overview"
          subtitle="Current month records"
          trailing={<ExportBtn href={exportUrl('attendance')} label="Export CSV" />}
        />
        <div className="p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[#eaf4f5] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Records This Month</p>
              <p className="mt-1.5 text-3xl font-bold text-[#2b676e]">{attendanceThisMonth}</p>
            </div>
            <div className="rounded-xl bg-[#f8fafc] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Total Collected (Recent)</p>
              <p className="mt-1.5 text-3xl font-bold text-[#111827]">{fmtMoney(totalCollected)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Student Reports ──────────────────────────────────────────────────── */}
      <div className={CARD}>
        <CardHeader
          title="Student Fee Snapshot"
          subtitle="Recent students with fee status"
          trailing={<ExportBtn href={exportUrl('results')} label="Export CSV" />}
        />
        <div className="p-5">
          {studentFeeSnapshot.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#9ca3af]">No students found.</p>
          ) : (
            <>
              {/* Mobile */}
              <div className="space-y-2 sm:hidden">
                {studentFeeSnapshot.map((s) => {
                  const due = s.fees.filter((f) => f.status === PaymentStatus.PENDING || f.status === PaymentStatus.OVERDUE).length;
                  return (
                    <div key={s.id} className="rounded-xl bg-[#f8fafc] p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="text-sm font-semibold text-[#111827]">{s.user.fullName}</p>
                          <p className="text-xs text-[#9ca3af]">{s.class ? `${s.class.name} – ${s.class.section}` : 'Unassigned'}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${due > 0 ? 'bg-[#fee2e2] text-[#b91c1c]' : 'bg-[#dcfce7] text-[#15803d]'}`}>
                          {due > 0 ? `${due} due` : 'Clear'}
                        </span>
                      </div>
                      <StudentReportActions
                        studentId={s.id} whatsApp={s.whatsApp} guardianPhone={s.guardianPhone}
                        studentName={s.user.fullName}
                        className={s.class ? `${s.class.name} ${s.class.section}` : '—'}
                        pendingCount={s.fees.filter((f) => f.status === PaymentStatus.PENDING).length}
                        overdueCount={s.fees.filter((f) => f.status === PaymentStatus.OVERDUE).length}
                      />
                    </div>
                  );
                })}
              </div>
              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full min-w-[620px]">
                  <thead>
                    <tr className="bg-[#fafafa]">
                      <th className="rounded-l-xl px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Student</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Class</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Admission</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Fees</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Due</th>
                      <th className="rounded-r-xl px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f8fafc]">
                    {studentFeeSnapshot.map((s) => {
                      const due = s.fees.filter((f) => f.status === PaymentStatus.PENDING || f.status === PaymentStatus.OVERDUE).length;
                      return (
                        <tr key={s.id} className="hover:bg-[#fafafa]">
                          <td className="px-4 py-3 text-sm font-medium text-[#111827]">{s.user.fullName}</td>
                          <td className="px-4 py-3 text-sm text-[#6b7280]">{s.class ? `${s.class.name} – ${s.class.section}` : 'Unassigned'}</td>
                          <td className="px-4 py-3 text-sm text-[#6b7280]">{s.admissionNo}</td>
                          <td className="px-4 py-3 text-sm text-[#374151]">{s.fees.length}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${due > 0 ? 'bg-[#fee2e2] text-[#b91c1c]' : 'bg-[#dcfce7] text-[#15803d]'}`}>
                              {due > 0 ? due : '✓'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StudentReportActions
                              studentId={s.id} whatsApp={s.whatsApp} guardianPhone={s.guardianPhone}
                              studentName={s.user.fullName}
                              className={s.class ? `${s.class.name} ${s.class.section}` : '—'}
                              pendingCount={s.fees.filter((f) => f.status === PaymentStatus.PENDING).length}
                              overdueCount={s.fees.filter((f) => f.status === PaymentStatus.OVERDUE).length}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Hifz Progress ───────────────────────────────────────────────────── */}
      <div className={CARD}>
        <CardHeader title="Hifz Progress" subtitle="Recent progress records" />
        <div className="p-5">
          {recentProgressReports.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#9ca3af]">No progress records found.</p>
          ) : (
            <>
              {/* Mobile */}
              <div className="space-y-2 sm:hidden">
                {recentProgressReports.map((r) => (
                  <div key={r.id} className="rounded-xl bg-[#f8fafc] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">{r.student.user.fullName}</p>
                        <p className="text-xs text-[#9ca3af]">{r.class.name} – {r.class.section} · {fmtDate(r.date)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-[#2b676e]">T: {r.tajweeditotal ?? 0}</p>
                        <p className="text-xs font-bold text-[#7c3aed]">H: {r.hifzTotal ?? 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full min-w-[580px]">
                  <thead>
                    <tr className="bg-[#fafafa]">
                      <th className="rounded-l-xl px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Date</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Student</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Class</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Teacher</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Tajweed</th>
                      <th className="rounded-r-xl px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Hifz</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f8fafc]">
                    {recentProgressReports.map((r) => (
                      <tr key={r.id} className="hover:bg-[#fafafa]">
                        <td className="px-4 py-3 text-sm text-[#9ca3af]">{fmtDate(r.date)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-[#111827]">{r.student.user.fullName}</td>
                        <td className="px-4 py-3 text-sm text-[#6b7280]">{r.class.name} – {r.class.section}</td>
                        <td className="px-4 py-3 text-sm text-[#6b7280]">{r.teacher.user.fullName}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-[#eaf4f5] px-2.5 py-0.5 text-[11px] font-bold text-[#2b676e]">{r.tajweeditotal ?? 0}</span></td>
                        <td className="px-4 py-3"><span className="rounded-full bg-[#ede9fe] px-2.5 py-0.5 text-[11px] font-bold text-[#7c3aed]">{r.hifzTotal ?? 0}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
