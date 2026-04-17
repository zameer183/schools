import { PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function statusColor(status: PaymentStatus) {
  if (status === 'PAID') return 'bg-[#e8f5e9] text-[#004649]';
  if (status === 'PARTIAL') return 'bg-[#fff3e0] text-[#865300]';
  if (status === 'OVERDUE') return 'bg-[#fde8e8] text-[#ba1a1a]';
  return 'bg-[#f5f7f5] text-[#6f7979]';
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
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h2 className="text-2xl font-bold text-[#1a1c1c] sm:text-3xl">Finance</h2>
        <p className="mt-1 text-sm text-[#6f7979]">Monitor fee collection, pending dues, and transaction health.</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Total Billed', value: formatCurrency(totalBilled) },
            { label: 'Total Collected', value: formatCurrency(totalPaid) },
            { label: 'This Month', value: formatCurrency(thisMonthPaid) },
            { label: 'Pending Fees', value: pendingCount },
            { label: 'Collection Rate', value: `${collectionRate}%` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-[#f5f7f5] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">{label}</p>
              <p className="mt-2 text-2xl font-bold text-[#1a1c1c]">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <h3 className="font-semibold text-[#1a1c1c] mb-4">Recent Transactions</h3>
          <div className="space-y-2 md:hidden">
            {recentPayments.map((item) => (
              <div key={item.id} className="rounded-lg border border-[#e2e8e8] p-3">
                <p className="font-semibold text-[#1a1c1c]">{item.fee.student.user.fullName}</p>
                <p className="text-xs text-[#6f7979] mt-0.5">{item.fee.title}</p>
                <p className="mt-1 text-sm font-bold text-[#1a1c1c]">{formatCurrency(Number(item.amountPaid))}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="hidden w-full min-w-[520px] text-sm md:table">
            <thead>
              <tr className="border-b border-[#e2e8e8]">
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Student</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Fee</th>
                <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8e8]">
              {recentPayments.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 font-medium text-[#1a1c1c]">{item.fee.student.user.fullName}</td>
                  <td className="py-3 text-[#6f7979]">{item.fee.title}</td>
                  <td className="py-3 text-right font-semibold text-[#1a1c1c]">{formatCurrency(Number(item.amountPaid))}</td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          {recentPayments.length === 0 ? <p className="mt-4 text-sm text-[#6f7979]">No transactions yet.</p> : null}
        </div>

        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-[#1a1c1c]">Pending &amp; Overdue Dues</h3>
            <span className="rounded-full bg-[#fde8e8] px-3 py-1 text-[10px] font-bold text-[#ba1a1a]">
              Overdue: {overdueCount}
            </span>
          </div>
          <div className="space-y-3">
            {dues.map((fee) => {
              const paid = fee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
              const total = Number(fee.amount) - Number(fee.discount);
              const remaining = Math.max(total - paid, 0);
              return (
                <div key={fee.id} className="rounded-lg border border-[#e2e8e8] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#1a1c1c]">{fee.student.user.fullName}</p>
                      <p className="text-xs text-[#6f7979] mt-0.5">{fee.title} — Due {fee.dueDate.toISOString().slice(0, 10)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusColor(fee.status)}`}>
                      {fee.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-[#6f7979]">Remaining</span>
                    <span className="font-bold text-[#004649]">{formatCurrency(remaining)}</span>
                  </div>
                </div>
              );
            })}
            {dues.length === 0 ? <p className="text-sm text-[#6f7979]">No pending dues right now.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
