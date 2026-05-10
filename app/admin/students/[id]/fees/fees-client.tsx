'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Download,
  Share2,
  Check,
  Loader2,
  DollarSign
} from 'lucide-react';

type FeeRecord = {
  id: string;
  title: string;
  dueDate: string;
  amount: number;
  discount: number;
  status: string;
  payments: { amountPaid: number }[];
};

type StudentData = {
  id: string;
  admissionNo: string;
  whatsApp: string | null;
  guardianPhone: string | null;
  user: { fullName: string; isActive: boolean };
  class: { name: string; section: string } | null;
};

type Props = {
  student: StudentData;
  fees: FeeRecord[];
  totalAssigned: number;
  totalPaid: number;
  totalRemaining: number;
  totalOverdue: number;
};

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

function fmtDate(v: string): string {
  try {
    return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

const STATUS_STYLE: Record<string, { badge: string; bar: string }> = {
  PAID:    { badge: 'bg-[#dcfce7] text-[#15803d]',  bar: 'bg-[#22c55e]' },
  PENDING: { badge: 'bg-[#fef3c7] text-[#b45309]',  bar: 'bg-[#f59e0b]' },
  PARTIAL: { badge: 'bg-[#eff6ff] text-[#1d4ed8]',  bar: 'bg-[#3b82f6]' },
  OVERDUE: { badge: 'bg-[#fee2e2] text-[#b91c1c]',  bar: 'bg-[#ef4444]' },
};

export default function StudentFeesClient({
  student,
  fees,
  totalAssigned,
  totalPaid,
  totalRemaining,
  totalOverdue
}: Props) {
  const router = useRouter();
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  const classInfo = student.class ? `${student.class.name} ${student.class.section || ''}` : 'N/A';
  const waPhone = (student.whatsApp || student.guardianPhone || '').replace(/[^0-9+]/g, '');

  const handleMarkPaid = async (feeId: string) => {
    setMarkingPaid(feeId);
    try {
      const res = await fetch('/api/fees/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [feeId], status: 'PAID' })
      });
      if (res.ok) router.refresh();
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleDownload = () => {
    const header = [
      `Student: ${student.user.fullName}`,
      `Admission No: ${student.admissionNo}`,
      `Class: ${classInfo}`,
      `Total Assigned: ${fmtCurrency(totalAssigned)}`,
      `Total Paid: ${fmtCurrency(totalPaid)}`,
      `Remaining: ${fmtCurrency(totalRemaining)}`,
      `Overdue: ${fmtCurrency(totalOverdue)}`,
      ''
    ].join('\n');

    const rows = [
      ['Title', 'Due Date', 'Status', 'Amount', 'Paid', 'Remaining'],
      ...fees.map((f) => {
        const net = f.amount - f.discount;
        const paid = f.payments.reduce((s, p) => s + p.amountPaid, 0);
        return [f.title, fmtDate(f.dueDate), f.status, net.toFixed(2), paid.toFixed(2), Math.max(net - paid, 0).toFixed(2)];
      })
    ];

    const csv = header + rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fees_${student.user.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareSummary = () => {
    if (!waPhone) return;
    const msg = `Fee Summary — ${student.user.fullName}\n\nAssigned: ${fmtCurrency(totalAssigned)}\nPaid: ${fmtCurrency(totalPaid)}\nRemaining: ${fmtCurrency(totalRemaining)}\nOverdue: ${fmtCurrency(totalOverdue)}`;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f8fafb] p-4">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Back Link */}
        <Link
          href={`/admin/students/${student.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#004649] hover:text-[#1b5e62] transition"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Profile
        </Link>

        {/* Hero Card */}
        <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#dcfce7] to-[#bbf7d0] text-lg font-bold text-[#15803d] ring-4 ring-[#f0fdf4]">
              {initials(student.user.fullName)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#111827]">{student.user.fullName}</h1>
                {student.user.isActive ? (
                  <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[9px] font-bold uppercase text-[#15803d]">Active</span>
                ) : (
                  <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[9px] font-bold uppercase text-[#b91c1c]">Inactive</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-[#6b7280]">
                {classInfo} • Admission: <span className="font-semibold text-[#374151]">{student.admissionNo}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#f8fafc] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Total Assigned</p>
            <p className="mt-1.5 text-2xl font-bold text-[#111827]">{fmtCurrency(totalAssigned)}</p>
          </div>
          <div className="rounded-xl bg-[#f0fdf4] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Paid</p>
            <p className="mt-1.5 text-2xl font-bold text-[#15803d]">{fmtCurrency(totalPaid)}</p>
          </div>
          <div className="rounded-xl bg-[#fef9f0] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Remaining</p>
            <p className="mt-1.5 text-2xl font-bold text-[#b45309]">{fmtCurrency(totalRemaining)}</p>
          </div>
          <div className="rounded-xl bg-[#fef2f2] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Overdue</p>
            <p className="mt-1.5 text-2xl font-bold text-[#b91c1c]">{fmtCurrency(totalOverdue)}</p>
          </div>
        </div>

        {/* Fee Cards */}
        <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)]">
          <div className="border-b border-[#f1f5f9] px-5 py-4">
            <h2 className="font-semibold text-[#111827]">Fee Ledger</h2>
          </div>

          {fees.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <DollarSign className="h-10 w-10 text-[#d1d5db]" />
              <p className="text-sm text-[#9ca3af]">No fees assigned yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f1f5f9]">
              {fees.map((f) => {
                const net = f.amount - f.discount;
                const paid = f.payments.reduce((s, p) => s + p.amountPaid, 0);
                const remaining = Math.max(net - paid, 0);
                const paidPct = net > 0 ? Math.min(Math.round((paid / net) * 100), 100) : 100;
                const style = STATUS_STYLE[f.status.toUpperCase()] ?? { badge: 'bg-[#f1f5f9] text-[#6b7280]', bar: 'bg-[#9ca3af]' };

                return (
                  <div key={f.id} className="p-4 space-y-3">
                    {/* Title + status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">{f.title}</p>
                        <p className="mt-0.5 text-xs text-[#6b7280]">Due: {fmtDate(f.dueDate)}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap ${style.badge}`}>
                        {f.status}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 w-full rounded-full bg-[#f1f5f9] overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${style.bar}`} style={{ width: `${paidPct}%` }} />
                    </div>

                    {/* Amounts */}
                    <div className="flex gap-4 text-xs">
                      <div>
                        <p className="text-[#9ca3af]">Amount</p>
                        <p className="font-semibold text-[#111827]">{fmtCurrency(net)}</p>
                      </div>
                      <div>
                        <p className="text-[#9ca3af]">Paid</p>
                        <p className="font-semibold text-[#15803d]">{fmtCurrency(paid)}</p>
                      </div>
                      <div>
                        <p className="text-[#9ca3af]">Remaining</p>
                        <p className="font-semibold text-[#b45309]">{fmtCurrency(remaining)}</p>
                      </div>
                    </div>

                    {/* Mark paid button */}
                    {f.status !== 'PAID' && (
                      <button
                        onClick={() => handleMarkPaid(f.id)}
                        disabled={markingPaid === f.id}
                        className="h-9 w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#004649] text-white text-xs font-semibold hover:bg-[#1b5e62] transition disabled:opacity-60"
                      >
                        {markingPaid === f.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Mark as Paid
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="h-11 flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#004649] text-white font-semibold hover:bg-[#1b5e62] transition"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </button>
          <button
            onClick={handleShareSummary}
            disabled={!waPhone}
            className={`h-11 flex flex-1 items-center justify-center gap-2 rounded-xl font-semibold transition ${
              waPhone
                ? 'bg-[#25d366] text-white hover:scale-105 active:scale-[0.98]'
                : 'bg-[#f0f2f5] text-[#6f7979] cursor-not-allowed opacity-60'
            }`}
          >
            <Share2 className="h-4 w-4" />
            WhatsApp
          </button>
        </div>

      </div>
    </div>
  );
}
