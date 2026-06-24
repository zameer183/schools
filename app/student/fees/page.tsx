import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader, KpiCard, Card, StatusBadge } from '@/components/ui';
import { Wallet, TrendingDown, CheckCircle2, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

function toDateString(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toISOString().slice(0, 10);
}

function toMonthString(value: Date | string | null) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function feePeriodLabel(fee: { fromDate: Date | null; toDate: Date | null; dueDate: Date }) {
  const from = toMonthString(fee.fromDate);
  const to = toMonthString(fee.toDate);
  if (from && to && from !== to) return `${from} - ${to}`;
  if (from) return from;
  return toMonthString(fee.dueDate) ?? '-';
}

function computedFeeStatus(feePaid: number, remaining: number, _dueDate: Date) {
  if (remaining <= 0) return 'PAID';
  if (feePaid > 0) return 'PARTIAL';
  return 'DUE';
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

  const paidPercent = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Status"
        subtitle="Track your payments, dues, and billing history."
        badge={
          outstanding > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEE2E2] px-3 py-1.5 text-xs font-bold text-[#DC2626]">
              <AlertCircle className="h-3 w-3" />
              Balance Due
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D1FAE5] px-3 py-1.5 text-xs font-bold text-[#10B981]">
              <CheckCircle2 className="h-3 w-3" />
              All Clear
            </span>
          )
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard variant="primary" icon={<Wallet />} label="Total Fee" value={`PKR ${totalDue.toLocaleString()}`} />
        <KpiCard variant="success" icon={<CheckCircle2 />} label="Amount Paid" value={`PKR ${totalPaid.toLocaleString()}`} />
        <KpiCard variant={outstanding > 0 ? 'danger' : 'success'} icon={outstanding > 0 ? <TrendingDown /> : <CheckCircle2 />} label="Due" value={outstanding > 0 ? `PKR ${outstanding.toLocaleString()}` : 'Paid'} />
      </section>

      {totalDue > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-[#1F2937]">Payment Progress</p>
            <span className="text-sm font-bold text-[#1F5A5C]">{paidPercent}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[#E5E7EB]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${paidPercent}%`,
                backgroundColor: paidPercent >= 100 ? '#10B981' : paidPercent >= 50 ? '#D69E3F' : '#EF4444'
              }}
            />
          </div>
          <p className="mt-2 text-xs text-[#6B7280]">PKR {totalPaid.toLocaleString()} paid of PKR {totalDue.toLocaleString()} total</p>
        </Card>
      )}

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
                const status = computedFeeStatus(feePaid, remaining, fee.dueDate);
                const statusVariant = status === 'PAID' ? 'success' : status === 'PARTIAL' ? 'pending' : 'danger';
                return (
                  <div key={fee.id} className="rounded-lg bg-[#F9FAFB] p-4 border border-[#E5E7EB]">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <p className="text-sm font-semibold text-[#1F2937]">{fee.title}</p>
                      <StatusBadge variant={statusVariant}>{status}</StatusBadge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-[#6B7280]">
                      <span>Period: <span className="text-[#1F2937] font-semibold">{feePeriodLabel(fee)}</span></span>
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
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Period</th>
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
                    const status = computedFeeStatus(feePaid, remaining, fee.dueDate);
                    const statusVariant = status === 'PAID' ? 'success' : status === 'PARTIAL' ? 'pending' : 'danger';
                    return (
                      <tr key={fee.id}>
                        <td className="px-3 py-3 font-medium text-[#1F2937]">{fee.title}</td>
                        <td className="px-3 py-3 text-[#6B7280]">{feePeriodLabel(fee)}</td>
                        <td className="px-3 py-3 text-[#6B7280]">{toDateString(fee.dueDate)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-[#1F2937]">PKR {feeDue.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-semibold text-[#10B981]">PKR {feePaid.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-semibold text-[#EF4444]">PKR {remaining.toLocaleString()}</td>
                        <td className="px-3 py-3">
                          <StatusBadge variant={statusVariant}>{status}</StatusBadge>
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
