'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, MessageCircle, Download } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { FinanceToast } from './finance-toast';

export type SerializedFeeItem = {
  id: string;
  title: string;
  status: string;
  dueDate: string;
  studentName: string;
  amount: number;
  discount: number;
  paidAmount: number;
  remaining: number;
  whatsApp: string | null;
  guardianPhone: string | null;
};

function statusBadge(status: string) {
  if (status === 'PAID')    return 'bg-[#27ae60] text-white';
  if (status === 'OVERDUE') return 'bg-[#e74c3c] text-white';
  if (status === 'PARTIAL') return 'bg-[#e67e22] text-white';
  return 'bg-[#f39c12] text-white';
}

function statusAccent(status: string) {
  if (status === 'PAID')    return 'border-l-[#27ae60]';
  if (status === 'OVERDUE') return 'border-l-[#e74c3c]';
  if (status === 'PARTIAL') return 'border-l-[#e67e22]';
  return 'border-l-[#f39c12]';
}

function statusLabel(status: string) {
  if (status === 'PENDING') return 'DUE';
  return status;
}

function getWhatsAppUrl(fee: SerializedFeeItem): string | null {
  const phone = (fee.whatsApp ?? fee.guardianPhone ?? '').replace(/[^0-9+]/g, '');
  if (!phone) return null;
  const msg = `Reminder: ${fee.title} of ${formatCurrency(fee.remaining)} is due by ${fee.dueDate.slice(0, 10)}. Please pay promptly.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

export function FeeBulkList({
  fees,
  overdueCount,
  selectedFeeStatus
}: {
  fees: SerializedFeeItem[];
  overdueCount: number;
  selectedFeeStatus: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const allSelected  = fees.length > 0 && selected.size === fees.length;
  const someSelected = selected.size > 0 && selected.size < fees.length;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(fees.map(f => f.id)));

  const bulkUpdate = async (status: 'PAID' | 'PENDING') => {
    if (selected.size === 0) return;
    setLoading(true);
    const res = await fetch('/api/fees/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected), status })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const label = status === 'PAID' ? 'paid' : 'unpaid (DUE)';
      setToast({ message: `${data.updated} fee(s) marked as ${label}.`, type: 'success' });
      setSelected(new Set());
      router.refresh();
    } else {
      setToast({ message: data.error ?? 'Failed. Try again.', type: 'error' });
    }
    setLoading(false);
  };

  const markOnePaid = async (feeId: string) => {
    setLoadingIds(prev => new Set(prev).add(feeId));
    const res = await fetch('/api/fees/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [feeId], status: 'PAID' })
    });
    if (res.ok) {
      setToast({ message: 'Fee marked as paid.', type: 'success' });
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setToast({ message: data.error ?? 'Failed. Try again.', type: 'error' });
    }
    setLoadingIds(prev => { const n = new Set(prev); n.delete(feeId); return n; });
  };

  const exportCSV = () => {
    if (selected.size === 0) return;
    const rows = fees.filter(f => selected.has(f.id));
    const header = 'Student,Fee Type,Due Date,Status,Amount,Paid,Remaining';
    const csvRows = rows.map(f =>
      `"${f.studentName}","${f.title}",${f.dueDate.slice(0, 10)},${f.status},${f.amount},${f.paidAmount},${f.remaining}`
    );
    const csv = [header, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fees-export-${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  const title =
    selectedFeeStatus === 'paid'   ? 'Paid Fee Records'   :
    selectedFeeStatus === 'unpaid' ? 'Unpaid Fee Records' :
    'Fee Records';

  return (
    <>
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-headline text-lg font-bold text-[#1a1c1c]">{title}</h3>
        </div>

        {fees.length > 0 ? (
          <>
            {/* Overdue Alert */}
            {overdueCount > 0 ? (
              <div className="mb-4 rounded-xl bg-[#fef2f2] border border-[#fca5a5] px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-[#b91c1c]" />
                  <p className="text-sm font-semibold text-[#b91c1c]">{overdueCount} overdue fee(s)</p>
                </div>
                <Link href="/admin/finance/reminders">
                  <button className="rounded-xl bg-[#b91c1c] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#a01717] active:scale-[0.98] transition-all">
                    Send Reminder to All
                  </button>
                </Link>
              </div>
            ) : null}

            {/* Select-all bar */}
            <div className="mb-3 flex flex-col items-start justify-between gap-2 rounded-xl bg-[#f5f7fa] px-4 py-2.5 sm:flex-row sm:items-center">
              <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-[#3d4a4a] select-none">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer accent-[#004649]"
                />
                {selected.size > 0 ? `Selected (${selected.size})` : `Select all (${fees.length})`}
              </label>

              {selected.size > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => bulkUpdate('PAID')}
                    disabled={loading}
                    className="h-11 flex items-center gap-1 rounded-xl bg-[#27ae60] px-3 text-xs font-bold text-white hover:bg-[#229954] active:scale-[0.98] disabled:opacity-60 transition-all"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark Paid
                  </button>
                  <button
                    onClick={() => bulkUpdate('PENDING')}
                    disabled={loading}
                    className="h-11 flex items-center gap-1 rounded-xl bg-[#f39c12] px-3 text-xs font-bold text-white hover:bg-[#e67e22] active:scale-[0.98] disabled:opacity-60 transition-all"
                  >
                    Mark Unpaid
                  </button>
                  <Link href="/admin/finance/reminders">
                    <button className="h-11 flex items-center gap-1 rounded-xl bg-[#25d366] px-3 text-xs font-bold text-white hover:bg-[#1fa456] active:scale-[0.98] transition-all">
                      <MessageCircle className="h-4 w-4" />
                      Send Reminder
                    </button>
                  </Link>
                  <button
                    onClick={exportCSV}
                    className="h-11 flex items-center gap-1 rounded-xl bg-[#6f7979] px-3 text-xs font-bold text-white hover:bg-[#5a6264] active:scale-[0.98] transition-all"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                </div>
              ) : null}
            </div>

            {/* Fee rows */}
            <div className="space-y-2">
              {fees.map(fee => {
                const isLoading = loadingIds.has(fee.id);
                const waUrl = getWhatsAppUrl(fee);
                return (
                  <div
                    key={fee.id}
                    className={`rounded-xl border-l-4 p-4 transition-all duration-150 ${statusAccent(fee.status)} ${
                      selected.has(fee.id)
                        ? 'bg-[#f0f9f9] shadow-[0_2px_8px_rgba(0,70,73,0.1)]'
                        : 'bg-white shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
                    }`}
                  >
                    {/* Desktop Layout */}
                    <div className="hidden sm:block">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selected.has(fee.id)}
                          onChange={() => toggle(fee.id)}
                          className="mt-1 h-4 w-4 cursor-pointer accent-[#004649]"
                        />
                        <div className="min-w-0 flex-1">
                          {/* Line 1: Student + Fee + Badge */}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-[#1a1c1c]">{fee.studentName}</p>
                              <p className="text-xs text-[#6f7979]">{fee.title}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusBadge(fee.status)}`}>
                              {statusLabel(fee.status)}
                            </span>
                          </div>
                          {/* Line 2: Due Date */}
                          <p className="text-xs text-[#6f7979] mb-2">Due: {fee.dueDate.slice(0, 10)}</p>
                          {/* Line 3: Paid + Remaining */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-[#6f7979]">Paid: {formatCurrency(fee.paidAmount)} / {formatCurrency(fee.amount)}</span>
                            <span className={`text-sm font-bold ${fee.remaining > 0 ? 'text-[#e74c3c]' : 'text-[#27ae60]'}`}>
                              Remaining: {formatCurrency(fee.remaining)}
                            </span>
                          </div>
                          {/* Actions */}
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => markOnePaid(fee.id)}
                              disabled={isLoading || fee.status === 'PAID'}
                              className="h-10 flex items-center gap-1 rounded-lg bg-[#27ae60] px-2.5 text-xs font-bold text-white hover:bg-[#229954] active:scale-[0.98] disabled:opacity-50 transition-all"
                            >
                              {isLoading ? '...' : '✓'} Paid
                            </button>
                            <button
                              onClick={() => waUrl && window.open(waUrl, '_blank')}
                              disabled={!waUrl}
                              title={waUrl ? 'Send WhatsApp reminder' : 'No phone number'}
                              className="h-10 flex items-center gap-1 rounded-lg bg-[#25d366] px-2.5 text-xs font-bold text-white hover:bg-[#1fa456] active:scale-[0.98] disabled:opacity-50 transition-all"
                            >
                              📱 WhatsApp
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className="sm:hidden">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selected.has(fee.id)}
                          onChange={() => toggle(fee.id)}
                          className="mt-0.5 h-4 w-4 cursor-pointer accent-[#004649]"
                        />
                        <div className="min-w-0 flex-1">
                          {/* Row 1: Name | Fee Type */}
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <p className="font-semibold text-[#1a1c1c] truncate flex-1">{fee.studentName}</p>
                            <p className="shrink-0 text-xs text-[#6f7979]">{fee.title}</p>
                          </div>
                          {/* Row 2: Due + Badge + Remaining */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-[#6f7979]">Due {fee.dueDate.slice(0, 10)}</span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadge(fee.status)}`}>
                              {statusLabel(fee.status)}
                            </span>
                            <span className={`ml-auto shrink-0 text-sm font-bold ${fee.remaining > 0 ? 'text-[#e74c3c]' : 'text-[#27ae60]'}`}>
                              {formatCurrency(fee.remaining)}
                            </span>
                          </div>
                          {/* Actions */}
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => markOnePaid(fee.id)}
                              disabled={isLoading || fee.status === 'PAID'}
                              className="flex-1 h-11 rounded-lg bg-[#27ae60] px-2 text-xs font-bold text-white hover:bg-[#229954] active:scale-[0.98] disabled:opacity-50 transition-all"
                            >
                              {isLoading ? '...' : '✓'} Paid
                            </button>
                            <button
                              onClick={() => waUrl && window.open(waUrl, '_blank')}
                              disabled={!waUrl}
                              className="flex-1 h-11 rounded-lg bg-[#25d366] px-2 text-xs font-bold text-white hover:bg-[#1fa456] active:scale-[0.98] disabled:opacity-50 transition-all"
                            >
                              📱 WA
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 rounded-full bg-[#f0f2f5] p-4">
              <DollarSignIcon />
            </div>
            <p className="font-semibold text-[#3d4a4a]">No fee records</p>
            <p className="mt-1 text-xs text-[#6f7979]">No records match the selected filters.</p>
          </div>
        )}
      </div>

      {toast ? (
        <FinanceToast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      ) : null}
    </>
  );
}

function DollarSignIcon() {
  return (
    <svg className="h-6 w-6 text-[#6f7979]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
