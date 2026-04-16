import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function StudentFeesPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);

  const student = await prisma.student.findUnique({ where: { userId: session.id }, select: { id: true } });

  if (!student) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h2 className="font-headline text-4xl font-extrabold text-slate-900">Fee Status</h2>
        <p className="mt-2 text-slate-600">Student profile missing.</p>
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
    (sum, fee) => sum + fee.payments.reduce((pSum, payment) => pSum + Number(payment.amountPaid), 0),
    0
  );
  const outstanding = Math.max(totalDue - totalPaid, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h2 className="font-headline text-4xl font-extrabold tracking-tight text-slate-900">Fee Status</h2>
        <p className="mt-2 text-slate-600">
          Total Due: PKR {totalDue.toLocaleString()} | Paid: PKR {totalPaid.toLocaleString()} | Outstanding: PKR {outstanding.toLocaleString()}
        </p>
      </section>

      <section className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Due Date</th>
                <th className="px-3 py-2 text-left">Amount</th>
                <th className="px-3 py-2 text-left">Paid</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => {
                const feePaid = fee.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0);
                const feeDue = Number(fee.amount) - Number(fee.discount);
                return (
                  <tr key={fee.id} className="border-b border-slate-100">
                    <td className="px-3 py-2">{fee.title}</td>
                    <td className="px-3 py-2">{fee.dueDate.toISOString().slice(0, 10)}</td>
                    <td className="px-3 py-2">PKR {feeDue.toLocaleString()}</td>
                    <td className="px-3 py-2">PKR {feePaid.toLocaleString()}</td>
                    <td className="px-3 py-2">{fee.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {fees.length === 0 ? <p className="mt-4 text-sm text-slate-600">No fee records available yet.</p> : null}
      </section>
    </div>
  );
}