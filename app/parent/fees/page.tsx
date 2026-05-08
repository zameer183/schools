import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getParentContext } from '@/lib/parent-data';
import { PageHeader, KpiCard, Card, StatusBadge } from '@/components/ui';
import { Wallet, Receipt, AlertCircle, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

function toDateString(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toISOString().slice(0, 10);
}

export default async function ParentFeesPage() {
  const session = await requireAuth([UserRole.PARENT, UserRole.ADMIN]);
  const context = await getParentContext(session.id);

  if (!context) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center text-center py-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FEE2E2]">
            <AlertCircle className="h-7 w-7 text-[#EF4444]" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[#1F2937]">Fees Unavailable</h2>
          <p className="mt-1 max-w-sm text-sm text-[#6B7280]">Parent profile missing. Contact your administrator.</p>
        </div>
      </Card>
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
      <PageHeader
        title="Fee Status"
        subtitle={`Due: PKR ${totalDue.toLocaleString()} | Paid: PKR ${totalPaid.toLocaleString()} | Outstanding: PKR ${outstanding.toLocaleString()}`}
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard variant="primary" icon={<Receipt />} label="Fee Heads" value={fees.length} />
        <KpiCard variant="success" icon={<CheckCircle2 />} label="Paid" value={`PKR ${totalPaid.toLocaleString()}`} />
        <KpiCard
          variant={outstanding > 0 ? 'danger' : 'success'}
          icon={<Wallet />}
          label="Outstanding"
          value={outstanding > 0 ? `PKR ${outstanding.toLocaleString()}` : 'Clear'}
        />
        <KpiCard variant="primary" icon={<Receipt />} label="Payments" value={payments.length} />
      </section>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0EBEC]">
            <Wallet className="h-4 w-4 text-[#1F5A5C]" />
          </div>
          <h3 className="text-sm font-bold text-[#1F2937]">Fee Ledger</h3>
        </div>

        {fees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Wallet className="h-10 w-10 text-[#E5E7EB]" />
            <p className="mt-2 text-sm text-[#9CA3AF]">No fee records yet</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {fees.map((fee) => {
                const amount = Number(fee.amount) - Number(fee.discount);
                const paid = fee.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0);
                const remaining = Math.max(amount - paid, 0);
                const statusVariant =
                  fee.status === 'PAID' ? 'success' : fee.status === 'PARTIAL' ? 'pending' : 'danger';
                return (
                  <div key={fee.id} className="rounded-lg bg-[#F9FAFB] p-3 border border-[#E5E7EB]">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#1F2937] truncate">{fee.student.user.fullName}</p>
                        <p className="text-xs text-[#6B7280] truncate">{fee.title}</p>
                      </div>
                      <StatusBadge variant={statusVariant}>{fee.status}</StatusBadge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[#6B7280]">
                      <span>
                        Due: <span className="text-[#1F2937] font-semibold">{toDateString(fee.dueDate)}</span>
                      </span>
                      <span>
                        Amount: <span className="text-[#1F2937] font-semibold">PKR {amount.toLocaleString()}</span>
                      </span>
                      <span>
                        Paid: <span className="text-[#10B981] font-semibold">PKR {paid.toLocaleString()}</span>
                      </span>
                      <span>
                        Remaining:{' '}
                        <span className="text-[#EF4444] font-semibold">PKR {remaining.toLocaleString()}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Student</th>
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
                    const amount = Number(fee.amount) - Number(fee.discount);
                    const paid = fee.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0);
                    const remaining = Math.max(amount - paid, 0);
                    const statusVariant =
                      fee.status === 'PAID' ? 'success' : fee.status === 'PARTIAL' ? 'pending' : 'danger';
                    return (
                      <tr key={fee.id}>
                        <td className="px-3 py-3 font-medium text-[#1F2937]">{fee.student.user.fullName}</td>
                        <td className="px-3 py-3 text-[#1F2937]">{fee.title}</td>
                        <td className="px-3 py-3 text-[#6B7280]">{toDateString(fee.dueDate)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-[#1F2937]">
                          PKR {amount.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-[#10B981]">
                          PKR {paid.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-[#EF4444]">
                          PKR {remaining.toLocaleString()}
                        </td>
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

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D1FAE5]">
            <Receipt className="h-4 w-4 text-[#10B981]" />
          </div>
          <h3 className="text-sm font-bold text-[#1F2937]">Recent Payments</h3>
        </div>

        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Receipt className="h-10 w-10 text-[#E5E7EB]" />
            <p className="mt-2 text-sm text-[#9CA3AF]">No payment entries yet</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {payments.map((payment) => (
                <div key={payment.id} className="rounded-lg bg-[#F9FAFB] p-3 border border-[#E5E7EB]">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1F2937] truncate">
                        {payment.fee.student.user.fullName}
                      </p>
                      <p className="text-xs text-[#6B7280] truncate">{payment.fee.title}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-[#10B981]">
                      PKR {Number(payment.amountPaid).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[#6B7280]">
                    <span>
                      Date: <span className="text-[#1F2937] font-semibold">{toDateString(payment.paidAt)}</span>
                    </span>
                    <span>
                      Method: <span className="text-[#1F2937] font-semibold">{payment.method}</span>
                    </span>
                    {payment.transactionRef ? (
                      <span className="col-span-2">
                        Ref: <span className="text-[#1F2937] font-semibold">{payment.transactionRef}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Student</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Fee</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-[#6B7280]">Amount</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Method</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-3 py-3 text-[#1F2937]">{toDateString(payment.paidAt)}</td>
                      <td className="px-3 py-3 text-[#1F2937]">{payment.fee.student.user.fullName}</td>
                      <td className="px-3 py-3 text-[#6B7280]">{payment.fee.title}</td>
                      <td className="px-3 py-3 text-right font-semibold text-[#10B981]">
                        PKR {Number(payment.amountPaid).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-[#1F2937]">{payment.method}</td>
                      <td className="px-3 py-3 text-[#6B7280]">{payment.transactionRef ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
