import { PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function statusColor(status: PaymentStatus) {
  if (status === 'PAID') return 'bg-emerald-100 text-emerald-700';
  if (status === 'PARTIAL') return 'bg-amber-100 text-amber-700';
  if (status === 'OVERDUE') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
}

function StatCard({ label, value, tone = 'teal' }: { label: string; value: string | number; tone?: 'teal' | 'amber' | 'dark' }) {
  const toneClass = tone === 'amber' ? 'text-[#895100]' : tone === 'dark' ? 'text-[#1a1c1c]' : 'text-[#124346]';
  return (
    <div className="rounded-xl bg-[#f3f4f3] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">{label}</p>
      <p className={`font-headline mt-2 text-3xl font-extrabold ${toneClass}`}>{value}</p>
    </div>
  );
}

export default async function AdminFinancePage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [feeAgg, paidAgg, monthlyAgg, pendingCount, overdueCount, recentPayments, dues] = await Promise.all([
    prisma.fee.aggregate({ _sum: { amount: true, discount: true } }),
    prisma.payment.aggregate({ _sum: { amountPaid: true } }),
    prisma.payment.aggregate({ where: { paidAt: { gte: monthStart } }, _sum: { amountPaid: true } }),
    prisma.fee.count({ where: { status: { in: ['PENDING', 'PARTIAL'] } } }),
    prisma.fee.count({ where: { status: 'OVERDUE' } }),
    prisma.payment.findMany({
      include: { fee: { include: { student: { include: { user: { select: { fullName: true } } } } } } },
      orderBy: { paidAt: 'desc' },
      take: 8
    }),
    prisma.fee.findMany({
      where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
      include: { student: { include: { user: { select: { fullName: true } } } }, payments: { select: { amountPaid: true } } },
      orderBy: [{ status: 'desc' }, { dueDate: 'asc' }],
      take: 10
    })
  ]);

  const totalBilled = Number(feeAgg._sum.amount ?? 0) - Number(feeAgg._sum.discount ?? 0);
  const totalPaid = Number(paidAgg._sum.amountPaid ?? 0);
  const thisMonthPaid = Number(monthlyAgg._sum.amountPaid ?? 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.2rem] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#6e7778]">Finance</p>
        <h2 className="font-headline mt-1 text-4xl font-extrabold tracking-[-0.03em] text-[#124346] md:text-5xl">Financial Oversight</h2>
        <p className="mt-2 text-[#596364]">Monitor fee collection, pending dues, and transaction health.</p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total Billed" value={formatCurrency(totalBilled)} tone="dark" />
          <StatCard label="Total Collected" value={formatCurrency(totalPaid)} />
          <StatCard label="This Month" value={formatCurrency(thisMonthPaid)} />
          <StatCard label="Pending Fees" value={pendingCount} tone="amber" />
          <StatCard label="Collection Rate" value={`${collectionRate}%`} tone="dark" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[1.2rem] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
          <h3 className="font-headline text-2xl font-bold tracking-[-0.02em] text-[#124346]">Recent Transactions</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f3f4f3] text-[#596364]">
                <tr>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Student</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Fee</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Method</th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.18em]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-semibold text-[#1a1c1c]">{item.fee.student.user.fullName}</td>
                    <td className="px-3 py-3">{item.fee.title}</td>
                    <td className="px-3 py-3">{item.method.replace('_', ' ')}</td>
                    <td className="px-3 py-3 text-right font-semibold">{formatCurrency(Number(item.amountPaid))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentPayments.length === 0 ? <p className="mt-4 text-sm text-[#596364]">No transactions yet.</p> : null}
          </div>
        </div>

        <div className="rounded-[1.2rem] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-2xl font-bold tracking-[-0.02em] text-[#124346]">Pending & Overdue Dues</h3>
            <span className="rounded-full bg-rose-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-700">Overdue: {overdueCount}</span>
          </div>
          <div className="mt-4 space-y-3">
            {dues.map((fee) => {
              const paid = fee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
              const total = Number(fee.amount) - Number(fee.discount);
              const remaining = Math.max(total - paid, 0);
              return (
                <div key={fee.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{fee.student.user.fullName}</p>
                      <p className="text-sm text-slate-600">{fee.title} - Due {fee.dueDate.toISOString().slice(0, 10)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor(fee.status)}`}>{fee.status}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Remaining</span>
                    <span className="font-bold text-slate-900">{formatCurrency(remaining)}</span>
                  </div>
                </div>
              );
            })}
            {dues.length === 0 ? <p className="text-sm text-[#596364]">No pending dues right now.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
