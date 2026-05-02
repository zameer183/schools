import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader, Card, StatusBadge } from '@/components/ui';
import { Wallet } from 'lucide-react';

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
      <PageHeader
        title="Fee Status"
        subtitle={`Due: PKR ${totalDue.toLocaleString()} | Paid: PKR ${totalPaid.toLocaleString()} | Outstanding: PKR ${outstanding.toLocaleString()}`}
      />

      <Card>

        {fees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Wallet className="h-10 w-10 text-[#E5E7EB]" />
            <p className="mt-2 text-sm text-[#9CA3AF]">No fee records yet</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {fees.map((fee) => {
                const feeDue = Number(fee.amount) - Number(fee.discount);
                const feePaid = fee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
                const remaining = Math.max(feeDue - feePaid, 0);
                const statusVariant = fee.status === 'PAID' ? 'success' : fee.status === 'PARTIAL' ? 'pending' : 'danger';
                return (
                  <div key={fee.id} className="rounded-lg bg-[#F9FAFB] p-4 border border-[#E5E7EB]">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <p className="text-sm font-semibold text-[#1F2937]">{fee.title}</p>
                      <StatusBadge variant={statusVariant}>{fee.status}</StatusBadge>
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
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Title</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Due</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-[#6B7280]">Amount</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-[#6B7280]">Paid</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-[#6B7280]">Remaining</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {fees.map((fee) => {
                    const feeDue = Number(fee.amount) - Number(fee.discount);
                    const feePaid = fee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
                    const remaining = Math.max(feeDue - feePaid, 0);
                    const statusVariant = fee.status === 'PAID' ? 'success' : fee.status === 'PARTIAL' ? 'pending' : 'danger';
                    return (
                      <tr key={fee.id}>
                        <td className="px-3 py-3 font-medium text-[#1F2937]">{fee.title}</td>
                        <td className="px-3 py-3 text-[#6B7280]">{toDateString(fee.dueDate)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-[#1F2937]">PKR {feeDue.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-semibold text-[#10B981]">PKR {feePaid.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-semibold text-[#EF4444]">PKR {remaining.toLocaleString()}</td>
                        <td className="px-3 py-3">
                          <StatusBadge variant={statusVariant}>{fee.status}</StatusBadge>
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
