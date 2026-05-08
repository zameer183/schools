import { PaymentStatus, Prisma } from '@prisma/client';
import { DollarSign, TrendingUp, Clock, AlertCircle, Percent } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';
import { KpiCard } from '@/components/ui';
import { FinanceClientBar } from './finance-client-bar';
import { FeeBulkList, type SerializedFeeItem } from './fee-bulk-list';
import FeeMessagingClient, { type SerializedFeeRow } from './fee-messaging-client';

export const dynamic = 'force-dynamic';

type AdminFinancePageProps = {
  searchParams?: Promise<{ status?: string; classId?: string; search?: string; sort?: string }>;
};

function txnStatusBadge(status: PaymentStatus) {
  if (status === 'PAID') return 'bg-[#10B981] text-white';
  if (status === 'OVERDUE') return 'bg-[#EF4444] text-white';
  if (status === 'PARTIAL') return 'bg-[#D69E3F] text-white';
  return 'bg-[#D69E3F] text-white';
}

const kpiIcons = [DollarSign, TrendingUp, Clock, AlertCircle, Percent];

export default async function AdminFinancePage({ searchParams }: AdminFinancePageProps) {
  const params = (await searchParams) ?? {};
  const selectedStatus =
    ['paid', 'unpaid', 'partial', 'overdue'].includes(params.status as string)
      ? (params.status as string)
      : 'all';
  const selectedClassId = params.classId ?? 'all';
  const searchValue = params.search ?? '';
  const selectedSort = params.sort ?? 'dueDate';

  // Determine fee status where clause
  let feeStatusWhere: Prisma.FeeWhereInput = {};
  if (selectedStatus === 'paid') {
    feeStatusWhere = { status: PaymentStatus.PAID };
  } else if (selectedStatus === 'unpaid') {
    feeStatusWhere = { status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] } };
  } else if (selectedStatus === 'partial') {
    feeStatusWhere = { status: PaymentStatus.PARTIAL };
  } else if (selectedStatus === 'overdue') {
    feeStatusWhere = { status: PaymentStatus.OVERDUE };
  }

  const classWhere =
    selectedClassId !== 'all' ? { student: { classId: selectedClassId } } : {};

  const combinedWhere = { ...feeStatusWhere, ...classWhere };

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Determine order by clause
  let orderBy: Prisma.FeeOrderByWithRelationInput[] = [{ status: 'desc' }, { dueDate: 'asc' }];
  if (selectedSort === 'amount') {
    orderBy = [{ amount: 'desc' }];
  } else if (selectedSort === 'name') {
    orderBy = [{ student: { user: { fullName: 'asc' } } }];
  }

  const [
    classes,
    feeAgg,
    paidAgg,
    pendingCount,
    overdueCount,
    recentPayments,
    dues,
    studentsForMessaging
  ] = await Promise.all([
    prisma.class.findMany({
      select: { id: true, name: true, section: true },
      orderBy: { name: 'asc' }
    }),
    prisma.fee.aggregate({ where: feeStatusWhere, _sum: { amount: true, discount: true } }),
    prisma.payment.aggregate({
      where: selectedStatus === 'all' ? {} : { fee: feeStatusWhere },
      _sum: { amountPaid: true }
    }),
    prisma.fee.count({ where: { ...feeStatusWhere, status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] } } }),
    prisma.fee.count({ where: { ...combinedWhere, status: PaymentStatus.OVERDUE } }),
    prisma.payment.findMany({
      where: selectedClassId !== 'all'
        ? { fee: { student: { classId: selectedClassId } } }
        : selectedStatus === 'all' ? {} : { fee: feeStatusWhere },
      include: {
        fee: { include: { student: { include: { user: { select: { fullName: true } } } } } }
      },
      orderBy: { paidAt: 'desc' },
      take: 10
    }),
    prisma.fee.findMany({
      where: combinedWhere,
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
            user: { select: { fullName: true, phone: true } }
          }
        },
        payments: { select: { amountPaid: true } }
      },
      orderBy,
      take: 50
    }),
    prisma.student.findMany({
      where: { fees: { some: {} } },
      select: {
        id: true,
        classId: true,
        whatsApp: true,
        guardianPhone: true,
        schoolName: true,
        user: { select: { fullName: true } },
        class: { select: { id: true, name: true, section: true } },
        fees: {
          select: {
            amount: true,
            discount: true,
            status: true,
            dueDate: true,
            payments: { select: { amountPaid: true } }
          },
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    })
  ]);

  const totalBilled = Number(feeAgg._sum.amount ?? 0) - Number(feeAgg._sum.discount ?? 0);
  const totalPaid = Number(paidAgg._sum.amountPaid ?? 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  // Serialize dues and calculate outstanding + overdue amounts
  let outstandingAmount = 0;
  let overdueAmount = 0;

  let serializedDues: SerializedFeeItem[] = dues.map(fee => {
    const paidAmount = fee.payments.reduce((s, p) => s + Number(p.amountPaid), 0);
    const total = Number(fee.amount) - Number(fee.discount);
    const remaining = Math.max(total - paidAmount, 0);

    if (fee.status !== PaymentStatus.PAID) {
      outstandingAmount += remaining;
    }
    if (fee.status === PaymentStatus.OVERDUE) {
      overdueAmount += remaining;
    }

    return {
      id: fee.id,
      title: fee.title,
      status: fee.status,
      dueDate: fee.dueDate.toISOString(),
      studentName: fee.student.user.fullName,
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

  // Serialize students for Fee Messaging
  const feeMessagingRows: SerializedFeeRow[] = studentsForMessaging.map(student => {
    const latestFee = student.fees[0];
    if (!latestFee) {
      return {
        studentId: student.id,
        studentName: student.user.fullName,
        classId: student.classId || '',
        classLabel: student.class ? `${student.class.name} - ${student.class.section}` : 'Unassigned',
        feeStatus: 'UNPAID' as const,
        amount: 0,
        remaining: 0,
        dueDate: null,
        month: '',
        schoolName: student.schoolName?.trim() || 'Manarah Institute',
        whatsApp: student.whatsApp
      };
    }

    const amount = Number(latestFee.amount) - Number(latestFee.discount);
    const paidAmount = latestFee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
    const remaining = Math.max(amount - paidAmount, 0);

    let feeStatus: 'PAID' | 'UNPAID' | 'PARTIAL' | 'OVERDUE' = 'UNPAID';
    if (latestFee.status === PaymentStatus.PAID) {
      feeStatus = 'PAID';
    } else if (latestFee.status === PaymentStatus.PARTIAL) {
      feeStatus = 'PARTIAL';
    } else if (latestFee.status === PaymentStatus.OVERDUE) {
      feeStatus = 'OVERDUE';
    }

    const dueDate = latestFee.dueDate.toISOString();
    const month = latestFee.dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return {
      studentId: student.id,
      studentName: student.user.fullName,
      classId: student.classId || '',
      classLabel: student.class ? `${student.class.name} - ${student.class.section}` : 'Unassigned',
      feeStatus,
      amount,
      remaining,
      dueDate,
      month,
      schoolName: student.schoolName?.trim() || 'Manarah Institute',
      whatsApp: student.whatsApp
    };
  });

  const kpis = [
    { label: 'Total Billed',     value: formatCurrency(totalBilled) },
    { label: 'Total Collected',  value: formatCurrency(totalPaid) },
    { label: 'Outstanding',      value: formatCurrency(outstandingAmount) },
    { label: 'Overdue',          value: formatCurrency(overdueAmount) },
    { label: 'Collection Rate',  value: `${collectionRate}%` }
  ];

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
          searchValue={searchValue}
        />
      </div>

      {/* ── Content: Fee List (Left/Primary) + Transactions (Right/Secondary) ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">

        {/* Fee Records — PRIMARY */}
        <FeeBulkList
          fees={serializedDues}
          overdueCount={overdueCount}
          selectedFeeStatus={selectedStatus}
        />

        {/* Recent Transactions — SECONDARY */}
        <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
          <h3 className="font-headline mb-4 text-lg font-bold text-[#1a1c1c]">Recent Transactions</h3>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {recentPayments.map(item => (
              <div key={item.id} className="rounded-xl bg-[#f5f7fa] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1a1c1c] text-sm">{item.fee.student.user.fullName}</p>
                    <p className="mt-0.5 truncate text-xs text-[#6f7979]">{item.fee.title}</p>
                    <p className="mt-1 text-xs text-[#6f7979]">{item.paidAt.toISOString().slice(0, 10)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-[#1a1c1c] text-sm">{formatCurrency(Number(item.amountPaid))}</p>
                    <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${txnStatusBadge(item.fee.status)}`}>
                      {item.fee.status === PaymentStatus.PENDING ? 'DUE' : item.fee.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {recentPayments.length === 0 ? <p className="text-xs text-[#6f7979]">No transactions yet.</p> : null}
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
                {recentPayments.map(item => (
                  <tr
                    key={item.id}
                    className="border-b border-[#f0f2f0] transition-colors last:border-0 hover:bg-[#f9fafb]"
                  >
                    <td className="px-3 py-2.5">
                      <span className="rounded-full bg-[#edeeef] px-2 py-0.5 text-xs text-[#6f7979]">
                        {item.paidAt.toISOString().slice(0, 10)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-[#1a1c1c] truncate">{item.fee.student.user.fullName}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-[#1a1c1c]">{formatCurrency(Number(item.amountPaid))}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${txnStatusBadge(item.fee.status)}`}>
                        {item.fee.status === PaymentStatus.PENDING ? 'DUE' : item.fee.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentPayments.length === 0 ? <p className="mt-4 text-xs text-[#6f7979]">No transactions yet.</p> : null}
          </div>
        </div>
      </div>

      {/* ── Fee Messaging ── */}
      <FeeMessagingClient rows={feeMessagingRows} classes={classes} />
    </div>
  );
}
