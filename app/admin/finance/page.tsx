import { PaymentStatus, Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { DollarSign, TrendingUp, Clock, AlertCircle, Percent } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';
import { KpiCard } from '@/components/ui';
import { FinanceClientBar } from './finance-client-bar';
import { FeeBulkList, type SerializedFeeItem } from './fee-bulk-list';

export const dynamic = 'force-dynamic';

type AdminFinancePageProps = {
  searchParams?: Promise<{ status?: string; classId?: string; search?: string; sort?: string; period?: string; from?: string; to?: string; month?: string }>;
};

function txnStatusBadge(status: PaymentStatus) {
  if (status === 'PAID') return 'bg-[#10B981] text-white';
  if (status === 'PARTIAL') return 'bg-[#D69E3F] text-white';
  return 'bg-[#D69E3F] text-white';
}

const kpiIcons = [DollarSign, TrendingUp, Clock, AlertCircle, Percent];

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function toIsoDateString(value: Date | string | null | undefined) {
  const date = value instanceof Date ? value : new Date(value ?? '');
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function deriveFeeStatus(params: {
  dueDate: Date;
  totalAmount: number;
  paidAmount: number;
}): PaymentStatus {
  const { totalAmount, paidAmount } = params;
  const remaining = Math.max(totalAmount - paidAmount, 0);
  if (remaining <= 0) return PaymentStatus.PAID;
  if (paidAmount > 0) return PaymentStatus.PARTIAL;
  return PaymentStatus.PENDING;
}

function isDatabaseConnectionError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'PrismaClientInitializationError' ||
      error.message.includes("Can't reach database server") ||
      error.message.includes('Timed out fetching a new connection') ||
      error.message.includes('Connection terminated unexpectedly'))
  );
}

type FinancePageData = {
  classes: Array<{ id: string; name: string; section: string }>;
  feeAgg: { _sum: { amount: Prisma.Decimal | null; discount: Prisma.Decimal | null } };
  paidAgg: { _sum: { amountPaid: Prisma.Decimal | null } };
  feePaidById: Record<string, number>;
  recentPayments: Array<{
    id: string;
    feeId: string;
    amountPaid: Prisma.Decimal;
    paidAt: Date;
    fee: {
      title: string;
      dueDate: Date;
      amount: Prisma.Decimal;
      discount: Prisma.Decimal;
      student: {
        user: { fullName: string };
      };
    };
  }>;
  dues: Array<{
    id: string;
    title: string;
    status: PaymentStatus;
    dueDate: Date;
    amount: Prisma.Decimal;
    discount: Prisma.Decimal;
    student: {
      id: string;
      emergencyContact: string | null;
      whatsApp: string | null;
      class: { name: string; section: string } | null;
      user: { fullName: string; phone: string | null };
    };
  }>;
};

