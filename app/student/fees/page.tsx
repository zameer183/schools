import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

function toDateString(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toISOString().slice(0, 10);
}

const getCachedStudentFeesData = unstable_cache(
  async (userId: string) => {
    const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
    if (!student) return { student: null, fees: [] as Awaited<ReturnType<typeof prisma.fee.findMany>> };

    const fees = await prisma.fee.findMany({
      where: { studentId: student.id },
      include: { payments: true },
      orderBy: { dueDate: 'asc' }
    });

    return { student, fees };
  },
  ['student-fees-page-data'],
  { revalidate: 30 }
);

export default async function StudentFeesPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);
  const { student, fees } = await getCachedStudentFeesData(session.id);

  if (!student) {
    return (
      <Card className="p-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1F2937]">Fee Status</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Student profile missing.</p>
      </Card>
    );
  }

  const totalDue = fees.reduce((sum, fee) => sum + Number(fee.amount) - Number(fee.discount), 0);
  const totalPaid = fees.reduce(
    (sum, fee) => sum + fee.payments.reduce((pSum, p) => pSum + Number(p.amountPaid), 0),
    0
  );
  const outstanding = Math.max(totalDue - totalPaid, 0);

  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1F2937]">Fee Status</h2>
        <p className="mt-2 text-sm text-[#6B7280]">
          Due: PKR {totalDue.toLocaleString()} | Paid: PKR {totalPaid.toLocaleString()} | Outstanding: PKR {outstanding.toLocaleString()}
        </p>
      </Card>

      <Card className="p-5 md:p-6">
        <h3 className="text-lg font-semibold text-[#1F2937] mb-4">Fee Ledger</h3>

        {fees.length === 0 ? (
          <p className="text-sm text-[#6B7280]">No fee records yet.</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {fees.map((fee) => {
                const feeDue = Number(fee.amount) - Number(fee.discount);
                const feePaid = fee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
                const remaining = Math.max(feeDue - feePaid, 0);
                const statusBg = fee.status === 'PAID' ? 'bg-[#D1FAE5] text-[#10B981]' : fee.status === 'PARTIAL' ? 'bg-[#FEF3C7] text-[#D69E3F]' : 'bg-[#FEE2E2] text-[#EF4444]';
                return (
                  <div key={fee.id} className="rounded-lg bg-[#F5F1E8] p-4 border border-[#E5E7EB]">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <p className="text-sm font-semibold text-[#1F2937]">{fee.title}</p>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusBg}`}>{fee.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-[#6B7280]">
                      <span>Due: <span className="text-[#1F2937] font-semibold">{toDateString(fee.dueDate)}</span></span>
                      <span>Amount: <span className="text-[#1F2937] font-semibold">PKR {feeDue.toLocaleString()}</span></span>
                      <span>Paid: <span className="text-[#10B981] font-semibold">PKR {feePaid.toLocaleString()}</span></span>
                      <span>Remaining: <span className="text-[#EF4444] font-semibold">PKR {remaining.toLocaleString()}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[560px] w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F5F1E8]">
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Title</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Due</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Amount</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Paid</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Remaining</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {fees.map((fee) => {
                    const feeDue = Number(fee.amount) - Number(fee.discount);
                    const feePaid = fee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
                    const remaining = Math.max(feeDue - feePaid, 0);
                    const statusBg = fee.status === 'PAID' ? 'bg-[#D1FAE5] text-[#10B981]' : fee.status === 'PARTIAL' ? 'bg-[#FEF3C7] text-[#D69E3F]' : 'bg-[#FEE2E2] text-[#EF4444]';
                    return (
                      <tr key={fee.id}>
                        <td className="px-3 py-3 font-medium text-[#1F2937]">{fee.title}</td>
                        <td className="px-3 py-3 text-[#6B7280]">{toDateString(fee.dueDate)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-[#1F2937]">PKR {feeDue.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-semibold text-[#10B981]">PKR {feePaid.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-semibold text-[#EF4444]">PKR {remaining.toLocaleString()}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusBg}`}>{fee.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
