import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function statusColor(status: string) {
  if (status === 'PAID') return 'bg-emerald-100 text-emerald-700';
  if (status === 'PARTIAL') return 'bg-amber-100 text-amber-700';
  if (status === 'OVERDUE') return 'bg-rose-100 text-rose-700';
  return 'bg-[#f3f4f3] text-[#596364]';
}

export default async function StudentFeesPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);

  const student = await prisma.student.findUnique({ where: { userId: session.id }, select: { id: true } });

  if (!student) {
    return (
      <div className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <h2 className="font-headline text-3xl font-extrabold text-[#004649]">Fee Status</h2>
        <p className="mt-2 text-[#5c6668]">Student profile missing.</p>
      </div>
    );
  }

  const fees = await prisma.fee.findMany({
    where: { studentId: student.id },
    include: { payments: true },
    orderBy: { dueDate: 'asc' }
  });

  const totalDue = fees.reduce((sum, fee) => sum + Number(fee.amount) - Number(fee.discount), 0);
  const totalPaid = fees.reduce(
    (sum, fee) => sum + fee.payments.reduce((pSum, p) => pSum + Number(p.amountPaid), 0),
    0
  );
  const outstanding = Math.max(totalDue - totalPaid, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#6e7778]">Student Hub</p>
        <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.03em] text-[#004649]">Fee Status</h2>
        <p className="mt-2 text-[#5c6668]">Track your fee obligations, payments, and outstanding balances.</p>
      </section>

      {outstanding > 0 && (
        <section className="rounded-[1.75rem] bg-[#fff8ed] p-6 shadow-[0_12px_40px_rgba(137,81,0,0.08)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#895100]">Outstanding Balance</p>
          <p className="font-headline mt-2 text-4xl font-extrabold text-[#895100]">PKR {outstanding.toLocaleString()}</p>
          <p className="mt-1 text-sm text-[#7a4b00]">Please clear your dues before the next due date.</p>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">Total Fee</p>
          <p className="font-headline mt-2 text-3xl font-extrabold text-[#004649]">PKR {totalDue.toLocaleString()}</p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">Total Paid</p>
          <p className="font-headline mt-2 text-3xl font-extrabold text-emerald-700">PKR {totalPaid.toLocaleString()}</p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">Outstanding</p>
          <p className="font-headline mt-2 text-3xl font-extrabold text-[#895100]">PKR {outstanding.toLocaleString()}</p>
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <h3 className="font-headline text-2xl font-bold tracking-[-0.02em] text-[#004649]">Fee Ledger</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f4f3] text-[#596364]">
              <tr>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Title</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Due Date</th>
                <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.18em]">Amount</th>
                <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.18em]">Paid</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Status</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => {
                const feeDue = Number(fee.amount) - Number(fee.discount);
                const feePaid = fee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
                return (
                  <tr key={fee.id} className="border-b border-[#eef1f1]">
                    <td className="px-3 py-3 font-semibold text-[#1a1c1c]">{fee.title}</td>
                    <td className="px-3 py-3 text-[#596364]">{fee.dueDate.toISOString().slice(0, 10)}</td>
                    <td className="px-3 py-3 text-right font-semibold">PKR {feeDue.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-700">PKR {feePaid.toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor(fee.status)}`}>{fee.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {fees.length === 0 ? <p className="mt-4 text-sm text-[#5c6668]">No fee records available yet.</p> : null}
        </div>
      </section>
    </div>
  );
}