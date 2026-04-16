import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const reportItems = [
  { key: 'attendance', label: 'Attendance CSV', href: '/api/reports/export?type=attendance' },
  { key: 'fees', label: 'Fee CSV', href: '/api/reports/export?type=fees' },
  { key: 'results', label: 'Results CSV', href: '/api/reports/export?type=results' }
] as const;

function StatCard({ label, value, tone = 'dark' }: { label: string; value: number; tone?: 'dark' | 'teal' | 'amber' }) {
  const toneClass = tone === 'teal' ? 'text-[#124346]' : tone === 'amber' ? 'text-[#895100]' : 'text-[#1a1c1c]';
  return (
    <div className="rounded-xl bg-[#f3f4f3] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">{label}</p>
      <p className={`font-headline mt-2 text-3xl font-extrabold ${toneClass}`}>{value}</p>
    </div>
  );
}

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
    <div className="space-y-6">
      <section className="rounded-[1.2rem] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#6e7778]">Reports</p>
        <h2 className="font-headline mt-1 text-4xl font-extrabold tracking-[-0.03em] text-[#124346] md:text-5xl">Academic Reports</h2>
        <p className="mt-2 text-[#596364]">Generate exports and management summaries for academic operations.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Students" value={students} />
          <StatCard label="Teachers" value={teachers} />
          <StatCard label="Classes" value={classes} />
          <StatCard label="Attendance (Month)" value={attendanceThisMonth} tone="teal" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[1.2rem] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
          <h3 className="font-headline text-2xl font-bold tracking-[-0.02em] text-[#124346]">Quick Export</h3>
          <div className="mt-4 grid gap-3">
            {reportItems.map((item) => (
              <a key={item.key} href={item.href} className="inline-flex items-center justify-between rounded-xl border border-[#d4dee7] px-4 py-3 text-sm font-semibold text-[#1a1c1c] hover:bg-[#f3f4f3]">
                <span>{item.label}</span>
                <span>Download</span>
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-[1.2rem] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
          <h3 className="font-headline text-2xl font-bold tracking-[-0.02em] text-[#124346]">Operational Summary</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-[#f3f4f3] px-4 py-3"><span className="text-[#596364]">Unpaid Fee Records</span><span className="font-bold text-[#895100]">{unpaidFees}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-[#f3f4f3] px-4 py-3"><span className="text-[#596364]">Total Exams</span><span className="font-bold text-[#1a1c1c]">{exams}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-[#f3f4f3] px-4 py-3"><span className="text-[#596364]">Published Results</span><span className="font-bold text-[#1a1c1c]">{results}</span></div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.2rem] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
        <h3 className="font-headline text-2xl font-bold tracking-[-0.02em] text-[#124346]">Recent Payment Activity</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f4f3] text-[#596364]">
              <tr>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Fee Title</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Date</th>
                <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.18em]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lastPayments.map((payment) => (
                <tr key={payment.id} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-semibold text-[#1a1c1c]">{payment.fee.title}</td>
                  <td className="px-3 py-3">{payment.paidAt.toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-3 text-right font-semibold">${Number(payment.amountPaid).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {lastPayments.length === 0 ? <p className="mt-4 text-sm text-[#596364]">No payment activity found.</p> : null}
        </div>
      </section>
    </div>
  );
}
