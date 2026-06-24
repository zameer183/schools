'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Download, MessageSquare, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { FinanceToast } from './finance-toast';

export type SerializedFeeItem = {
  id: string;
  title: string;
  status: string;
  dueDate: string;
  studentName: string;
  studentId: string;
  classLabel?: string;
  dueMonthCount?: number;
  advanceMonthCount?: number;
  amount: number;
  discount: number;
  paidAmount: number;
  remaining: number;
  whatsApp: string | null;
  guardianPhone: string | null;
};

function statusBadge(status: string) {
  if (status === 'PAID') return 'bg-[#dcfce7] text-[#15803d]';
  if (status === 'PARTIAL') return 'bg-[#ffedd5] text-[#c2410c]';
  return 'bg-[#fef3c7] text-[#b45309]';
}

function statusLabel(status: string) {
  return status === 'PENDING' ? 'DUE' : status;
}

function toWaRecipient(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

function getWhatsAppUrl(fee: SerializedFeeItem): string | null {
  const recipient = toWaRecipient(fee.whatsApp ?? fee.guardianPhone);
  if (!recipient) return null;

  const isPaid = fee.remaining <= 0 || fee.status === 'PAID';
  const text = isPaid
    ? [
        'Assalamualaikum,',
        `Payment received for ${fee.studentName}.`,
        `Fee: ${fee.title}`,
        `Amount: ${formatCurrency(Math.max(fee.amount - fee.discount, 0))}`,
        'Thank you.'
      ].join('\n')
    : [
        'Assalamualaikum,',
        `Fee reminder for ${fee.studentName}.`,
        `Fee: ${fee.title}`,
        `Remaining: ${formatCurrency(fee.remaining)}`,
        `Due Date: ${fee.dueDate.slice(0, 10)}`,
        'Kindly make the payment at your earliest convenience.'
      ].join('\n');

  return `https://wa.me/${recipient}?text=${encodeURIComponent(text)}`;
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

  const selectedRows = useMemo(
    () => fees.filter((fee) => selected.has(fee.id)),
    [fees, selected]
  );
  const allSelected = fees.length > 0 && selected.size === fees.length;
  const someSelected = selected.size > 0 && selected.size < fees.length;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  useEffect(() => {
    const visibleIds = new Set(fees.map((fee) => fee.id));
    setSelected((prev) => new Set(Array.from(prev).filter((id) => visibleIds.has(id))));
  }, [fees]);

  const title =
    selectedFeeStatus === 'paid' ? 'Paid Fee Records' :
    selectedFeeStatus === 'unpaid' ? 'Due Fee Records' :
    'Fee Records';

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(fees.map((fee) => fee.id)));
  };

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
      setToast({ message: `${data.updated} fee(s) updated.`, type: 'success' });
      setSelected(new Set());
      router.refresh();
    } else {
      setToast({ message: data.error ?? 'Failed. Try again.', type: 'error' });
    }
    setLoading(false);
  };

  const updateOne = async (feeId: string, status: 'PAID' | 'PENDING') => {
    setLoadingIds((prev) => new Set(prev).add(feeId));
    const res = await fetch('/api/fees/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [feeId], status })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setToast({ message: status === 'PAID' ? 'Fee marked paid.' : 'Fee marked unpaid.', type: 'success' });
      router.refresh();
    } else {
      setToast({ message: data.error ?? 'Failed. Try again.', type: 'error' });
    }
    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(feeId);
      return next;
    });
  };

  const openWhatsAppForRows = (rows: SerializedFeeItem[]) => {
    const links = rows.map(getWhatsAppUrl).filter(Boolean) as string[];
    if (links.length === 0) {
      setToast({ message: 'No WhatsApp number available for selected rows.', type: 'error' });
      return;
    }
    links.forEach((url) => window.open(url, '_blank', 'noopener,noreferrer'));
  };

  const exportCSV = () => {
    const rows = selectedRows.length ? selectedRows : fees;
    const header = 'Student,Class,Fee,Due Date,Status,Amount,Paid,Remaining,WhatsApp';
    const csvRows = rows.map((fee) =>
      [
        fee.studentName,
        fee.classLabel ?? '',
        fee.title,
        fee.dueDate.slice(0, 10),
        statusLabel(fee.status),
        fee.amount,
        fee.paidAmount,
        fee.remaining,
        fee.whatsApp ?? fee.guardianPhone ?? ''
      ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')
    );
    const blob = new Blob([[header, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fees-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <section className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-headline text-lg font-bold text-[#1a1c1c]">{title}</h3>
            <p className="mt-1 text-xs text-[#6f7979]">Fee status, collection actions, and WhatsApp messaging in one place.</p>
          </div>
          <span className="rounded-full bg-[#f3f4f5] px-3 py-1 text-xs font-semibold text-[#374151]">
            {fees.length} records
          </span>
        </div>

        {overdueCount > 0 ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#fca5a5] bg-[#fef2f2] px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#b45309]" />
              <p className="text-sm font-semibold text-[#b45309]">{overdueCount} due fee(s)</p>
            </div>
            <button
              type="button"
              onClick={() => openWhatsAppForRows(fees.filter((fee) => fee.status !== 'PAID'))}
              className="h-10 rounded-xl bg-[#b45309] px-3 text-xs font-bold text-white transition hover:bg-[#92400e]"
            >
              Send Due Reminders
            </button>
          </div>
        ) : null}

        {fees.length > 0 ? (
          <>
            <div className="mb-3 flex flex-col gap-3 rounded-xl bg-[#f8fafc] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-[#3d4a4a]">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer accent-[#004649]"
                />
                {selected.size > 0 ? `Selected (${selected.size})` : `Select all (${fees.length})`}
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => bulkUpdate('PAID')}
                  disabled={loading || selected.size === 0}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#16a34a] px-3 text-xs font-bold text-white transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark Paid
                </button>
                <button
                  type="button"
                  onClick={() => bulkUpdate('PENDING')}
                  disabled={loading || selected.size === 0}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#f59e0b] px-3 text-xs font-bold text-white transition hover:bg-[#d97706] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Make Unpaid
                </button>
                <button
                  type="button"
                  onClick={() => openWhatsAppForRows(selectedRows)}
                  disabled={selected.size === 0}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#25d366] px-3 text-xs font-bold text-white transition hover:bg-[#1fa456] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={exportCSV}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#eef2f7] px-3 text-xs font-bold text-[#374151] transition hover:bg-[#e5e7eb]"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-[0.12em] text-[#9ca3af]">
                    <th className="rounded-l-xl px-3 py-2">Student</th>
                    <th className="px-3 py-2">Fee</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Amount / Paid</th>
                    <th className="px-3 py-2">Remaining</th>
                    <th className="px-3 py-2">Due Date</th>
                    <th className="px-3 py-2">WhatsApp</th>
                    <th className="rounded-r-xl px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {fees.map((fee) => {
                    const waUrl = getWhatsAppUrl(fee);
                    const isPaid = fee.remaining <= 0 || fee.status === 'PAID';
                    const isLoading = loadingIds.has(fee.id);
                    return (
                      <tr key={fee.id} className={selected.has(fee.id) ? 'bg-[#f0f9f9]' : 'hover:bg-[#fafafa]'}>
                        <td className="px-3 py-3">
                          <label className="inline-flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={selected.has(fee.id)}
                              onChange={() => toggle(fee.id)}
                              className="mt-1 h-3.5 w-3.5 accent-[#004649]"
                            />
                            <span>
                              <span className="block font-semibold text-[#111827]">{fee.studentName}</span>
                              <span className="block text-xs text-[#64748b]">{fee.classLabel ?? 'Unassigned'}</span>
                              {fee.dueMonthCount && fee.dueMonthCount > 1 ? (
                                <span className="mt-0.5 block text-xs font-semibold text-[#b45309]">{fee.dueMonthCount} months due</span>
                              ) : null}
                              {fee.advanceMonthCount && fee.advanceMonthCount > 0 ? (
                                <span className="mt-0.5 block text-xs font-semibold text-[#15803d]">{fee.advanceMonthCount} month(s) advance paid</span>
                              ) : null}
                            </span>
                          </label>
                        </td>
                        <td className="px-3 py-3 text-[#374151]">{fee.title}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusBadge(fee.status)}`}>
                            {statusLabel(fee.status)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[#374151]">
                          {formatCurrency(Math.max(fee.amount - fee.discount, 0))}
                          <span className="block text-xs text-[#64748b]">Paid {formatCurrency(fee.paidAmount)}</span>
                        </td>
                        <td className={`px-3 py-3 font-bold ${fee.remaining > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`}>
                          {formatCurrency(fee.remaining)}
                        </td>
                        <td className="px-3 py-3 text-[#64748b]">{fee.dueDate.slice(0, 10)}</td>
                        <td className="px-3 py-3 text-[#64748b]">{fee.whatsApp ?? fee.guardianPhone ?? 'No number'}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            {isPaid ? (
                              <button
                                type="button"
                                onClick={() => updateOne(fee.id, 'PENDING')}
                                disabled={isLoading}
                                className="h-9 rounded-lg bg-[#fff7ed] px-3 text-xs font-semibold text-[#b45309] ring-1 ring-[#fed7aa] transition hover:bg-[#ffedd5] disabled:opacity-50"
                              >
                                Make Unpaid
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateOne(fee.id, 'PAID')}
                                disabled={isLoading}
                                className="h-9 rounded-lg bg-[#16a34a] px-3 text-xs font-semibold text-white transition hover:bg-[#15803d] disabled:opacity-50"
                              >
                                Mark Paid
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => waUrl && window.open(waUrl, '_blank', 'noopener,noreferrer')}
                              disabled={!waUrl}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#25d366] px-3 text-xs font-semibold text-white transition hover:bg-[#1fa456] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              {isPaid ? 'Confirm' : 'Reminder'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 lg:hidden">
              {fees.map((fee) => {
                const waUrl = getWhatsAppUrl(fee);
                const isPaid = fee.remaining <= 0 || fee.status === 'PAID';
                const isLoading = loadingIds.has(fee.id);
                return (
                  <div key={fee.id} className={`rounded-xl border border-[#edf0f2] p-3 ${selected.has(fee.id) ? 'bg-[#f0f9f9]' : 'bg-white'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex min-w-0 items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selected.has(fee.id)}
                          onChange={() => toggle(fee.id)}
                          className="mt-1 h-4 w-4 accent-[#004649]"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[#111827]">{fee.studentName}</span>
                          <span className="block text-xs text-[#64748b]">{fee.classLabel ?? fee.title}</span>
                          {fee.dueMonthCount && fee.dueMonthCount > 1 ? (
                            <span className="mt-0.5 block text-xs font-semibold text-[#b45309]">{fee.dueMonthCount} months due</span>
                          ) : null}
                          {fee.advanceMonthCount && fee.advanceMonthCount > 0 ? (
                            <span className="mt-0.5 block text-xs font-semibold text-[#15803d]">{fee.advanceMonthCount} month(s) advance paid</span>
                          ) : null}
                        </span>
                      </label>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadge(fee.status)}`}>
                        {statusLabel(fee.status)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#4b5563]">
                      <p>Fee: <span className="font-semibold text-[#111827]">{formatCurrency(Math.max(fee.amount - fee.discount, 0))}</span></p>
                      <p>Paid: <span className="font-semibold text-[#111827]">{formatCurrency(fee.paidAmount)}</span></p>
                      <p>Due: <span className="font-semibold text-[#111827]">{fee.dueDate.slice(0, 10)}</span></p>
                      <p>Remaining: <span className={fee.remaining > 0 ? 'font-semibold text-[#dc2626]' : 'font-semibold text-[#16a34a]'}>{formatCurrency(fee.remaining)}</span></p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateOne(fee.id, isPaid ? 'PENDING' : 'PAID')}
                        disabled={isLoading}
                        className={`h-11 rounded-xl px-3 text-xs font-bold transition disabled:opacity-50 ${
                          isPaid
                            ? 'bg-[#fff7ed] text-[#b45309] ring-1 ring-[#fed7aa] hover:bg-[#ffedd5]'
                            : 'bg-[#16a34a] text-white hover:bg-[#15803d]'
                        }`}
                      >
                        {isPaid ? 'Make Unpaid' : 'Mark Paid'}
                      </button>
                      <button
                        type="button"
                        onClick={() => waUrl && window.open(waUrl, '_blank', 'noopener,noreferrer')}
                        disabled={!waUrl}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25d366] px-3 text-xs font-bold text-white transition hover:bg-[#1fa456] disabled:opacity-50"
                      >
                        <MessageSquare className="h-4 w-4" />
                        WhatsApp
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="rounded-xl bg-[#f8fafc] px-4 py-10 text-center">
            <p className="font-semibold text-[#3d4a4a]">No fee records</p>
            <p className="mt-1 text-xs text-[#6f7979]">No records match the selected filters.</p>
          </div>
        )}
      </section>

      {toast ? (
        <FinanceToast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      ) : null}
    </>
  );
}