const getCachedFinanceData = unstable_cache(
  async (selectedStatus: string, selectedClassId: string, selectedSort: string, selectedPeriod: string, selectedFrom: string, selectedTo: string, selectedMonth: string) => {
    const now = new Date();
    const rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    let rangeEnd: Date | null = null;
    if (selectedPeriod === 'mtd_1_8') {
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), 8, 23, 59, 59, 999);
    } else if (selectedPeriod === 'mtd_1_15') {
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59, 999);
    } else if (selectedPeriod === 'mtd_full') {
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const periodDueDateWhere: Prisma.DateTimeFilter | undefined = (() => {
      const hasCustomFrom = /^\d{4}-\d{2}-\d{2}$/.test(selectedFrom);
      const hasCustomTo = /^\d{4}-\d{2}-\d{2}$/.test(selectedTo);
      if (hasCustomFrom || hasCustomTo) {
        const customFrom = hasCustomFrom ? new Date(`${selectedFrom}T00:00:00.000`) : null;
        const customTo = hasCustomTo ? new Date(`${selectedTo}T23:59:59.999`) : null;
        return {
          ...(customFrom ? { gte: customFrom } : {}),
          ...(customTo ? { lte: customTo } : {})
        };
      }
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-').map(Number);
        if (!year || !month) return undefined;
        const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
        return { gte: monthStart, lte: monthEnd };
      }
      if (selectedPeriod === 'all') return undefined;
      return {
        gte: rangeStart,
        ...(rangeEnd ? { lte: rangeEnd } : {})
      };
    })();

    let feeStatusWhere: Prisma.FeeWhereInput = {};
    if (selectedStatus === 'paid') {
      feeStatusWhere = { status: PaymentStatus.PAID };
    } else if (selectedStatus === 'unpaid') {
      feeStatusWhere = { status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] } };
    } else if (selectedStatus === 'partial') {
      feeStatusWhere = { status: PaymentStatus.PARTIAL };
    }

    const classWhere = selectedClassId !== 'all' ? { student: { classId: selectedClassId } } : {};
    const combinedWhere = { ...feeStatusWhere, ...classWhere };
    let orderBy: Prisma.FeeOrderByWithRelationInput[] = [{ status: 'desc' }, { dueDate: 'asc' }];
    if (selectedSort === 'amount') {
      orderBy = [{ amount: 'desc' }];
    } else if (selectedSort === 'name') {
      orderBy = [{ student: { user: { fullName: 'asc' } } }];
    }

    const feeWhere: Prisma.FeeWhereInput = {
      ...combinedWhere,
      ...(periodDueDateWhere ? { dueDate: periodDueDateWhere } : {})
    };

    const paymentWhere: Prisma.PaymentWhereInput = {
      ...(selectedStatus === 'all' ? {} : { fee: feeStatusWhere }),
      ...(selectedClassId !== 'all' ? { fee: { ...(selectedStatus === 'all' ? {} : feeStatusWhere), student: { classId: selectedClassId } } } : {}),
      ...(periodDueDateWhere ? { paidAt: periodDueDateWhere } : {})
    };

    const [classes, feeAgg, paidAgg, recentPayments, dues] = await Promise.all([
      prisma.class.findMany({
        select: { id: true, name: true, section: true },
        orderBy: { name: 'asc' }
      }),
      prisma.fee.aggregate({ where: feeWhere, _sum: { amount: true, discount: true } }),
      prisma.payment.aggregate({ where: paymentWhere, _sum: { amountPaid: true } }),
      prisma.payment.findMany({
        where: paymentWhere,
        select: {
          id: true,
          feeId: true,
          amountPaid: true,
          paidAt: true,
          fee: {
            select: {
              title: true,
              dueDate: true,
              amount: true,
              discount: true,
              student: {
                select: {
                  user: { select: { fullName: true } }
                }
              }
            }
          }
        },
        orderBy: { paidAt: 'desc' },
        take: 10
      }),
      prisma.fee.findMany({
        where: feeWhere,
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          amount: true,
          discount: true,
          student: {
            select: {
              id: true,
              emergencyContact: true,
              whatsApp: true,
              class: { select: { name: true, section: true } },
              user: { select: { fullName: true, phone: true } }
            }
          }
        },
        orderBy,
        take: 40
      })
    ]);

    const feeIds = Array.from(new Set([...recentPayments.map((item) => item.feeId), ...dues.map((fee) => fee.id)]));
    const feePaidRows = feeIds.length
      ? await prisma.payment.groupBy({
          by: ['feeId'],
          where: { feeId: { in: feeIds } },
          _sum: { amountPaid: true }
        })
      : [];

    const feePaidById = new Map(
      feePaidRows.map((row) => [row.feeId, Number(row._sum.amountPaid ?? 0)])
    );

    return { classes, feeAgg, paidAgg, recentPayments, dues, feePaidById };
  },
  ['admin-finance-page'],
  { revalidate: 30 }
);

