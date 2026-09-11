import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { PrintButton } from '@/components/reports/print-button';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<{ classId?: string; month?: string; page?: string }>;
};

function monthBounds(monthKey?: string) {
  const now = new Date();
  const parsed = monthKey && /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearStr, monthStr] = parsed.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const start = new Date(year, month - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, month, 0);
  end.setHours(23, 59, 59, 999);
  return { monthKey: parsed, label: start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), start, end };
}

function formatMoney(value: number) {
  return `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AllStudentsFinanceReportPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const { monthKey, label, start, end } = monthBounds(params.month);
  
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 50;

  const classes = await prisma.class.findMany({
    select: { id: true, name: true, section: true },
    orderBy: [{ name: 'asc' }, { section: 'asc' }]
  });

  const selectedClassId = params.classId && classes.some((c) => c.id === params.classId) ? params.classId : 'all';
  const studentWhere = selectedClassId !== 'all' ? { classId: selectedClassId } : {};

  // 1. Fetch lightweight aggregated totals across ALL matching records to preserve exact math
  const [totalStudents, fees] = await Promise.all([
    prisma.student.count({ where: studentWhere }),
    prisma.fee.findMany({
      where: {
        dueDate: { gte: start, lte: end },
        student: selectedClassId !== 'all' ? { classId: selectedClassId } : undefined
      },
      select: {
        studentId: true,
        amount: true,
        discount: true,
        payments: { select: { amountPaid: true } }
      }
    })
  ]);

  const studentFeeTotals = new Map<string, { fee: number; paid: number }>();
  for (const f of fees) {
    const feeAmt = Math.max(Number(f.amount || 0) - Number(f.discount || 0), 0);
    const paidAmt = f.payments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
    
    const curr = studentFeeTotals.get(f.studentId) || { fee: 0, paid: 0 };
    curr.fee += feeAmt;
    curr.paid += paidAmt;
    studentFeeTotals.set(f.studentId, curr);
  }

  let paidStudents = 0;
  let unpaidStudents = 0;
  let totalFee = 0;
  let totalPaid = 0;
  let totalUnpaid = 0;

  for (const stats of studentFeeTotals.values()) {
    const unpaid = Math.max(stats.fee - stats.paid, 0);
    totalFee += stats.fee;
    totalPaid += stats.paid;
    totalUnpaid += unpaid;
    if (stats.fee > 0 && unpaid === 0) paidStudents++;
    if (unpaid > 0) unpaidStudents++;
  }

  // 2. Fetch paginated students for the current page
  const students = await prisma.student.findMany({
    where: studentWhere,
    select: {
      id: true,
      user: { select: { fullName: true } },
      class: { select: { name: true, section: true } },
      fees: {
        where: { dueDate: { gte: start, lte: end } },
        select: { amount: true, discount: true, payments: { select: { amountPaid: true } } }
      }
    },
    orderBy: { user: { fullName: 'asc' } },
    skip: (page - 1) * pageSize,
    take: pageSize
  });

  const rows = students.map((student) => {
    const fee = student.fees.reduce((sum, item) => sum + Math.max(Number(item.amount || 0) - Number(item.discount || 0), 0), 0);
    const paid = student.fees.reduce(
      (sum, item) => sum + item.payments.reduce((inner, payment) => inner + Number(payment.amountPaid || 0), 0),
      0
    );
    const unpaid = Math.max(fee - paid, 0);
    return {
      id: student.id,
      name: student.user.fullName,
      className: student.class ? `${student.class.name} ${student.class.section}` : 'Unassigned',
      fee,
      paid,
      unpaid
    };
  });

  const totalPages = Math.ceil(totalStudents / pageSize);

  return (
    <div className="space-y-4 pb-8">
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <Link href="/admin/reports" className="text-xs font-semibold text-[#004649] hover:text-[#1b5e62]">&larr; Back to Reports</Link>
        <h1 className="mt-2 text-2xl font-bold text-[#1a1c1c]">All Students Finance Report</h1>
        <p className="mt-1 text-sm text-[#6f7979]">Monthly consolidated fee report for all/higher students with paid and unpaid counts.</p>

        <form className="mt-4 grid gap-3 sm:grid-cols-3" method="get">
          <label className="text-xs font-semibold text-[#6f7979]">
            Class Scope
            <select name="classId" defaultValue={selectedClassId} className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]">
              <option value="all">All Students</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>{classItem.name} {classItem.section}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#6f7979]">
            Month
            <input type="month" name="month" defaultValue={monthKey} className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]" />
          </label>
          <div className="flex items-end">
            <button type="submit" className="h-10 w-full rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] text-sm font-semibold text-white">Apply</button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <div className="mb-3 flex justify-end gap-2 print:hidden">
          <PrintButton label="Print / PDF" />
          <a
            href={`/api/reports/export?type=finance-all&month=${monthKey}${selectedClassId !== 'all' ? `&classId=${selectedClassId}` : ''}`}
            download
            className="inline-flex h-10 items-center rounded-xl bg-[#f0f2f5] px-3 text-xs font-semibold text-[#2c3e50] hover:bg-[#e8ecf0]"
          >
            Download CSV
          </a>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Month" value={label} tone="neutral" />
          <SummaryCard label="Total Students" value={String(totalStudents)} tone="neutral" />
          <SummaryCard label="Paid Students" value={String(paidStudents)} tone="green" />
          <SummaryCard label="Unpaid Students" value={String(unpaidStudents)} tone="red" />
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-[#e5e7eb]">
          <table className="min-w-[840px] w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#f8fafc] text-[#475569]">
                <th className="border-b border-r border-[#e5e7eb] px-3 py-2 text-left">Student Name</th>
                <th className="border-b border-r border-[#e5e7eb] px-3 py-2 text-left">Class</th>
                <th className="border-b border-r border-[#e5e7eb] px-3 py-2 text-right">Fee</th>
                <th className="border-b border-r border-[#e5e7eb] px-3 py-2 text-right">Paid</th>
                <th className="border-b border-r border-[#e5e7eb] px-3 py-2 text-right">Unpaid</th>
                <th className="border-b border-[#e5e7eb] px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-[#6b7280]">No student fee data for this month.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#fafafa]">
                    <td className="border-b border-r border-[#e5e7eb] px-3 py-2 font-medium text-[#111827]">{row.name}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-3 py-2 text-[#334155]">{row.className}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-3 py-2 text-right">{formatMoney(row.fee)}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-3 py-2 text-right text-[#15803d]">{formatMoney(row.paid)}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-3 py-2 text-right text-[#be123c]">{formatMoney(row.unpaid)}</td>
                    <td className="border-b border-[#e5e7eb] px-3 py-2 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.unpaid > 0 ? 'bg-[#fff1f2] text-[#be123c]' : 'bg-[#ecfdf3] text-[#15803d]'}`}>
                        {row.unpaid > 0 ? 'UNPAID' : 'PAID'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#f8fafc]">
                <td colSpan={2} className="border-r border-[#e5e7eb] px-3 py-2 font-bold">Overall Total</td>
                <td className="border-r border-[#e5e7eb] px-3 py-2 text-right font-bold">{formatMoney(totalFee)}</td>
                <td className="border-r border-[#e5e7eb] px-3 py-2 text-right font-bold text-[#15803d]">{formatMoney(totalPaid)}</td>
                <td className="border-r border-[#e5e7eb] px-3 py-2 text-right font-bold text-[#be123c]">{formatMoney(totalUnpaid)}</td>
                <td className="px-3 py-2 text-center text-xs text-[#6b7280]">Totals</td>
              </tr>
            </tfoot>
          </table>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              <div className="text-sm text-[#6b7280]">
                Showing <span className="font-semibold text-[#111827]">{(page - 1) * pageSize + 1}</span> to <span className="font-semibold text-[#111827]">{Math.min(page * pageSize, totalStudents)}</span> of <span className="font-semibold text-[#111827]">{totalStudents}</span> students
              </div>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={`?classId=${selectedClassId}&month=${monthKey}&page=${page - 1}`}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm font-semibold text-[#374151] hover:bg-[#f3f4f5] transition"
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm font-semibold text-[#d1d5db] cursor-not-allowed">
                    Previous
                  </span>
                )}
                {page < totalPages ? (
                  <Link
                    href={`?classId=${selectedClassId}&month=${monthKey}&page=${page + 1}`}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm font-semibold text-[#374151] hover:bg-[#f3f4f5] transition"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm font-semibold text-[#d1d5db] cursor-not-allowed">
                    Next
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: 'neutral' | 'green' | 'red' }) {
  const tones = {
    neutral: 'bg-[#f8fafc] text-[#334155]',
    green: 'bg-[#ecfdf3] text-[#15803d]',
    red: 'bg-[#fff1f2] text-[#be123c]'
  } as const;

  return (
    <div className={`rounded-xl px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="mt-0.5 text-base font-bold">{value}</p>
    </div>
  );
}
