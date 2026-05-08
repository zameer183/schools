import { prisma } from '@/lib/prisma';
import { PaymentStatus } from '@prisma/client';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_PILL = {
  PAID:    { label: 'Paid',    cls: 'bg-[#1B4D4B]/10 text-[#1B4D4B]' },
  PARTIAL: { label: 'Partial', cls: 'bg-[#E68A00]/20 text-[#854F0B]' },
  PENDING: { label: 'Pending', cls: 'bg-[#6B7280]/20 text-[#444441]' },
  OVERDUE: { label: 'Overdue', cls: 'bg-[#B91C1C]/15 text-[#791F1F]' }
} as const;

export default async function MobileAdminFeesPage() {
  const [feeAgg, paymentAgg, fees, statusCounts] = await Promise.all([
    prisma.fee.aggregate({ _sum: { amount: true } }),
    prisma.payment.aggregate({ _sum: { amountPaid: true } }),
    prisma.fee.findMany({
      orderBy: { dueDate: 'desc' },
      take: 12,
      include: {
        student: {
          include: {
            user: { select: { fullName: true } },
            class: { select: { name: true, section: true } }
          }
        }
      }
    }),
    prisma.fee.groupBy({ by: ['status'], _count: true })
  ]);

  const totalInvoiced = Number(feeAgg._sum.amount ?? 0);
  const totalCollected = Number(paymentAgg._sum.amountPaid ?? 0);
  const pct = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  const countByStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count as number])
  ) as Partial<Record<PaymentStatus, number>>;

  const today = new Date();
  const dayMs = 86400000;

  return (
    <div className="flex flex-col">
      <header className="px-4 pt-5 pb-3">
        <h1 className="text-lg font-semibold text-[#111]">Fees</h1>
        <p className="text-[10px] text-[#6B7280]">Live collection · academic year</p>
      </header>

      <section className="mx-4 mb-3 rounded-2xl border border-[#E5E7EB] bg-white p-4">
        <p className="text-[10px] text-[#6B7280]">Total collected</p>
        <p className="mt-1 text-2xl font-semibold text-[#111]">{formatCurrency(totalCollected)}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded-md bg-[#1B4D4B]/10 px-2 py-0.5 text-[10px] font-medium text-[#1B4D4B]">{pct}% paid</span>
          <span className="text-[10px] text-[#6B7280]">of {formatCurrency(totalInvoiced)} invoiced</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
          <div className="h-full bg-[#1B4D4B]" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </section>

      <div className="grid grid-cols-3 gap-1.5 px-4 pb-3">
        <div className="rounded-xl bg-[#1B4D4B] p-2 text-center text-xs font-medium text-white">
          Pending · {countByStatus.PENDING ?? 0}
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-2 text-center text-xs text-[#6B7280]">
          Partial · {countByStatus.PARTIAL ?? 0}
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-2 text-center text-xs text-[#6B7280]">
          Overdue · {countByStatus.OVERDUE ?? 0}
        </div>
      </div>

      <ul className="flex flex-col gap-2 px-4 pb-4">
        {fees.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[#E5E7EB] py-10 text-center text-xs text-[#6B7280]">
            No fee records yet
          </li>
        ) : (
          fees.map((f) => {
            const pill = STATUS_PILL[f.status as keyof typeof STATUS_PILL];
            const classLabel = f.student.class
              ? `Grade ${f.student.class.name}-${f.student.class.section}`
              : 'Unassigned';
            const daysToDue = Math.round((f.dueDate.getTime() - today.getTime()) / dayMs);
            const dueText =
              daysToDue < 0 ? `${Math.abs(daysToDue)} days overdue`
              : daysToDue === 0 ? 'Due today'
              : `Due in ${daysToDue} days`;
            const amountColor =
              f.status === 'OVERDUE' ? 'text-[#B91C1C]'
              : f.status === 'PAID' ? 'text-[#1B4D4B]'
              : 'text-[#653B28]';

            return (
              <li key={f.id} className="rounded-xl border border-[#E5E7EB] bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[#111]">
                      {f.student.user.fullName} · {f.title}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-[#6B7280]">
                      {classLabel} · {f.student.admissionNo}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${amountColor}`}>
                    {formatCurrency(Number(f.amount))}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-[9px] font-medium ${pill.cls}`}>
                    {pill.label}
                  </span>
                  <span className="text-[9px] text-[#6B7280]">{dueText}</span>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
