import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const reportItems = [
  { key: 'attendance', label: 'Attendance CSV', href: '/api/reports/export?type=attendance' },
  { key: 'fees', label: 'Fee CSV', href: '/api/reports/export?type=fees' },
  { key: 'results', label: 'Results CSV', href: '/api/reports/export?type=results' }
] as const;

export default async function AdminReportsPage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [students, teachers, classes, attendanceThisMonth, unpaidFees, exams, results, lastPayments] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.class.count(),
    prisma.attendance.count({ where: { date: { gte: monthStart } } }),
    prisma.fee.count({ where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } }),
    prisma.exam.count(),
    prisma.result.count(),
    prisma.payment.findMany({
      select: { id: true, amountPaid: true, paidAt: true, fee: { select: { title: true } } },
      orderBy: { paidAt: 'desc' },
      take: 6
    })
  ]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h2 className="text-2xl font-bold text-[#1a1c1c]">Reports</h2>
        <p className="mt-1 text-sm text-[#6f7979]">Generate exports and management summaries for academic operations.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg bg-[#f5f7f5] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Students</p>
            <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{students}</p>
          </div>
          <div className="rounded-lg bg-[#f5f7f5] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Teachers</p>
            <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{teachers}</p>
          </div>
          <div className="rounded-lg bg-[#f5f7f5] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Classes</p>
            <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{classes}</p>
          </div>
          <div className="rounded-lg bg-[#f5f7f5] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Attendance (Month)</p>
            <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{attendanceThisMonth}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <h3 className="font-semibold text-[#1a1c1c] mb-4">Quick Export</h3>
          <div className="space-y-2">
            {reportItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className="flex items-center justify-between rounded-lg border border-[#e2e8e8] px-4 py-3 text-sm text-[#1a1c1c] hover:bg-[#f5f7f5]"
              >
                <span>{item.label}</span>
                <span className="font-semibold text-[#004649]">Download</span>
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <h3 className="font-semibold text-[#1a1c1c] mb-4">Operational Summary</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-[#f5f7f5] px-4 py-3 text-sm">
              <span className="text-[#6f7979]">Unpaid Fee Records</span>
              <span className="font-bold text-[#ba1a1a]">{unpaidFees}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#f5f7f5] px-4 py-3 text-sm">
              <span className="text-[#6f7979]">Total Exams</span>
              <span className="font-bold text-[#1a1c1c]">{exams}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#f5f7f5] px-4 py-3 text-sm">
              <span className="text-[#6f7979]">Published Results</span>
              <span className="font-bold text-[#1a1c1c]">{results}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h3 className="font-semibold text-[#1a1c1c] mb-4">Recent Payment Activity</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e2e8e8]">
              <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Fee Title</th>
              <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Date</th>
              <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8e8]">
            {lastPayments.map((payment) => (
              <tr key={payment.id}>
                <td className="py-3 font-medium text-[#1a1c1c]">{payment.fee.title}</td>
                <td className="py-3 text-[#6f7979]">{payment.paidAt.toISOString().slice(0, 10)}</td>
                <td className="py-3 text-right font-semibold text-[#1a1c1c]">${Number(payment.amountPaid).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {lastPayments.length === 0 ? <p className="mt-4 text-sm text-[#6f7979]">No payment activity found.</p> : null}
      </div>
    </div>
  );
}
