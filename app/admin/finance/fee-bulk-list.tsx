'use client';

import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle,
  Coins,
  CreditCard,
  Download,
  MessageSquare,
  RotateCcw,
  X,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Loader2,
  Calendar,
  Layers
} from 'lucide-react';
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
  totalStudentDue?: number;
  studentDueMonthCount?: number;
  unpaidMonths?: Array<{
    id: string;
    title: string;
    dueDate: string;
    amount: number;
    paidAmount: number;
    remaining: number;
    status: string;
  }>;
  whatsApp: string | null;
  guardianPhone: string | null;
};

function statusBadge(status: string) {
  if (status === 'PAID') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'PARTIAL') return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (status === 'OVERDUE') return 'bg-rose-50 text-rose-700 border border-rose-200';
  return 'bg-amber-50 text-amber-700 border border-amber-200';
}

function statusLabel(status: string) {
  if (status === 'PAID') return 'PAID';
  if (status === 'PARTIAL') return 'PARTIAL';
  if (status === 'OVERDUE') return 'OVERDUE';
  return 'DUE';
}

function toWaRecipient(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

function getWhatsAppUrl(fee: SerializedFeeItem & { totalRemaining?: number; titleList?: string[] }): string | null {
  const recipient = toWaRecipient(fee.whatsApp ?? fee.guardianPhone);
  if (!recipient) return null;

  const remaining = fee.totalStudentDue ?? fee.totalRemaining ?? fee.remaining;
  const isPaid = remaining <= 0 || fee.status === 'PAID';
  const monthCount = fee.studentDueMonthCount ?? (fee.dueMonthCount || 1);
  const feeTitle = fee.titleList && fee.titleList.length > 1 ? fee.titleList.join(' + ') : fee.title;

  const text = isPaid
    ? [
        'السلام علیکم،',
        `محترم والدین، ${fee.studentName} کی فیس وصول ہو چکی ہے۔`,
        `فیس: ${feeTitle}`,
        `ادا شدہ رقم: ${formatCurrency(Math.max(fee.amount - fee.discount, 0))}`,
        'آپ کے تعاون کا بہت شکریہ۔ جزاک اللہ خیراً!'
      ].join('\n')
    : [
        'السلام علیکم،',
        `محترم والدین، ${fee.studentName} (${fee.classLabel || 'طالب علم'}) کی فیس کی یاد دہانی:`,
        `کل واجب الادا رقم: ${formatCurrency(remaining)}` + (monthCount > 1 ? ` (${monthCount} ماہ کی فیس واجب الادا ہے)` : ''),
        ...(fee.unpaidMonths && fee.unpaidMonths.length > 1
          ? ['تفصیل:', ...fee.unpaidMonths.map((m) => `• ${m.title}: باقی ${formatCurrency(m.remaining)}`)]
          : []),
        'برائے مہربانی فیس جلد از جلد جمع کروا دیں۔ جزاک اللہ خیراً!'
      ].join('\n');

  return `https://wa.me/${recipient}?text=${encodeURIComponent(text)}`;
}

export function FeeBulkList({
  fees,
  overdueCount,
  selectedFeeStatus,
  currentPage,
  totalDuesCount,
  pageSize
}: {
  fees: SerializedFeeItem[];
  overdueCount: number;
  selectedFeeStatus: string;
  currentPage: number;
  totalDuesCount: number;
  pageSize: number;
}) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(totalDuesCount / pageSize));

  function navigate(pageStr: string) {
    const params = new URLSearchParams(window.location.search);
    params.set('page', pageStr);
    router.push(`?${params.toString()}`);
  }

  const [feesList, setFeesList] = useState<SerializedFeeItem[]>(fees);

  useEffect(() => {
    setFeesList(fees);
  }, [fees]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Expanded student breakdowns
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  // Quick Payment Modal State
  const [payTarget, setPayTarget] = useState<SerializedFeeItem | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('CASH');
  const [payRef, setPayRef] = useState<string>('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  const toggleExpand = (studentId: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const openPayModal = (fee: SerializedFeeItem) => {
    setPayTarget(fee);
    const defaultAmount = fee.totalStudentDue && fee.totalStudentDue > 0
      ? fee.totalStudentDue
      : (fee.remaining > 0 ? fee.remaining : fee.amount);
    setPayAmount(String(defaultAmount));
    setPayMethod('CASH');
    setPayRef('');
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget || !payAmount || Number(payAmount) <= 0) return;
    const amountNum = Number(payAmount);
    setPaySubmitting(true);
    try {
      const res = await fetch('/api/fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: payTarget.studentId,
          feeId: payTarget.id,
          amountPaid: amountNum,
          method: payMethod,
          transactionRef: payRef || null,
          allocateToOldest: true
        })
      });
      const data = await res.json();
      if (res.ok) {
        // Optimistically update feesList so UI updates INSTANTLY
        setFeesList((prevList) => {
          let leftToPay = amountNum;
          return prevList.map((item) => {
            if (item.studentId !== payTarget.studentId) return item;
            const apply = Math.min(leftToPay, item.remaining);
            leftToPay -= apply;
            const newPaid = item.paidAmount + apply;
            const newRem = Math.max(item.remaining - apply, 0);
            const newTotalDue = Math.max((item.totalStudentDue ?? item.remaining) - amountNum, 0);
            const newStatus = newRem <= 0 ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : item.status);
            return {
              ...item,
              paidAmount: newPaid,
              remaining: newRem,
              totalStudentDue: newTotalDue,
              status: newStatus,
              unpaidMonths: item.unpaidMonths
                ? item.unpaidMonths
                    .map((m) => {
                      if (m.id === item.id) {
                        return { ...m, remaining: newRem, paidAmount: newPaid, status: newStatus };
                      }
                      return m;
                    })
                    .filter((m) => m.remaining > 0)
                : []
            };
          });
        });

        setToast({
          message: `Payment of ${formatCurrency(amountNum)} recorded successfully for ${payTarget.studentName}!`,
          type: 'success'
        });
        setPayTarget(null);
        router.refresh();
      } else {
        setToast({ message: data.error || 'Failed to record payment.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setPaySubmitting(false);
    }
  };

  const groupedFees = useMemo(() => {
    const studentMap = new Map<string, SerializedFeeItem & { mergedIds: string[]; totalRemaining: number; titleList: string[] }>();

    for (const f of feesList) {
      const existing = studentMap.get(f.studentId);
      if (!existing) {
        studentMap.set(f.studentId, {
          ...f,
          mergedIds: [f.id],
          totalRemaining: f.totalStudentDue ?? f.remaining,
          titleList: [f.title],
          dueMonthCount: f.studentDueMonthCount ?? f.dueMonthCount ?? 1
        });
      } else {
        existing.mergedIds.push(f.id);
        if (!existing.titleList.includes(f.title)) {
          existing.titleList.push(f.title);
        }
        existing.amount += f.amount;
        existing.paidAmount += f.paidAmount;
        existing.discount += f.discount;

        const currentTotalRem = f.totalStudentDue ?? (existing.totalRemaining + f.remaining);
        existing.totalRemaining = Math.max(existing.totalRemaining, currentTotalRem);
        existing.dueMonthCount = f.studentDueMonthCount ?? Math.max(existing.dueMonthCount || 1, f.dueMonthCount || 1);

        if (new Date(f.dueDate) < new Date(existing.dueDate)) {
          existing.dueDate = f.dueDate;
        }

        if (existing.totalRemaining > 0) {
          if (existing.paidAmount > 0) {
            existing.status = 'PARTIAL';
          } else if (new Date(existing.dueDate) < new Date()) {
            existing.status = 'OVERDUE';
          } else {
            existing.status = 'PENDING';
          }
        } else {
          existing.status = 'PAID';
        }

        if (f.unpaidMonths && f.unpaidMonths.length > 0) {
          existing.unpaidMonths = f.unpaidMonths;
        }
      }
    }
    return Array.from(studentMap.values());
  }, [feesList]);

  const selectedGroups = useMemo(
    () => groupedFees.filter((g) => g.mergedIds.every((id) => selected.has(id))),
    [groupedFees, selected]
  );
  const allSelected = feesList.length > 0 && selected.size === feesList.length;
  const someSelected = selected.size > 0 && selected.size < feesList.length;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  useEffect(() => {
    const visibleIds = new Set(feesList.map((fee) => fee.id));
    setSelected((prev) => new Set(Array.from(prev).filter((id) => visibleIds.has(id))));
  }, [feesList]);

  const title =
    selectedFeeStatus === 'paid'
      ? 'Paid Fee Records'
      : selectedFeeStatus === 'unpaid'
      ? 'Due Fee Records'
      : selectedFeeStatus === 'partial'
      ? 'Partial Fee Records'
      : 'Fee Records';

  const toggleGroup = (mergedIds: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const isAllSelected = mergedIds.every((id) => next.has(id));
      for (const id of mergedIds) {
        if (isAllSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(feesList.map((fee) => fee.id)));
  };

  const bulkUpdate = async (status: 'PAID' | 'PENDING') => {
    if (selected.size === 0) return;
    const selSet = new Set(selected);
    setLoading(true);

    // Optimistic update
    setFeesList((prevList) =>
      prevList.map((item) => {
        if (selSet.has(item.id)) {
          const isMarkingPaid = status === 'PAID';
          const net = Math.max(item.amount - item.discount, 0);
          return {
            ...item,
            status,
            paidAmount: isMarkingPaid ? net : 0,
            remaining: isMarkingPaid ? 0 : net,
            totalStudentDue: isMarkingPaid ? Math.max((item.totalStudentDue ?? net) - net, 0) : (item.totalStudentDue ?? net)
          };
        }
        return item;
      })
    );

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

  const updateOne = async (targetIds: string | string[], status: 'PAID' | 'PENDING') => {
    const ids = Array.isArray(targetIds) ? targetIds : [targetIds];
    const idSet = new Set(ids);
    setLoadingIds((prev) => new Set([...prev, ...ids]));

    // Optimistic update
    setFeesList((prevList) =>
      prevList.map((item) => {
        if (idSet.has(item.id)) {
          const isMarkingPaid = status === 'PAID';
          const net = Math.max(item.amount - item.discount, 0);
          return {
            ...item,
            status,
            paidAmount: isMarkingPaid ? net : 0,
            remaining: isMarkingPaid ? 0 : net,
            totalStudentDue: isMarkingPaid ? Math.max((item.totalStudentDue ?? net) - net, 0) : (item.totalStudentDue ?? net)
          };
        }
        return item;
      })
    );

    const res = await fetch('/api/fees/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status })
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
      ids.forEach((id) => next.delete(id));
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
    const rows = selectedGroups.length ? selectedGroups : groupedFees;
    const header = 'Student,Class,Fee,Due Date,Status,Amount,Paid,Remaining,WhatsApp';
    const csvRows = rows.map((fee) =>
      [
        fee.studentName,
        fee.classLabel ?? '',
        fee.titleList ? fee.titleList.join(' & ') : fee.title,
        fee.dueDate.slice(0, 10),
        statusLabel(fee.status),
        fee.amount,
        fee.paidAmount,
        fee.totalStudentDue ?? fee.totalRemaining ?? fee.remaining,
        fee.whatsApp ?? fee.guardianPhone ?? ''
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',')
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
            <p className="mt-1 text-xs text-[#6f7979]">
              Manage monthly tuition, outstanding dues, partial collections, and payment history in one place.
            </p>
          </div>
          <span className="rounded-full bg-[#f3f4f5] px-3 py-1 text-xs font-semibold text-[#374151]">
            {fees.length} records
          </span>
        </div>

        {overdueCount > 0 ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#fca5a5] bg-[#fef2f2] px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#b45309]" />
              <p className="text-sm font-semibold text-[#b45309]">
                {overdueCount} students have outstanding fees pending collection.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openWhatsAppForRows(fees.filter((fee) => fee.status !== 'PAID'))}
              className="h-9 rounded-xl bg-[#b45309] px-3.5 text-xs font-bold text-white transition hover:bg-[#92400e]"
            >
              Send Due Reminders (WhatsApp)
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
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#16a34a] px-3 text-xs font-bold text-white transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark Full Paid
                </button>
                <button
                  type="button"
                  onClick={() => bulkUpdate('PENDING')}
                  disabled={loading || selected.size === 0}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#f59e0b] px-3 text-xs font-bold text-white transition hover:bg-[#d97706] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Make Unpaid
                </button>
                <button
                  type="button"
                  onClick={() => openWhatsAppForRows(selectedGroups)}
                  disabled={selected.size === 0}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#25d366] px-3 text-xs font-bold text-white transition hover:bg-[#1fa456] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={exportCSV}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#eef2f7] px-3 text-xs font-bold text-[#374151] transition hover:bg-[#e5e7eb]"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[950px] text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-[0.12em] text-[#9ca3af]">
                    <th className="rounded-l-xl px-3 py-2.5">Student</th>
                    <th className="px-3 py-2.5">Fee Title</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Billed / Paid</th>
                    <th className="px-3 py-2.5">Remaining / Total Due</th>
                    <th className="px-3 py-2.5">Due Date</th>
                    <th className="px-3 py-2.5">Contact</th>
                    <th className="rounded-r-xl px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {groupedFees.map((fee) => {
                    const waUrl = getWhatsAppUrl(fee);
                    const remaining = fee.totalStudentDue ?? fee.totalRemaining ?? fee.remaining;
                    const isPaid = remaining <= 0 || fee.status === 'PAID';
                    const isGroupSelected = fee.mergedIds.every((id) => selected.has(id));
                    const isLoading = fee.mergedIds.some((id) => loadingIds.has(id));
                    const feeTitle = fee.titleList && fee.titleList.length > 1 ? fee.titleList.join(' + ') : fee.title;
                    const monthCount = fee.studentDueMonthCount ?? fee.dueMonthCount ?? 1;
                    const isExpanded = expandedStudents.has(fee.studentId);
                    const hasMultiMonths = fee.unpaidMonths && fee.unpaidMonths.length > 1;

                    return (
                      <Fragment key={fee.id}>
                        <tr className={isGroupSelected ? 'bg-[#f0f9f9]' : 'hover:bg-[#fafafa]'}>
                          <td className="px-3 py-3">
                            <label className="inline-flex items-start gap-2">
                              <input
                                type="checkbox"
                                checked={isGroupSelected}
                                onChange={() => toggleGroup(fee.mergedIds)}
                                className="mt-1 h-3.5 w-3.5 accent-[#004649]"
                              />
                              <div>
                                <span className="block font-semibold text-[#111827]">{fee.studentName}</span>
                                <span className="block text-xs text-[#64748b]">{fee.classLabel ?? 'Unassigned'}</span>
                                {monthCount > 1 ? (
                                  <span className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-[#fef3c7] px-1.5 py-0.5 text-[10px] font-bold text-[#b45309]">
                                    <Layers className="h-3 w-3" />
                                    {monthCount} Months Due
                                  </span>
                                ) : null}
                                {hasMultiMonths ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpand(fee.studentId)}
                                    className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#004649] hover:underline"
                                  >
                                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    <span>{isExpanded ? 'Hide Details' : `${fee.unpaidMonths!.length} Months Breakdown`}</span>
                                  </button>
                                ) : null}
                              </div>
                            </label>
                          </td>

                          <td className="px-3 py-3 font-medium text-[#111827]">
                            <div className="max-w-[160px] truncate" title={feeTitle}>
                              {feeTitle}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadge(fee.status)}`}>
                              {statusLabel(fee.status)}
                            </span>
                          </td>

                          <td className="px-3 py-3">
                            <div className="text-sm font-semibold text-[#111827]">{formatCurrency(fee.amount)}</div>
                            <div className={`text-xs ${fee.paidAmount > 0 ? 'font-semibold text-emerald-700' : 'text-[#64748b]'}`}>
                              Paid: {formatCurrency(fee.paidAmount)}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className={`text-sm font-bold ${remaining > 0 ? 'text-[#b91c1c]' : 'text-emerald-700'}`}>
                              {formatCurrency(remaining)}
                            </div>
                            {monthCount > 1 ? (
                              <div className="text-[10px] font-medium text-[#b45309]">
                                Total across {monthCount} months
                              </div>
                            ) : null}
                          </td>

                          <td className="px-3 py-3 text-[#64748b]">
                            <div className="flex items-center gap-1 text-xs">
                              <Calendar className="h-3 w-3 text-[#94a3b8]" />
                              <span>{fee.dueDate.slice(0, 10)}</span>
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            {fee.whatsApp || fee.guardianPhone ? (
                              <div className="text-xs">
                                <span className="block text-[#111827]">{fee.whatsApp || fee.guardianPhone}</span>
                                <span className="block text-[10px] text-[#64748b]">WhatsApp / Phone</span>
                              </div>
                            ) : (
                              <span className="text-xs text-[#9ca3af]">-</span>
                            )}
                          </td>

                          <td className="px-3 py-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {!isPaid && (
                                <button
                                  type="button"
                                  onClick={() => openPayModal(fee)}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#004649] px-2.5 text-xs font-bold text-white transition hover:bg-[#003638] shadow-xs active:scale-95"
                                  title="Collect Fee Payment"
                                >
                                  <Coins className="h-3.5 w-3.5" />
                                  <span>Collect</span>
                                </button>
                              )}

                              {isPaid ? (
                                <button
                                  type="button"
                                  onClick={() => updateOne(fee.mergedIds, 'PENDING')}
                                  disabled={isLoading}
                                  className="h-8 rounded-lg bg-[#fff7ed] px-2 text-xs font-semibold text-[#b45309] ring-1 ring-[#fed7aa] transition hover:bg-[#ffedd5] disabled:opacity-50"
                                >
                                  Make Unpaid
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => updateOne(fee.mergedIds, 'PAID')}
                                  disabled={isLoading}
                                  className="h-8 rounded-lg bg-[#16a34a] px-2 text-xs font-semibold text-white transition hover:bg-[#15803d] disabled:opacity-50"
                                  title="Mark Full Fee Paid"
                                >
                                  Full Paid
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => waUrl && window.open(waUrl, '_blank', 'noopener,noreferrer')}
                                disabled={!waUrl}
                                className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#25d366] px-2 text-xs font-semibold text-white transition hover:bg-[#1fa456] disabled:cursor-not-allowed disabled:opacity-50"
                                title="WhatsApp Reminder"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Breakdown Drawer */}
                        {isExpanded && fee.unpaidMonths && (
                          <tr className="bg-[#f8fafc]/90 border-b border-[#e2e8f0]">
                            <td colSpan={8} className="px-6 py-3">
                              <div className="rounded-xl border border-[#cbd5e1] bg-white p-3 shadow-xs">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-bold text-[#0f172a] flex items-center gap-1.5">
                                    <Layers className="h-3.5 w-3.5 text-[#004649]" />
                                    Monthly Fee Breakdown ({fee.studentName})
                                  </p>
                                  <span className="text-xs font-bold text-rose-700">
                                    Total Balance Due: {formatCurrency(remaining)}
                                  </span>
                                </div>
                                <div className="divide-y divide-[#f1f5f9]">
                                  {fee.unpaidMonths.map((m) => (
                                    <div key={m.id} className="flex items-center justify-between py-2 text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-[#1e293b]">{m.title}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${statusBadge(m.status)}`}>
                                          {statusLabel(m.status)}
                                        </span>
                                        <span className="text-[10px] text-[#64748b]">Due: {m.dueDate.slice(0, 10)}</span>
                                      </div>
                                      <div className="flex items-center gap-4 text-right">
                                        <span className="text-[#64748b]">Fee: {formatCurrency(m.amount)}</span>
                                        <span className="text-emerald-700 font-medium">Paid: {formatCurrency(m.paidAmount)}</span>
                                        <span className="text-rose-600 font-bold">Due: {formatCurrency(m.remaining)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="space-y-3 lg:hidden">
              {groupedFees.map((fee) => {
                const waUrl = getWhatsAppUrl(fee);
                const remaining = fee.totalStudentDue ?? fee.totalRemaining ?? fee.remaining;
                const isPaid = remaining <= 0 || fee.status === 'PAID';
                const isGroupSelected = fee.mergedIds.every((id) => selected.has(id));
                const isLoading = fee.mergedIds.some((id) => loadingIds.has(id));
                const feeTitle = fee.titleList && fee.titleList.length > 1 ? fee.titleList.join(' + ') : fee.title;
                const monthCount = fee.studentDueMonthCount ?? fee.dueMonthCount ?? 1;
                const isExpanded = expandedStudents.has(fee.studentId);
                const hasMultiMonths = fee.unpaidMonths && fee.unpaidMonths.length > 1;

                return (
                  <div key={fee.id} className={`rounded-xl border border-[#edf0f2] p-3.5 ${isGroupSelected ? 'bg-[#f0f9f9]' : 'bg-white'} shadow-xs`}>
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex min-w-0 items-start gap-2">
                        <input
                          type="checkbox"
                          checked={isGroupSelected}
                          onChange={() => toggleGroup(fee.mergedIds)}
                          className="mt-1 h-4 w-4 accent-[#004649]"
                        />
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[#111827]">{fee.studentName}</span>
                          <span className="block text-xs text-[#64748b] truncate">{fee.classLabel ?? feeTitle}</span>
                          {monthCount > 1 ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-[#fef3c7] px-1.5 py-0.5 text-[10px] font-bold text-[#b45309]">
                              <Layers className="h-3 w-3" />
                              {monthCount} Months Due
                            </span>
                          ) : null}
                        </div>
                      </label>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadge(fee.status)}`}>
                        {statusLabel(fee.status)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-[#f8fafc] p-2.5 text-xs text-[#4b5563]">
                      <p>Fee: <span className="font-semibold text-[#111827]">{formatCurrency(fee.amount)}</span></p>
                      <p>Paid: <span className="font-semibold text-emerald-700">{formatCurrency(fee.paidAmount)}</span></p>
                      <p>Due Date: <span className="font-semibold text-[#111827]">{fee.dueDate.slice(0, 10)}</span></p>
                      <p>
                        Remaining:{' '}
                        <span className={remaining > 0 ? 'font-bold text-[#dc2626]' : 'font-bold text-emerald-700'}>
                          {formatCurrency(remaining)}
                        </span>
                      </p>
                    </div>

                    {hasMultiMonths && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => toggleExpand(fee.studentId)}
                          className="flex items-center gap-1 text-xs font-semibold text-[#004649] hover:underline"
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          <span>{isExpanded ? 'Hide Details' : `${fee.unpaidMonths!.length} Months Breakdown`}</span>
                        </button>
                        {isExpanded && (
                          <div className="mt-2 rounded-lg border border-[#e2e8f0] bg-[#fafafa] p-2 text-xs space-y-1.5">
                            {fee.unpaidMonths!.map((m) => (
                              <div key={m.id} className="flex items-center justify-between border-b border-[#f1f5f9] pb-1 last:border-0 last:pb-0">
                                <div>
                                  <p className="font-semibold text-[#1e293b]">{m.title}</p>
                                  <p className="text-[10px] text-[#64748b]">Due: {m.dueDate.slice(0, 10)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-rose-600">Due: {formatCurrency(m.remaining)}</p>
                                  <p className="text-[10px] text-[#64748b]">Paid: {formatCurrency(m.paidAmount)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {!isPaid && (
                        <button
                          type="button"
                          onClick={() => openPayModal(fee)}
                          className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#004649] px-3 text-xs font-bold text-white shadow-xs"
                        >
                          <Coins className="h-3.5 w-3.5" />
                          <span>Collect Fee</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => updateOne(fee.mergedIds, isPaid ? 'PENDING' : 'PAID')}
                        disabled={isLoading}
                        className={`flex-1 h-9 rounded-xl px-3 text-xs font-bold transition disabled:opacity-50 ${
                          isPaid
                            ? 'bg-[#fff7ed] text-[#b45309] ring-1 ring-[#fed7aa] hover:bg-[#ffedd5]'
                            : 'bg-[#16a34a] text-white hover:bg-[#15803d]'
                        }`}
                      >
                        {isPaid ? 'Make Unpaid' : 'Full Paid'}
                      </button>
                      <button
                        type="button"
                        onClick={() => waUrl && window.open(waUrl, '_blank', 'noopener,noreferrer')}
                        disabled={!waUrl}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#25d366] px-3 text-xs font-bold text-white transition hover:bg-[#1fa456] disabled:opacity-50"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#edf0f2] bg-[#f8fafc] px-4 py-3 mt-4 rounded-xl">
                <div className="text-sm text-[#6b7280]">
                  Showing <span className="font-semibold text-[#111827]">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-semibold text-[#111827]">{Math.min(currentPage * pageSize, totalDuesCount)}</span> of{' '}
                  <span className="font-semibold text-[#111827]">{totalDuesCount}</span> records
                </div>
                <div className="flex gap-2">
                  {currentPage > 1 ? (
                    <button
                      onClick={() => navigate(String(currentPage - 1))}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm font-semibold text-[#374151] hover:bg-[#f3f4f5] transition"
                    >
                      Previous
                    </button>
                  ) : (
                    <span className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm font-semibold text-[#d1d5db] cursor-not-allowed">
                      Previous
                    </span>
                  )}
                  {currentPage < totalPages ? (
                    <button
                      onClick={() => navigate(String(currentPage + 1))}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm font-semibold text-[#374151] hover:bg-[#f3f4f5] transition"
                    >
                      Next
                    </button>
                  ) : (
                    <span className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm font-semibold text-[#d1d5db] cursor-not-allowed">
                      Next
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl bg-[#f8fafc] px-4 py-10 text-center">
            <p className="font-semibold text-[#3d4a4a]">No fee records</p>
            <p className="mt-1 text-xs text-[#6f7979]">No records match the selected filters.</p>
          </div>
        )}
      </section>

      {/* ── COLLECT FEE MODAL ────────────────────────────────────────── */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header (Sticky) */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-gradient-to-r from-[#004649] to-[#1b5e62] text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-xs text-emerald-300 border border-white/15">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-base sm:text-lg text-white leading-tight">Collect Fee Payment</h3>
                  <p className="text-xs text-emerald-200/90">Record partial or full payment into ledger</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayTarget(null)}
                className="rounded-xl p-1.5 text-white/80 hover:bg-white/15 hover:text-white transition active:scale-95"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <form onSubmit={handleRecordPayment} className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1">
              {/* Student Summary Card */}
              <div className="rounded-2xl border border-[#cceded] bg-gradient-to-br from-[#f0f9f9] to-[#e6f4f4]/60 p-4 shadow-xs">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#004649]/80 block">Student</span>
                    <h4 className="font-headline font-bold text-base text-[#0f172a] truncate">{payTarget.studentName}</h4>
                    <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-[#004649] bg-white px-2.5 py-0.5 rounded-lg border border-[#cceded]">
                      {payTarget.classLabel ?? 'Unassigned Class'}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-[#64748b] tracking-wider block">Total Balance Due</span>
                    <span className="text-lg sm:text-xl font-extrabold text-rose-600">
                      {formatCurrency(payTarget.totalStudentDue ?? payTarget.totalRemaining ?? payTarget.remaining)}
                    </span>
                  </div>
                </div>

                {payTarget.unpaidMonths && payTarget.unpaidMonths.length > 1 && (
                  <div className="mt-3.5 pt-3 border-t border-[#bce4e4]/80">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-[#004649] flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-[#004649]" />
                        <span>Outstanding Breakdown ({payTarget.unpaidMonths.length} Months)</span>
                      </p>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {payTarget.unpaidMonths.map((m) => (
                        <div key={m.id} className="flex items-center justify-between text-xs rounded-lg bg-white/80 border border-[#bce4e4]/60 px-3 py-1.5">
                          <div className="min-w-0 truncate">
                            <span className="font-medium text-[#1e293b]">{m.title}</span>
                            <span className="text-[10px] text-[#64748b] ml-1.5">Due: {m.dueDate.slice(0, 10)}</span>
                          </div>
                          <span className="font-bold text-rose-600 shrink-0 text-xs bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60">
                            Due: {formatCurrency(m.remaining)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Amount to Pay */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#334155]">
                    Amount Received (PKR) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-semibold text-[#004649]">Direct Ledger Credit</span>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-extrabold text-[#64748b]">
                    Rs.
                  </div>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                    placeholder="Enter amount..."
                    className="h-12 w-full rounded-xl border border-[#cbd5e1] pl-11 pr-4 text-base sm:text-lg font-bold text-[#0f172a] shadow-xs outline-none focus:border-[#004649] focus:ring-2 focus:ring-[#004649]/20 transition"
                  />
                </div>

                {/* Quick Amount Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mr-1">Quick Fill:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const total = payTarget.totalStudentDue ?? payTarget.totalRemaining ?? payTarget.remaining;
                      setPayAmount(String(total));
                    }}
                    className="rounded-lg bg-[#004649] text-white px-2.5 py-1 text-[11px] font-semibold hover:bg-[#003638] shadow-2xs active:scale-95 transition"
                  >
                    Full Balance ({formatCurrency(payTarget.totalStudentDue ?? payTarget.totalRemaining ?? payTarget.remaining)})
                  </button>
                  {payTarget.unpaidMonths && payTarget.unpaidMonths.length > 1 && (
                    payTarget.unpaidMonths.slice(0, 4).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPayAmount(String(m.remaining))}
                        className="rounded-lg bg-[#f1f5f9] border border-[#cbd5e1] px-2.5 py-1 text-[11px] font-semibold text-[#334155] hover:bg-[#e2e8f0] active:scale-95 transition"
                      >
                        {m.title.replace('Monthly Tuition Fee - ', '').replace('Monthly Tuition Fee', 'Single Month')}: {formatCurrency(m.remaining)}
                      </button>
                    ))
                  )}
                </div>

                <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-2.5 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                  <span className="shrink-0 text-sm">💡</span>
                  <span>
                    <strong>Partial payment supported:</strong> If student pays less than total (e.g. Rs 2,000 out of Rs 3,000), enter 2,000. The remaining Rs 1,000 will automatically stay in their account ledger.
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#334155]">
                  Payment Method
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-xs sm:text-sm font-semibold text-[#0f172a] shadow-xs outline-none focus:border-[#004649] focus:ring-2 focus:ring-[#004649]/20"
                >
                  <option value="CASH">Cash in Hand (نقد کیش)</option>
                  <option value="BANK_TRANSFER">Bank Transfer (بینک ٹرانسفر)</option>
                  <option value="ONLINE">EasyPaisa / JazzCash / Mobile Wallet</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              {/* Receipt / Reference */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#334155]">
                  Receipt # / Reference (Optional)
                </label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. REC-1048 or Bank Transaction ID"
                  className="h-11 w-full rounded-xl border border-[#cbd5e1] px-3.5 text-xs sm:text-sm text-[#0f172a] shadow-xs outline-none focus:border-[#004649] focus:ring-2 focus:ring-[#004649]/20"
                />
              </div>

              {/* Modal Footer (Sticky) */}
              <div className="sticky bottom-0 bg-[#f8fafc] -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 p-4 sm:p-5 border-t border-[#e2e8f0] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPayTarget(null)}
                  disabled={paySubmitting}
                  className="h-11 rounded-xl px-4 text-xs sm:text-sm font-semibold text-[#475569] border border-[#cbd5e1] bg-white hover:bg-[#f1f5f9] transition active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting || !payAmount || Number(payAmount) <= 0}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#004649] to-[#1b5e62] px-6 text-xs sm:text-sm font-bold text-white shadow-sm hover:brightness-105 active:scale-95 transition disabled:opacity-50"
                >
                  {paySubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                  <span>Confirm Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast ? (
        <FinanceToast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      ) : null}
    </>
  );
}
