import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { PrintButton } from '@/components/reports/print-button';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<{ studentId?: string; year?: string }>;
};

type MonthRow = {
  month: string;
  fee: number;
  discount: number;
  paid: number;
  unpaid: number;
};

function formatMoney(value: number) {
  return `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function IndividualFinanceReportPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  const now = new Date();
  const year = Number(params.year) > 2000 ? Number(params.year) : now.getFullYear();
  const from = new Date(year, 0, 1);
  from.setHours(0, 0, 0, 0);
  const to = new Date(year, 11, 31);
  to.setHours(23, 59, 59, 999);

  const students = await prisma.student.findMany({
    select: {
      id: true,
      admissionNo: true,
      user: { select: { fullName: true } },
      class: { select: { name: true, section: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const selectedStudentId = students.some((s) => s.id === params.studentId) ? params.studentId ?? '' : students[0]?.id ?? '';
  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null;

  const fees = selectedStudent
    ? await prisma.fee.findMany({
        where: { studentId: selectedStudent.id, dueDate: { gte: from, lte: to } },
        select: { dueDate: true, amount: true, discount: true, payments: { select: { amountPaid: true } } },
        orderBy: { dueDate: 'asc' }
      })
    : [];

  const rows: MonthRow[] = Array.from({ length: 12 }, (_, index) => ({
    month: new Date(year, index, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    fee: 0,
    discount: 0,
    paid: 0,
    unpaid: 0
  }));

  for (const fee of fees) {
    const idx = fee.dueDate.getMonth();
    const amount = Number(fee.amount || 0);
    const discount = Number(fee.discount || 0);
    const net = Math.max(amount - discount, 0);
    const paid = fee.payments.reduce((sum, payment) => sum + Number(payment.amountPaid || 0), 0);
    const unpaid = Math.max(net - paid, 0);

    rows[idx].fee += net;
    rows[idx].discount += discount;
    rows[idx].paid += paid;
    rows[idx].unpaid += unpaid;
  }

  const totalFee = rows.reduce((sum, row) => sum + row.fee, 0);
  const totalDiscount = rows.reduce((sum, row) => sum + row.discount, 0);
  const totalPaid = rows.reduce((sum, row) => sum + row.paid, 0);
  const totalUnpaid = rows.reduce((sum, row) => sum + row.unpaid, 0);

  return (
    <div className="space-y-4 pb-8">
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6 print:hidden">
        <Link href="/admin/reports" className="text-xs font-semibold text-[#004649] hover:text-[#1b5e62]">&larr; Back to Reports</Link>
        <h1 className="mt-2 text-2xl font-bold text-[#1a1c1c]">Individual Finance Report</h1>
        <p className="mt-1 text-sm text-[#6f7979]">12-month student fee report with paid and unpaid totals.</p>

        <form className="mt-4 grid gap-3 sm:grid-cols-3" method="get">
          <label className="text-xs font-semibold text-[#6f7979] sm:col-span-2">
            Student
            <select name="studentId" defaultValue={selectedStudentId} className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]">
              {students.map((student) => <option key={student.id} value={student.id}>{student.user.fullName}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#6f7979]">
            Year
            <input name="year" type="number" min="2020" max="2100" defaultValue={year} className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]" />
          </label>
          <div className="sm:col-span-3"><button type="submit" className="h-10 w-full rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] text-sm font-semibold text-white">Apply</button></div>
        </form>
      </div>

      {selectedStudent ? (
        <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
          <div className="mb-3 flex justify-end gap-2 print:hidden">
            <a href={`/api/reports/export?type=finance-individual&studentId=${selectedStudent.id}&year=${year}`} download className="inline-flex h-10 items-center rounded-xl bg-[#f0f2f5] px-3 text-xs font-semibold text-[#2c3e50] hover:bg-[#e8ecf0]">Download CSV</a>
            <PrintButton />
          </div>
          <div className="hidden print:block border-b border-[#e5e7eb] pb-2 mb-3">
            <h2 className="text-lg font-bold">Individual Finance Report</h2>
            <p className="text-xs text-[#64748b]">Year: {year}</p>
          </div>

          <div className="grid gap-1 text-sm text-[#374151] sm:grid-cols-3">
            <p><span className="font-semibold">Student:</span> {selectedStudent.user.fullName}</p>
            <p><span className="font-semibold">Class:</span> {selectedStudent.class ? `${selectedStudent.class.name} ${selectedStudent.class.section}` : 'Unassigned'}</p>
            <p><span className="font-semibold">Year:</span> {year}</p>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-[#e5e7eb]">
            <table className="min-w-[760px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#f8fafc] text-[#475569]">
                  <th className="border-b border-r border-[#e5e7eb] px-3 py-2 text-left">Month</th>
                  <th className="border-b border-r border-[#e5e7eb] px-3 py-2 text-right">Fee</th>
                  <th className="border-b border-r border-[#e5e7eb] px-3 py-2 text-right">Discount</th>
                  <th className="border-b border-r border-[#e5e7eb] px-3 py-2 text-right">Paid</th>
                  <th className="border-b border-[#e5e7eb] px-3 py-2 text-right">Unpaid</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.month} className="hover:bg-[#fafafa]">
                    <td className="border-b border-r border-[#e5e7eb] px-3 py-2 font-medium text-[#111827]">{row.month}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-3 py-2 text-right">{formatMoney(row.fee)}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-3 py-2 text-right">{formatMoney(row.discount)}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-3 py-2 text-right text-[#15803d]">{formatMoney(row.paid)}</td>
                    <td className="border-b border-[#e5e7eb] px-3 py-2 text-right text-[#be123c]">{formatMoney(row.unpaid)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#f8fafc]">
                  <td className="border-r border-[#e5e7eb] px-3 py-2 font-bold">Total</td>
                  <td className="border-r border-[#e5e7eb] px-3 py-2 text-right font-bold">{formatMoney(totalFee)}</td>
                  <td className="border-r border-[#e5e7eb] px-3 py-2 text-right font-bold">{formatMoney(totalDiscount)}</td>
                  <td className="border-r border-[#e5e7eb] px-3 py-2 text-right font-bold text-[#15803d]">{formatMoney(totalPaid)}</td>
                  <td className="px-3 py-2 text-right font-bold text-[#be123c]">{formatMoney(totalUnpaid)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="hidden print:flex mt-8 justify-between text-xs text-[#475569]">
            <span>Generated: {new Date().toLocaleDateString('en-GB')}</span>
            <span>Authorized Sign: __________________</span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-6 text-sm text-[#6f7979] shadow-[0_4px_12px_rgba(0,0,0,0.08)]">No student data found.</div>
      )}
    </div>
  );
}
