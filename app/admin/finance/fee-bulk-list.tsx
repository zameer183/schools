'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
};

function statusBadge(status: string) {
  if (status === 'PAID')    return 'bg-[#27ae60] text-white';
  if (status === 'OVERDUE') return 'bg-[#e74c3c] text-white';
  if (status === 'PARTIAL') return 'bg-[#e67e22] text-white';
  return 'bg-[#f39c12] text-white'; // PENDING → DUE amber solid
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

  const title =
    selectedFeeStatus === 'paid'   ? 'Paid Fee Records'   :
    selectedFeeStatus === 'unpaid' ? 'Unpaid Fee Records' :
    'Fee Records';

  return (
    <>
      <div className="rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-headline text-lg font-bold text-[#1a1c1c]">{title}</h3>
          {overdueCount > 0 ? (
            <span className="rounded-full bg-[#e74c3c] px-3 py-1 text-[10px] font-bold uppercase text-white">
              {overdueCount} Overdue
            </span>
          ) : null}
        </div>

        {fees.length > 0 ? (
          <>
            {/* Select-all bar */}
            <div className="mb-3 flex items-center justify-between rounded-xl bg-[#f5f7fa] px-4 py-2.5">
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => bulkUpdate('PENDING')}
                    disabled={loading}
                    className="rounded-xl bg-gradient-to-br from-[#f39c12] to-[#e67e22] px-3 py-1.5 text-xs font-bold text-white shadow-[0_4px_12px_rgba(243,156,18,0.3)] transition-all duration-200 hover:scale-105 hover:shadow-[0_6px_16px_rgba(243,156,18,0.4)] active:scale-[0.98] disabled:opacity-60"
                  >
                    Mark as Unpaid
                  </button>
                  <button
                    onClick={() => bulkUpdate('PAID')}
                    disabled={loading}
                    className="rounded-xl bg-gradient-to-br from-[#27ae60] to-[#229954] px-3 py-1.5 text-xs font-bold text-white shadow-[0_4px_12px_rgba(39,174,96,0.3)] transition-all duration-200 hover:scale-105 hover:shadow-[0_6px_16px_rgba(39,174,96,0.4)] active:scale-[0.98] disabled:opacity-60"
                  >
                    {loading ? 'Updating...' : `Mark as Paid`}
                  </button>
                </div>
              ) : null}
            </div>

            {/* Fee rows */}
            <div className="space-y-2">
              {fees.map(fee => (
                <div
                  key={fee.id}
                  onClick={() => toggle(fee.id)}
                  className={`cursor-pointer rounded-xl border-l-4 p-4 transition-all duration-150 ${statusAccent(fee.status)} ${
                    selected.has(fee.id)
                      ? 'bg-[#f0f9f9] shadow-[0_2px_8px_rgba(0,70,73,0.1)]'
                      : 'bg-white shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(fee.id)}
                      onChange={() => toggle(fee.id)}
                      onClick={e => e.stopPropagation()}
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-[#004649]"
                    />
                    <div className="min-w-0 flex-1">
                      {/* ──── DESKTOP LAYOUT ──── */}
                      <div className="hidden sm:block">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-[#1a1c1c]">{fee.studentName}</p>
                            <p className="mt-0.5 truncate text-xs text-[#6f7979]">
                              {fee.title} · Due {fee.dueDate.slice(0, 10)}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusBadge(fee.status)}`}>
                            {statusLabel(fee.status)}
                          </span>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="text-xs text-[#6f7979]">Remaining</span>
                          <span className={`text-base font-extrabold ${fee.remaining > 0 ? 'text-[#e74c3c]' : 'text-[#27ae60]'}`}>
                            {formatCurrency(fee.remaining)}
                          </span>
                        </div>
                      </div>

                      {/* ──── MOBILE LAYOUT ──── */}
                      <div className="sm:hidden">
                        {/* Row 1: Student Name | Fee Type */}
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-semibold text-[#1a1c1c] truncate flex-1">{fee.studentName}</p>
                          <p className="shrink-0 text-xs text-[#6f7979]">{fee.title}</p>
                        </div>
                        {/* Row 2: Due Date | Status Badge | Remaining Amount */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-xs text-[#6f7979]">Due {fee.dueDate.slice(0, 10)}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase shrink-0 ${statusBadge(fee.status)}`}>
                            {statusLabel(fee.status)}
                          </span>
                          <span className={`ml-auto text-sm font-bold shrink-0 ${fee.remaining > 0 ? 'text-[#e74c3c]' : 'text-[#27ae60]'}`}>
                            {formatCurrency(fee.remaining)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