export default async function AdminFinancePage({ searchParams }: AdminFinancePageProps) {
  const params = (await searchParams) ?? {};
  const selectedStatus =
    ['paid', 'unpaid', 'partial'].includes(params.status as string)
      ? (params.status as string)
      : 'all';
  const selectedClassId = params.classId ?? 'all';
  const searchValue = params.search ?? '';
  const selectedSort = params.sort ?? 'dueDate';
  const selectedFrom = (params.from ?? '').trim();
  const selectedTo = (params.to ?? '').trim();
  const selectedMonth = /^\d{4}-\d{2}$/.test((params.month ?? '').trim()) ? (params.month ?? '').trim() : '';
  const selectedPeriod =
    ['all', 'mtd_1_8', 'mtd_1_15', 'mtd_full'].includes(params.period as string)
      ? (params.period as string)
      : 'all';
  let data: Awaited<ReturnType<typeof getCachedFinanceData>> | null = null;
  try {
    data = await getCachedFinanceData(selectedStatus, selectedClassId, selectedSort, selectedPeriod, selectedFrom, selectedTo, selectedMonth);
  } catch (error) {
    console.error('[admin/finance] load failed', error);
    if (!isDatabaseConnectionError(error)) throw error;
  }

  if (!data) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
        <h1 className="font-headline text-2xl font-bold text-[#1a1c1c]">Finance</h1>
        <h2 className="mt-3 text-lg font-bold text-[#111827]">Database Unreachable</h2>
        <p className="mt-2 text-sm text-[#6b7280]">
          Finance data is temporarily unavailable. Please refresh once the connection recovers.
        </p>
      </div>
    );
  }

  const { classes, feeAgg, paidAgg, recentPayments, dues, feePaidById } = data;
  const feePaidTotals = new Map<string, number>(Object.entries(feePaidById ?? {}));
  const totalBilled = Number(feeAgg._sum.amount ?? 0) - Number(feeAgg._sum.discount ?? 0);
  const totalPaid = Number(paidAgg._sum.amountPaid ?? 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  // Serialize dues and calculate outstanding + overdue amounts
  let outstandingAmount = 0;
  let dueAmount = 0;

  let serializedDues: SerializedFeeItem[] = dues.map(fee => {
    const paidAmount = Number(feePaidTotals.get(fee.id) ?? 0);
    const total = Number(fee.amount) - Number(fee.discount);
    const remaining = Math.max(total - paidAmount, 0);
    const computedStatus = deriveFeeStatus({
      dueDate: fee.dueDate,
      totalAmount: total,
      paidAmount
    });

    if (computedStatus !== PaymentStatus.PAID) {
      outstandingAmount += remaining;
    }
    if (computedStatus !== PaymentStatus.PAID) dueAmount += remaining;

    return {
      id: fee.id,
      title: fee.title,
      status: computedStatus,
      dueDate: toIsoDateString(fee.dueDate),
      studentName: fee.student.user.fullName,
      studentId: fee.student.id,
      classLabel: fee.student.class ? `${fee.student.class.name} - ${fee.student.class.section}` : 'Unassigned',
      amount: Number(fee.amount),
      discount: Number(fee.discount),
      paidAmount,
      remaining,
      whatsApp: fee.student.user.phone ?? null,
      guardianPhone: fee.student.emergencyContact ?? null
    };
  });

  // Apply client-side search filtering
  if (searchValue) {
    serializedDues = serializedDues.filter(fee =>
      fee.studentName.toLowerCase().includes(searchValue.toLowerCase())
    );
  }

  const dueCount = serializedDues.filter((fee) => fee.status !== PaymentStatus.PAID).length;

  const kpis = [
    { label: 'Total Billed',     value: formatCurrency(totalBilled) },
    { label: 'Total Collected',  value: formatCurrency(totalPaid) },
    { label: 'Due',              value: formatCurrency(dueAmount) },
    { label: 'Due Records',      value: String(dueCount) },
    { label: 'Collection Rate',  value: `${collectionRate}%` }
  ];
  const recentPaymentRows = recentPayments.map((item) => {
    const total = Number(item.fee.amount) - Number(item.fee.discount);
    const paidAmount = Number(feePaidTotals.get(item.feeId) ?? 0);
    return {
      ...item,
      computedStatus: deriveFeeStatus({
        dueDate: item.fee.dueDate,
        totalAmount: total,
        paidAmount
      })
    };
  });

  const currentMonthEnd = getMonthEnd(new Date());
  const summaryByStudent = new Map<string, { dueMonthCount: number; advanceMonthCount: number }>();
  for (const fee of serializedDues) {
    const summary = summaryByStudent.get(fee.studentId) ?? { dueMonthCount: 0, advanceMonthCount: 0 };
    const dueDate = new Date(fee.dueDate);
    if (fee.status !== PaymentStatus.PAID && dueDate <= currentMonthEnd) {
      summary.dueMonthCount += 1;
    }
    if (fee.status === PaymentStatus.PAID && dueDate > currentMonthEnd) {
      summary.advanceMonthCount += 1;
    }
    summaryByStudent.set(fee.studentId, summary);
  }
  serializedDues = serializedDues.map((fee) => ({
    ...fee,
    ...(summaryByStudent.get(fee.studentId) ?? {})
  }));

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Admin</p>
          <h1 className="font-headline mt-0.5 text-2xl font-extrabold text-[#1a1c1c] sm:text-3xl">Finance</h1>
          <p className="mt-1 text-sm text-[#6f7979]">Track fee collection, outstanding amounts, and transaction health.</p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map(({ label, value }, i) => {
          const Icon = kpiIcons[i];
          const variants: ('primary' | 'accent' | 'success' | 'danger')[] = ['primary', 'success', 'accent', 'danger', 'primary'];
          return (
            <KpiCard
              key={label}
              variant={variants[i] || 'primary'}
              icon={<Icon size={20} />}
              label={label}
              value={value}
            />
          );
        })}
      </div>

      {/* ── Filter Bar (Full Width) ── */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <FinanceClientBar
          classes={classes}
          selectedClassId={selectedClassId}
          selectedStatus={selectedStatus}
          selectedSort={selectedSort}
          selectedPeriod={selectedPeriod}
          selectedMonth={selectedMonth}
          selectedFrom={selectedFrom}
          selectedTo={selectedTo}
          searchValue={searchValue}
        />
      </div>

      {/* ── Content: Fee Records + Transactions ── */}
      <div className="space-y-5">

        {/* Fee Records — PRIMARY */}
        <FeeBulkList
          fees={serializedDues}
          overdueCount={dueCount}
          selectedFeeStatus={selectedStatus}
        />

        {/* Recent Transactions — SECONDARY */}
        <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
          <h3 className="font-headline mb-4 text-lg font-bold text-[#1a1c1c]">Recent Transactions</h3>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {recentPaymentRows.map(item => (
              <div key={item.id} className="rounded-xl bg-[#f5f7fa] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1a1c1c] text-sm">{item.fee.student.user.fullName}</p>
                    <p className="mt-0.5 truncate text-xs text-[#6f7979]">{item.fee.title}</p>
                    <p className="mt-1 text-xs text-[#6f7979]">{toIsoDateString(item.paidAt).slice(0, 10)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-[#1a1c1c] text-sm">{formatCurrency(Number(item.amountPaid))}</p>
                    <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${txnStatusBadge(item.computedStatus)}`}>
                      {item.computedStatus === PaymentStatus.PENDING ? 'DUE' : item.computedStatus}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {recentPaymentRows.length === 0 ? <p className="text-xs text-[#6f7979]">No transactions yet.</p> : null}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-xs">
              <thead>
                <tr className="rounded-xl bg-[#f3f4f5]">
                  <th className="rounded-l-xl px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest text-[#6f7979]">Date</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest text-[#6f7979]">Student</th>
                  <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-widest text-[#6f7979]">Amount</th>
                  <th className="rounded-r-xl px-3 py-2 text-right text-[9px] font-bold uppercase tracking-widest text-[#6f7979]">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPaymentRows.map(item => (
                  <tr
                    key={item.id}
                    className="border-b border-[#f0f2f0] transition-colors last:border-0 hover:bg-[#f9fafb]"
                  >
                    <td className="px-3 py-2.5">
                      <span className="rounded-full bg-[#edeeef] px-2 py-0.5 text-xs text-[#6f7979]">
                        {toIsoDateString(item.paidAt).slice(0, 10)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-[#1a1c1c] truncate">{item.fee.student.user.fullName}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-[#1a1c1c]">{formatCurrency(Number(item.amountPaid))}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${txnStatusBadge(item.computedStatus)}`}>
                        {item.computedStatus === PaymentStatus.PENDING ? 'DUE' : item.computedStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentPaymentRows.length === 0 ? <p className="mt-4 text-xs text-[#6f7979]">No transactions yet.</p> : null}
          </div>
        </div>
      </div>

    </div>
  );
}
