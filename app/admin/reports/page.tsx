import { prisma } from '@/lib/prisma';
import { KpiCard } from '@/components/ui';
import { Users, GraduationCap, BookOpen, BarChart3, Download, FileText, ClipboardCheck, FileSpreadsheet, DollarSign } from 'lucide-react';
import { PaymentStatus } from '@prisma/client';
import type { ReactNode } from 'react';
import { ReportsFilterBar } from './reports-filter-bar';
import { StudentReportActions } from './reports-student-actions';

export const dynamic = 'force-dynamic';

type ReportsPageProps = {
  searchParams?: Promise<{ classId?: string; studentId?: string; period?: string }>;
};

function formatMoney(value: number) {
  return `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function AdminReportsPage({ searchParams }: ReportsPageProps) {
  const params = (await searchParams) ?? {};
  const selectedClassId = params.classId ?? 'all';
  const selectedStudentIdRaw = params.studentId ?? 'all';
  const selectedPeriod = params.period ?? 'monthly';

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const selectedClassFilter = selectedClassId !== 'all' ? { classId: selectedClassId } : {};

  const classStudents = await prisma.student.findMany({
    where: selectedClassFilter,
    select: {
      id: true,
      admissionNo: true,
      user: { select: { fullName: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const selectedStudentId =
    selectedStudentIdRaw !== 'all' && classStudents.some((student) => student.id === selectedStudentIdRaw)
      ? selectedStudentIdRaw
      : 'all';

  const studentScopeFilter =
    selectedStudentId !== 'all' ? { id: selectedStudentId } : selectedClassId !== 'all' ? { classId: selectedClassId } : {};
  const attendanceFilter =
    selectedStudentId !== 'all'
      ? { studentId: selectedStudentId }
      : selectedClassId !== 'all'
        ? { classId: selectedClassId }
        : {};
  const resultFilter =
    selectedStudentId !== 'all'
      ? { studentId: selectedStudentId }
      : selectedClassId !== 'all'
        ? { student: { classId: selectedClassId } }
        : {};
  const feeFilter =
    selectedStudentId !== 'all'
      ? { studentId: selectedStudentId }
      : selectedClassId !== 'all'
        ? { student: { classId: selectedClassId } }
        : {};
  const paymentFilter =
    selectedStudentId !== 'all'
      ? { fee: { studentId: selectedStudentId } }
      : selectedClassId !== 'all'
        ? { fee: { student: { classId: selectedClassId } } }
        : {};
  const progressFilter =
    selectedStudentId !== 'all'
      ? { studentId: selectedStudentId }
      : selectedClassId !== 'all'
        ? { classId: selectedClassId }
        : {};

  const [
    students,
    teachers,
    classes,
    results,
    attendanceThisMonth,
    recentPayments,
    feeStatusCounts,
    feeTotals,
    studentFeeSnapshot,
    recentProgressReports
  ] = await Promise.all([
    prisma.student.count({ where: studentScopeFilter }),
    prisma.teacher.count(),
    prisma.class.findMany({ select: { id: true, name: true, section: true }, orderBy: { name: 'asc' } }),
    prisma.result.count({ where: resultFilter }),
    prisma.attendance.count({ where: { date: { gte: monthStart }, ...attendanceFilter } }),
    prisma.payment.findMany({
      where: paymentFilter,
      select: { id: true, amountPaid: true, paidAt: true, fee: { select: { title: true } } },
      orderBy: { paidAt: 'desc' },
      take: 10
    }),
    prisma.fee.groupBy({ by: ['status'], where: feeFilter, _count: { _all: true } }),
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
        fees: { select: { status: true, amount: true, discount: true, dueDate: true }, orderBy: { dueDate: 'desc' }, take: 5 }
      },
      orderBy: { createdAt: 'desc' },
      take: 8
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

  const totalCollectedThisMonth = recentPayments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
  const feeCountByStatus: Record<PaymentStatus, number> = { PENDING: 0, PARTIAL: 0, PAID: 0, OVERDUE: 0 };
  for (const row of feeStatusCounts) feeCountByStatus[row.status] = row._count._all;
  const totalFeeAmount = Number(feeTotals._sum.amount || 0);
  const totalDiscount = Number(feeTotals._sum.discount || 0);
  const netFeeAmount = totalFeeAmount - totalDiscount;

  const exportUrl = (type: string) => {
    const query = new URLSearchParams({ type, period: selectedPeriod });
    if (selectedStudentId !== 'all') query.set('studentId', selectedStudentId);
    return `/api/reports/export?${query.toString()}`;
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <h1 className="text-2xl font-bold text-[#1a1c1c] sm:text-3xl">Reports</h1>
        <p className="mt-1 text-sm text-[#6f7979]">Live summary for students, classes, attendance, and payments.</p>
      </div>

      {/* ── Filter Bar ── */}
      <ReportsFilterBar
        classes={classes}
        students={classStudents}
        selectedClassId={selectedClassId}
        selectedStudentId={selectedStudentId}
        selectedPeriod={selectedPeriod}
      />

      {/* ── Manual Report Templates ── */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <h2 className="text-lg font-bold text-[#1a1c1c]">Report Templates</h2>
        <p className="mt-0.5 text-xs text-[#6f7979]">Individual Complete, Individual Attendance, and Class Attendance formats.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <LinkCard
            href="/admin/reports/individual-complete"
            title="Individual Complete Report"
            description="Daily progress + attendance + exam notes"
            icon={<FileText className="h-4 w-4" />}
          />
          <LinkCard
            href="/admin/reports/individual-attendance"
            title="Individual Attendance Report"
            description="Monthly attendance calendar with totals"
            icon={<ClipboardCheck className="h-4 w-4" />}
          />
          <LinkCard
            href="/admin/reports/class-attendance"
            title="Class Attendance Report"
            description="Student-wise month attendance sheet"
            icon={<FileSpreadsheet className="h-4 w-4" />}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <h2 className="text-lg font-bold text-[#1a1c1c]">Finance Report Templates</h2>
        <p className="mt-0.5 text-xs text-[#6f7979]">Individual, Class, and All Students monthly finance reports.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <LinkCard
            href="/admin/reports/finance/individual"
            title="Individual Finance Report"
            description="12-month student fee, paid, unpaid report"
            icon={<DollarSign className="h-4 w-4" />}
          />
          <LinkCard
            href="/admin/reports/finance/class"
            title="Class Finance Report"
            description="Class total fee with paid and unpaid summary"
            icon={<DollarSign className="h-4 w-4" />}
          />
          <LinkCard
            href="/admin/reports/finance/all-students"
            title="All Students Finance Report"
            description="Monthly consolidated paid/unpaid student report"
            icon={<DollarSign className="h-4 w-4" />}
          />
          <LinkCard
            href="/admin/reports/finance/higher-students"
            title="Higher Students Finance Report"
            description="Monthly higher-session students paid/unpaid report"
            icon={<DollarSign className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* ── Overview KPIs ── */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard variant="success" icon={<Users size={20} />} label="Students" value={students} />
        <KpiCard variant="primary" icon={<GraduationCap size={20} />} label="Teachers" value={teachers} />
        <KpiCard variant="primary" icon={<BookOpen size={20} />} label="Classes" value={classes.length} />
        <KpiCard variant="accent" icon={<BarChart3 size={20} />} label="Results" value={results} />
      </div>

      {/* ── Finance Reports ── */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1a1c1c]">Finance Reports</h2>
            <p className="mt-0.5 text-xs text-[#6f7979]">Fee status and payment summary</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={exportUrl('fees')}
              download
              className="h-10 inline-flex items-center gap-1.5 rounded-xl bg-[#f0f2f5] px-3 text-xs font-semibold text-[#2c3e50] hover:bg-[#e8ecf0] active:scale-[0.98] transition-all"
            >
              <Download className="h-4 w-4" />
              Fees CSV
            </a>
            <a
              href={exportUrl('overview')}
              download
              className="h-10 inline-flex items-center gap-1.5 rounded-xl bg-[#f0f2f5] px-3 text-xs font-semibold text-[#2c3e50] hover:bg-[#e8ecf0] active:scale-[0.98] transition-all"
            >
              <Download className="h-4 w-4" />
              Overview CSV
            </a>
          </div>
        </div>

        {/* Fee Status Grid */}
        <div className="grid gap-3 mb-6 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-xl bg-[#fef2f2] p-4">
            <p className="text-xs text-[#6f7979] mb-2">Pending</p>
            <p className="text-2xl font-bold text-[#b91c1c]">{feeCountByStatus.PENDING}</p>
          </div>
          <div className="rounded-xl bg-[#fff7ed] p-4">
            <p className="text-xs text-[#6f7979] mb-2">Partial</p>
            <p className="text-2xl font-bold text-[#b45309]">{feeCountByStatus.PARTIAL}</p>
          </div>
          <div className="rounded-xl bg-[#f0fdf4] p-4">
            <p className="text-xs text-[#6f7979] mb-2">Paid</p>
            <p className="text-2xl font-bold text-[#15803d]">{feeCountByStatus.PAID}</p>
          </div>
          <div className="rounded-xl bg-[#fef2f2] p-4">
            <p className="text-xs text-[#6f7979] mb-2">Overdue</p>
            <p className="text-2xl font-bold text-[#dc2626]">{feeCountByStatus.OVERDUE}</p>
          </div>
        </div>

        {/* Fee Totals */}
        <div className="grid gap-3 mb-6 grid-cols-1 sm:grid-cols-3">
          <div className="rounded-xl bg-[#f4f7f7] p-4">
            <p className="text-xs text-[#6f7979]">Gross Fee Amount</p>
            <p className="mt-1.5 text-xl font-bold text-[#1a1c1c]">{formatMoney(totalFeeAmount)}</p>
          </div>
          <div className="rounded-xl bg-[#f4f7f7] p-4">
            <p className="text-xs text-[#6f7979]">Discount</p>
            <p className="mt-1.5 text-xl font-bold text-[#1a1c1c]">{formatMoney(totalDiscount)}</p>
          </div>
          <div className="rounded-xl bg-[#f4f7f7] p-4">
            <p className="text-xs text-[#6f7979]">Net Fee Amount</p>
            <p className="mt-1.5 text-xl font-bold text-[#1a1c1c]">{formatMoney(netFeeAmount)}</p>
          </div>
        </div>

        {/* Recent Payments */}
        <div>
          <h3 className="text-sm font-bold text-[#1a1c1c] mb-3">Recent Payments</h3>

          {/* Mobile */}
          <div className="space-y-2 sm:hidden">
            {recentPayments.length === 0 ? (
              <p className="text-xs text-center text-[#6f7979] py-6">No payments found.</p>
            ) : (
              recentPayments.map((p) => (
                <div key={p.id} className="rounded-xl bg-[#f4f7f7] p-3">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <p className="font-semibold text-[#1a1c1c] text-sm flex-1 truncate">{p.fee?.title}</p>
                    <span className="shrink-0 rounded-full bg-[#f0fdf4] px-2 py-0.5 text-[10px] font-bold text-[#15803d]">PAID</span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs text-[#6f7979]">
                    <span>{formatMoney(Number(p.amountPaid || 0))}</span>
                    <span>{formatDate(p.paidAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="bg-[#f3f4f5] border-b border-[#e2e8e8]">
                  <th className="pb-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#6f7979]">Fee</th>
                  <th className="pb-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#6f7979]">Amount</th>
                  <th className="pb-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#6f7979]">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8e8]">
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-xs text-[#6f7979]">
                      No payments found.
                    </td>
                  </tr>
                ) : (
                  recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#f9fafb]">
                      <td className="py-3 px-3 text-[#445050]">{p.fee?.title || 'Fee'}</td>
                      <td className="py-3 px-3 font-semibold text-[#004649]">{formatMoney(Number(p.amountPaid || 0))}</td>
                      <td className="py-3 px-3 text-xs text-[#6f7979]">{formatDate(p.paidAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Attendance Reports ── */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#1a1c1c]">Attendance Reports</h2>
            <p className="mt-0.5 text-xs text-[#6f7979]">Monthly attendance summary</p>
          </div>
          <a
            href={exportUrl('attendance')}
            download
            className="h-10 inline-flex items-center gap-1.5 rounded-xl bg-[#f0f2f5] px-3 text-xs font-semibold text-[#2c3e50] hover:bg-[#e8ecf0] active:scale-[0.98] transition-all"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <div className="rounded-xl bg-[#f4f7f7] p-4">
            <p className="text-xs text-[#6f7979]">Attendance Records (This Month)</p>
            <p className="mt-2 text-2xl font-bold text-[#1a1c1c]">{attendanceThisMonth}</p>
          </div>
          <div className="rounded-xl bg-[#f4f7f7] p-4">
            <p className="text-xs text-[#6f7979]">Collected (Recent Payments)</p>
            <p className="mt-2 text-2xl font-bold text-[#1a1c1c]">{formatMoney(totalCollectedThisMonth)}</p>
          </div>
        </div>
      </div>

      {/* ── Student Reports ── */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#1a1c1c]">Student Reports</h2>
            <p className="mt-0.5 text-xs text-[#6f7979]">Student fee and enrollment status</p>
          </div>
          <a
            href={exportUrl('results')}
            download
            className="h-10 inline-flex items-center gap-1.5 rounded-xl bg-[#f0f2f5] px-3 text-xs font-semibold text-[#2c3e50] hover:bg-[#e8ecf0] active:scale-[0.98] transition-all"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </div>

        {/* Mobile */}
        <div className="space-y-2 sm:hidden">
          {studentFeeSnapshot.length === 0 ? (
            <p className="text-xs text-center text-[#6f7979] py-6">No students found.</p>
          ) : (
            studentFeeSnapshot.map((student) => {
              const pendingOrOverdue = student.fees.filter((f) => f.status === PaymentStatus.PENDING || f.status === PaymentStatus.OVERDUE).length;
              return (
                <div key={student.id} className="rounded-xl bg-[#f4f7f7] p-3">
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <p className="font-semibold text-[#1a1c1c] flex-1 truncate">{student.user.fullName}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${pendingOrOverdue > 0 ? 'bg-[#fef2f2] text-[#b91c1c]' : 'bg-[#f0fdf4] text-[#15803d]'}`}>
                      {pendingOrOverdue} due
                    </span>
                  </div>
                  <div className="text-xs text-[#6f7979] mb-3">{student.class ? `${student.class.name} - ${student.class.section}` : 'Unassigned'}</div>
                  <StudentReportActions
                    studentId={student.id}
                    whatsApp={student.whatsApp}
                    guardianPhone={student.guardianPhone}
                    studentName={student.user.fullName}
                    className={student.class ? `${student.class.name} ${student.class.section}` : '—'}
                    pendingCount={student.fees.filter((f) => f.status === PaymentStatus.PENDING).length}
                    overdueCount={student.fees.filter((f) => f.status === PaymentStatus.OVERDUE).length}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="bg-[#f3f4f5] border-b border-[#e2e8e8]">
                <th className="pb-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#6f7979]">Student</th>
                <th className="pb-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#6f7979]">Class</th>
                <th className="pb-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#6f7979]">Admission</th>
                <th className="pb-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#6f7979]">Fee Records</th>
                <th className="pb-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#6f7979]">Pending/Overdue</th>
                <th className="pb-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#6f7979]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8e8]">
              {studentFeeSnapshot.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-[#6f7979]">
                    No students found.
                  </td>
                </tr>
              ) : (
                studentFeeSnapshot.map((student) => {
                  const pendingOrOverdue = student.fees.filter((f) => f.status === PaymentStatus.PENDING || f.status === PaymentStatus.OVERDUE).length;
                  return (
                    <tr key={student.id} className="hover:bg-[#f9fafb]">
                      <td className="py-3 px-3 font-medium text-[#1a1c1c]">{student.user.fullName}</td>
                      <td className="py-3 px-3 text-[#445050]">{student.class ? `${student.class.name} - ${student.class.section}` : 'Unassigned'}</td>
                      <td className="py-3 px-3 text-[#445050]">{student.admissionNo}</td>
                      <td className="py-3 px-3 text-[#445050]">{student.fees.length}</td>
                      <td className={`py-3 px-3 font-semibold ${pendingOrOverdue > 0 ? 'text-[#b42318]' : 'text-[#027a48]'}`}>
                        {pendingOrOverdue}
                      </td>
                      <td className="py-3 px-3">
                        <StudentReportActions
                          studentId={student.id}
                          whatsApp={student.whatsApp}
                          guardianPhone={student.guardianPhone}
                          studentName={student.user.fullName}
                          className={student.class ? `${student.class.name} ${student.class.section}` : '—'}
                          pendingCount={student.fees.filter((f) => f.status === PaymentStatus.PENDING).length}
                          overdueCount={student.fees.filter((f) => f.status === PaymentStatus.OVERDUE).length}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Hifz Reports (Read-Only) ── */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <h2 className="text-lg font-bold text-[#1a1c1c] mb-4">Hifz Reports</h2>

        {/* Mobile */}
        <div className="space-y-2 sm:hidden">
          {recentProgressReports.length === 0 ? (
            <p className="text-xs text-center text-[#6f7979] py-6">No hifz reports found.</p>
          ) : (
            recentProgressReports.map((r) => (
              <div key={r.id} className="rounded-xl bg-[#f4f7f7] p-3">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <p className="font-semibold text-[#1a1c1c] flex-1 truncate">{r.student.user.fullName}</p>
                  <span className="shrink-0 text-xs font-semibold text-[#004649]">T:{r.tajweeditotal ?? 0} H:{r.hifzTotal ?? 0}</span>
                </div>
                <div className="text-xs text-[#6f7979]">{formatDate(r.date)} • {r.class.name} - {r.class.section}</div>
              </div>
            ))
          )}
        </div>

        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="bg-[#f3f4f5] border-b border-[#e2e8e8]">
                <th className="pb-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#6f7979]">Date</th>
                <th className="pb-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#6f7979]">Student</th>
                <th className="pb-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#6f7979]">Class</th>
                <th className="pb-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#6f7979]">Teacher</th>
                <th className="pb-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#6f7979]">Mistakes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8e8]">
              {recentProgressReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-[#6f7979]">
                    No hifz reports found.
                  </td>
                </tr>
              ) : (
                recentProgressReports.map((r) => (
                  <tr key={r.id} className="hover:bg-[#f9fafb]">
                    <td className="py-3 px-3 text-[#445050]">{formatDate(r.date)}</td>
                    <td className="py-3 px-3 font-medium text-[#1a1c1c]">{r.student.user.fullName}</td>
                    <td className="py-3 px-3 text-[#445050]">{r.class.name} - {r.class.section}</td>
                    <td className="py-3 px-3 text-[#445050]">{r.teacher.user.fullName}</td>
                    <td className="py-3 px-3 font-semibold text-[#004649]">T:{r.tajweeditotal ?? 0} / H:{r.hifzTotal ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LinkCard({
  href,
  title,
  description,
  icon
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <a
      href={href}
      className="group rounded-xl border border-[#e2e8e8] bg-[#f8fafb] p-3 transition hover:border-[#bfd9db] hover:bg-white"
    >
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f3f4] text-[#004649]">
        {icon}
      </div>
      <p className="mt-2 text-sm font-semibold text-[#1a1c1c]">{title}</p>
      <p className="mt-1 text-xs text-[#6f7979]">{description}</p>
    </a>
  );
}
