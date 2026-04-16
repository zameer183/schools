import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function StudentFeesPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);

  const student = await prisma.student.findUnique({ where: { userId: session.id }, select: { id: true } });

  if (!student) {
    return (
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-8">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Fee Status</h2>
        <p className="mt-2 text-sm text-[#6f7979]">Student profile missing.</p>
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
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Fee Status</h2>
        <p className="mt-1 text-sm text-[#6f7979]">
          Total Due: PKR {totalDue.toLocaleString()} | Paid: PKR {totalPaid.toLocaleString()} | Outstanding: PKR {outstanding.toLocaleString()}
        </p>
      </div>

      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h3 className="font-semibold text-[#1a1c1c] mb-4">Fee Ledger</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8e8]">
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Title</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Due Date</th>
                <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Amount</th>
                <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Paid</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8e8]">
              {fees.map((fee) => {
                const feeDue = Number(fee.amount) - Number(fee.discount);
                const feePaid = fee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
                return (
                  <tr key={fee.id}>
                    <td className="py-3 font-medium text-[#1a1c1c]">{fee.title}</td>
                    <td className="py-3 text-[#6f7979]">{fee.dueDate.toISOString().slice(0, 10)}</td>
                    <td className="py-3 text-right font-semibold text-[#1a1c1c]">PKR {feeDue.toLocaleString()}</td>
                    <td className="py-3 text-right font-semibold text-[#004649]">PKR {feePaid.toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        fee.status === 'PAID' ? 'bg-[#e8f5e9] text-[#004649]' :
                        fee.status === 'PARTIAL' ? 'bg-[#fff3e0] text-[#865300]' :
                        fee.status === 'OVERDUE' ? 'bg-[#fde8e8] text-[#ba1a1a]' :
                        'bg-[#f5f7f5] text-[#6f7979]'
                      }`}>{fee.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {fees.length === 0 ? <p className="mt-4 text-sm text-[#6f7979]">No fee records available yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
