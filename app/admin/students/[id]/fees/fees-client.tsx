'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronLeft, Download, DollarSign, MessageCircle, Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

function formatDate(v: string): string {
  try {
    return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

function getStatusColor(status: string): { bg: string; text: string; borderColor: string } {
  const map: Record<string, { bg: string; text: string; borderColor: string }> = {
    PAID: { bg: 'bg-[#dcfce7]', text: 'text-[#15803d]', borderColor: 'border-l-[#27ae60]' },
    PENDING: { bg: 'bg-[#fef3c7]', text: 'text-[#b45309]', borderColor: 'border-l-[#f39c12]' },
    PARTIAL: { bg: 'bg-[#eff6ff]', text: 'text-[#1d4ed8]', borderColor: 'border-l-[#3498db]' },
    OVERDUE: { bg: 'bg-[#fef2f2]', text: 'text-[#b91c1c]', borderColor: 'border-l-[#e74c3c]' }
  };
  return map[status.toUpperCase()] || { bg: 'bg-[#f0f2f5]', text: 'text-[#6b7280]', borderColor: 'border-l-[#9ca3af]' };
}

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

  const handleMarkPaid = async (feeId: string) => {
    setMarkingPaid(feeId);
    try {
      const res = await fetch('/api/fees/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [feeId], status: 'PAID' })
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setMarkingPaid(null);
    }
  };

  const getWhatsAppUrl = (fee: FeeRecord): string | null => {
    const phone = (student.whatsApp || student.guardianPhone || '').replace(/[^0-9+]/g, '');
    if (!phone) return null;
    const netAmount = fee.amount - fee.discount;
    const paid = fee.payments.reduce((s, p) => s + p.amountPaid, 0);
    const remaining = Math.max(netAmount - paid, 0);
    const msg = `Reminder: ${fee.title} of ${formatCurrency(remaining)} is due by ${formatDate(fee.dueDate)}. Please pay promptly.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const handleExportCSV = () => {
    const headers = ['Student', 'Title', 'Due Date', 'Status', 'Amount', 'Paid', 'Remaining'];
    const rows = fees.map((f) => {
      const netAmount = f.amount - f.discount;
      const paid = f.payments.reduce((s, p) => s + p.amountPaid, 0);
      const remaining = Math.max(netAmount - paid, 0);
      return [
        student.user.fullName,
        f.title,
        formatDate(f.dueDate),
        f.status,
        netAmount.toFixed(2),
        paid.toFixed(2),
        remaining.toFixed(2)
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fees-${student.user.fullName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#f8fafb] p-4">
      <div className="mx-auto max-w-4xl space-y-4">

        {/* Back Link */}
        <Link href={`/admin/students/${student.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#004649] hover:text-[#1b5e62] transition">
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

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-[#f8fafc] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Total Assigned</p>
            <p className="mt-1.5 text-lg font-bold text-[#111827]">{formatCurrency(totalAssigned)}</p>
          </div>
          <div className="rounded-xl bg-[#f0fdf4] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Paid</p>
            <p className="mt-1.5 text-lg font-bold text-[#15803d]">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="rounded-xl bg-[#fef9f0] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Remaining</p>
            <p className="mt-1.5 text-lg font-bold text-[#b45309]">{formatCurrency(totalRemaining)}</p>
          </div>
          <div className="rounded-xl bg-[#fef2f2] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Overdue</p>
            <p className="mt-1.5 text-lg font-bold text-[#b91c1c]">{formatCurrency(totalOverdue)}</p>
          </div>
        </div>

        {/* Fee Ledger */}
        <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Header */}
          <div className="border-b border-[#f1f5f9] px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-[#111827]">Fee Ledger</h2>
            <button
              onClick={handleExportCSV}
              className="h-10 flex items-center justify-center gap-1.5 rounded-lg bg-[#f0f2f5] text-[#2c3e50] text-xs font-semibold hover:bg-[#e2e8e8] transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-0 divide-y divide-[#f1f5f9]">
            {fees.length === 0 ? (
              <div className="p-5 text-center text-sm text-[#6b7280]">No fees found.</div>
            ) : (
              fees.map((f) => {
                const netAmount = f.amount - f.discount;
                const paid = f.payments.reduce((s, p) => s + p.amountPaid, 0);
                const remaining = Math.max(netAmount - paid, 0);
                const waUrl = getWhatsAppUrl(f);
                const colors = getStatusColor(f.status);

                return (
                  <div key={f.id} className={`${colors.borderColor} border-l-4 p-4 space-y-2`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#111827]">{f.title}</p>
                        <p className="text-xs text-[#6b7280]">Due: {formatDate(f.dueDate)}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap ${colors.bg} ${colors.text}`}>
                        {f.status}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <div className="flex-1">
                        <p className="text-[#6b7280]">Amount</p>
                        <p className="font-semibold text-[#111827]">{formatCurrency(netAmount)}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[#6b7280]">Paid</p>
                        <p className="font-semibold text-[#15803d]">{formatCurrency(paid)}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[#6b7280]">Remaining</p>
                        <p className="font-semibold text-[#b45309]">{formatCurrency(remaining)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleMarkPaid(f.id)}
                        disabled={f.status === 'PAID' || markingPaid === f.id}
                        className={`h-11 flex-1 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition ${
                          f.status === 'PAID'
                            ? 'bg-[#f0f2f5] text-[#9ca3af] cursor-not-allowed'
                            : 'bg-[#004649] text-white hover:bg-[#1b5e62]'
                        }`}
                      >
                        {markingPaid === f.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Mark Paid</span>
                          </>
                        )}
                      </button>
                      <a
                        href={waUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => !waUrl && e.preventDefault()}
                        className={`h-11 flex-1 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition ${
                          waUrl
                            ? 'bg-[#25d366] text-white hover:scale-105 active:scale-[0.98]'
                            : 'bg-[#f0f2f5] text-[#9ca3af] cursor-not-allowed opacity-60'
                        }`}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-[#fafafa]">
                  <th className="rounded-l-xl px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Title</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Due Date</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Amount</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Paid</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Remaining</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Status</th>
                  <th className="rounded-r-xl px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f8fafc]">
                {fees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#6b7280]">
                      No fees found.
                    </td>
                  </tr>
                ) : (
                  fees.map((f) => {
                    const netAmount = f.amount - f.discount;
                    const paid = f.payments.reduce((s, p) => s + p.amountPaid, 0);
                    const remaining = Math.max(netAmount - paid, 0);
                    const waUrl = getWhatsAppUrl(f);
                    const colors = getStatusColor(f.status);

                    return (
                      <tr key={f.id} className="hover:bg-[#fafafa]">
                        <td className="px-4 py-3 text-sm font-medium text-[#111827]">{f.title}</td>
                        <td className="px-4 py-3 text-sm text-[#6b7280]">{formatDate(f.dueDate)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-[#111827]">{formatCurrency(netAmount)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-[#15803d]">{formatCurrency(paid)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-[#b45309]">{formatCurrency(remaining)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${colors.bg} ${colors.text}`}>
                            {f.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 flex gap-1.5">
                          <button
                            onClick={() => handleMarkPaid(f.id)}
                            disabled={f.status === 'PAID' || markingPaid === f.id}
                            className={`h-9 flex items-center justify-center px-2.5 rounded-lg text-xs font-semibold transition ${
                              f.status === 'PAID'
                                ? 'bg-[#f0f2f5] text-[#9ca3af] cursor-not-allowed'
                                : 'bg-[#004649] text-white hover:bg-[#1b5e62]'
                            }`}
                          >
                            {markingPaid === f.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <a
                            href={waUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => !waUrl && e.preventDefault()}
                            className={`h-9 flex items-center justify-center px-2.5 rounded-lg text-xs font-semibold transition ${
                              waUrl
                                ? 'bg-[#25d366] text-white hover:scale-105 active:scale-[0.98]'
                                : 'bg-[#f0f2f5] text-[#9ca3af] cursor-not-allowed opacity-60'
                            }`}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
