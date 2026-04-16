import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getParentContext } from '@/lib/parent-data';

export const dynamic = 'force-dynamic';

export default async function ParentFeesPage() {
  const session = await requireAuth([UserRole.PARENT, UserRole.ADMIN]);
  const context = await getParentContext(session.id);

  if (!context) {
    return (
      <div className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Fees</h2>
        <p className="mt-2 text-[#5c6668]">Parent profile missing.</p>
      </div>
    );
  }

  const { parent, childIds } = context;

  const [fees, payments] = await Promise.all([
    prisma.fee.findMany({
      where: { studentId: { in: childIds } },
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        payments: { orderBy: { paidAt: 'desc' } }
      },
      orderBy: { dueDate: 'asc' }
    }),
    prisma.payment.findMany({
      where: {
        OR: [{ parentId: parent.id }, { fee: { studentId: { in: childIds } } }]
      },
      include: {
        fee: {
          include: {
            student: { include: { user: { select: { fullName: true } } } }
          }
        }
      },
      orderBy: { paidAt: 'desc' },
      take: 25
    })
  ]);

  const totalDue = fees.reduce((sum, fee) => sum + Number(fee.amount) - Number(fee.discount), 0);
  const totalPaid = fees.reduce(
    (sum, fee) => sum + fee.payments.reduce((paymentSum, payment) => paymentSum + Number(payment.amountPaid), 0),
    0
  );
  const outstanding = Math.max(totalDue - totalPaid, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Fee Status</h2>
        <p className="mt-2 text-[#5c6668]">
          Total Due: PKR {totalDue.toLocaleString()} | Paid: PKR {totalPaid.toLocaleString()} | Outstanding: PKR {outstanding.toLocaleString()}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 border border-[#e2e8e8]">
          <p className="text-sm text-[#6e7778]">Total Fee Heads</p>
          <p className="mt-2 text-3xl font-black text-[#004649]">{fees.length}</p>
        </div>
        <div className="rounded-xl bg-white p-5 border border-[#e2e8e8]">
          <p className="text-sm text-[#6e7778]">Payments Logged</p>
          <p className="mt-2 text-3xl font-black text-[#1b5e62]">{payments.length}</p>
        </div>
        <div className="rounded-xl bg-white p-5 border border-[#e2e8e8]">
          <p className="text-sm text-[#6e7778]">Outstanding</p>
          <p className="mt-2 text-3xl font-black text-[#895100]">PKR {outstanding.toLocaleString()}</p>
        </div>
      </section>

      <section className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
        <h3 className="font-semibold text-[#1a1c1c]">Fee Ledger</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f4f3] text-[#5c6668]">
              <tr>
                <th className="px-3 py-2 text-left">Student</th>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Due Date</th>
                <th className="px-3 py-2 text-left">Amount</th>
                <th className="px-3 py-2 text-left">Paid</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => {
                const amount = Number(fee.amount) - Number(fee.discount);
                const paid = fee.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0);
                return (
                  <tr key={fee.id} className="border-b border-[#eef1f1]">
                    <td className="px-3 py-3">{fee.student.user.fullName}</td>
                    <td className="px-3 py-3">{fee.title}</td>
                    <td className="px-3 py-3">{fee.dueDate.toISOString().slice(0, 10)}</td>
                    <td className="px-3 py-3">PKR {amount.toLocaleString()}</td>
                    <td className="px-3 py-3">PKR {paid.toLocaleString()}</td>
                    <td className="px-3 py-3 font-semibold text-[#004649]">{fee.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {fees.length === 0 ? <p className="mt-4 text-sm text-[#5c6668]">No fee records found yet.</p> : null}
      </section>

      <section className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
        <h3 className="font-semibold text-[#1a1c1c]">Recent Payments</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f4f3] text-[#5c6668]">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Student</th>
                <th className="px-3 py-2 text-left">Fee</th>
                <th className="px-3 py-2 text-left">Amount</th>
                <th className="px-3 py-2 text-left">Method</th>
                <th className="px-3 py-2 text-left">Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-[#eef1f1]">
                  <td className="px-3 py-3">{payment.paidAt.toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-3">{payment.fee.student.user.fullName}</td>
                  <td className="px-3 py-3">{payment.fee.title}</td>
                  <td className="px-3 py-3">PKR {Number(payment.amountPaid).toLocaleString()}</td>
                  <td className="px-3 py-3">{payment.method}</td>
                  <td className="px-3 py-3">{payment.transactionRef ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {payments.length === 0 ? <p className="mt-4 text-sm text-[#5c6668]">No payment entries found yet.</p> : null}
      </section>
    </div>
  );
}
