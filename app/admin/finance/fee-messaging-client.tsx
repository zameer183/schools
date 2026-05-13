'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, MessageSquare, Search, SlidersHorizontal, X } from 'lucide-react';

type FeeFilter = 'all' | 'paid' | 'unpaid' | 'partial' | 'overdue';

export type SerializedFeeRow = {
  studentId: string;
  studentName: string;
  classId: string;
  classLabel: string;
  feeStatus: 'PAID' | 'UNPAID' | 'PARTIAL' | 'OVERDUE';
  amount: number;
  remaining: number;
  dueDate: string | null;
  month: string;
  schoolName: string;
  whatsApp: string | null;
};

type Props = {
  rows: SerializedFeeRow[];
  classes: { id: string; name: string; section: string }[];
};

const FEE_STATUS_FILTERS: Array<{ value: FeeFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partial' },
  { value: 'overdue', label: 'Overdue' },
];

function formatPkr(value: number) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(value);
}

function feeFilterMatch(status: SerializedFeeRow['feeStatus'], filter: FeeFilter) {
  if (filter === 'all') return true;
  if (filter === 'paid') return status === 'PAID';
  if (filter === 'unpaid') return status === 'UNPAID';
  if (filter === 'partial') return status === 'PARTIAL';
  return status === 'OVERDUE';
}

function toWaRecipient(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

function applyTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function buildPaidTemplate(row: SerializedFeeRow, templateBody?: string) {
  if (templateBody) {
    return applyTemplate(templateBody, {
      studentName: row.studentName,
      guardianName: 'Parent/Guardian',
      amount: formatPkr(row.amount),
      date: new Date().toLocaleDateString('en-CA'),
      receiptNo: '—',
      instituteName: row.schoolName,
      month: row.month,
    });
  }
  return [
    'Assalamualaikum,',
    `This is to confirm that the fee for ${row.studentName} has been successfully received.`,
    `Amount: ${formatPkr(row.amount)}`,
    `Month: ${row.month}`,
    `School: ${row.schoolName}`,
    'Thank you.'
  ].join('\n');
}

function buildReminderTemplate(row: SerializedFeeRow, templateBody?: string) {
  if (templateBody) {
    return applyTemplate(templateBody, {
      studentName: row.studentName,
      guardianName: 'Parent/Guardian',
      amount: formatPkr(row.remaining),
      dueDate: row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-CA') : 'N/A',
      instituteName: row.schoolName,
      month: row.month,
    });
  }
  return [
    'Assalamualaikum,',
    `This is a reminder that the fee for ${row.studentName} is still pending.`,
    `Amount Due: ${formatPkr(row.remaining)}`,
    `Due Date: ${row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-CA') : 'N/A'}`,
    `Month: ${row.month}`,
    `School: ${row.schoolName}`,
    'Kindly make the payment at your earliest convenience.',
    'Thank you.'
  ].join('\n');
}

function feeBadgeClass(status: string) {
  if (status === 'PAID') return 'bg-[#dcfce7] text-[#15803d]';
  if (status === 'OVERDUE') return 'bg-[#fee2e2] text-[#b91c1c]';
  return 'bg-[#fff7ed] text-[#b45309]';
}

export default function FeeMessagingClient({ rows, classes }: Props) {
  const [feeSearch, setFeeSearch] = useState('');
  const [feeClassFilter, setFeeClassFilter] = useState('');
  const [feeStatusFilter, setFeeStatusFilter] = useState<FeeFilter>('all');
  const [feeMessagingSectionOpen, setFeeMessagingSectionOpen] = useState(false);
  const [reminderTemplateBody, setReminderTemplateBody] = useState<string | undefined>(undefined);
  const [paidTemplateBody, setPaidTemplateBody] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch('/api/sms-templates')
      .then((r) => r.ok ? r.json() : [])
      .then((templates: { key: string; body: string; isActive: boolean }[]) => {
        const reminder = templates.find((t) => t.key === 'fee_reminder' && t.isActive);
        const receipt = templates.find((t) => t.key === 'fee_receipt' && t.isActive);
        if (reminder) setReminderTemplateBody(reminder.body);
        if (receipt) setPaidTemplateBody(receipt.body);
      })
      .catch(() => {});
  }, []);

  const [bulkWhatsAppModal, setBulkWhatsAppModal] = useState<{
    title: string;
    mode: 'paid' | 'unpaid';
    rows: SerializedFeeRow[];
    skippedCount: number;
  } | null>(null);
  const [message, setMessage] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 768);
  }, []);

  const feeMessagingRows = useMemo(() => {
    const text = feeSearch.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (text && !row.studentName.toLowerCase().includes(text)) return false;
        if (feeClassFilter && row.classId !== feeClassFilter) return false;
        if (!feeFilterMatch(row.feeStatus, feeStatusFilter)) return false;
        return true;
      });
  }, [rows, feeSearch, feeClassFilter, feeStatusFilter]);

  const paidRows = useMemo(
    () => feeMessagingRows.filter((row) => row.feeStatus === 'PAID'),
    [feeMessagingRows]
  );
  const unpaidRows = useMemo(
    () => feeMessagingRows.filter((row) => row.feeStatus === 'UNPAID' || row.feeStatus === 'PARTIAL' || row.feeStatus === 'OVERDUE'),
    [feeMessagingRows]
  );

  const hasActiveFeeFilters = Boolean(feeSearch.trim() || feeClassFilter || feeStatusFilter !== 'all');
  const clearFeeFilters = () => { setFeeSearch(''); setFeeClassFilter(''); setFeeStatusFilter('all'); };

  const openWhatsApp = (row: SerializedFeeRow) => {
    const recipient = toWaRecipient(row.whatsApp);
    if (!recipient) {
      setMessage(`WhatsApp number missing for ${row.studentName}.`);
      return;
    }
    const text = row.feeStatus === 'PAID' ? buildPaidTemplate(row, paidTemplateBody) : buildReminderTemplate(row, reminderTemplateBody);
    const url = `https://wa.me/${recipient}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openBulkModal = (mode: 'paid' | 'unpaid') => {
    const sourceRows = mode === 'paid' ? paidRows : unpaidRows;
    const rowsWithNumber = sourceRows.filter((row) => Boolean(toWaRecipient(row.whatsApp)));
    const skippedCount = sourceRows.length - rowsWithNumber.length;
    setBulkWhatsAppModal({
      title: mode === 'paid' ? 'Send Confirmation to All Paid' : 'Send Reminder to All Unpaid',
      mode,
      rows: rowsWithNumber,
      skippedCount,
    });
  };

  return (
    <>
      {/* ── FEE MESSAGING ── */}
      <section className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)] sm:p-5">
        {/* Collapsible header on mobile */}
        <button
          type="button"
          onClick={() => setFeeMessagingSectionOpen(!feeMessagingSectionOpen)}
          className="flex w-full items-center justify-between sm:flex-row sm:gap-3 mb-4"
        >
          <div className="text-left">
            <h2 className="font-headline text-base font-bold text-[#111827] sm:text-lg">Fee Messaging</h2>
            <p className="text-xs text-[#64748b] hidden sm:block">Filter students by fee status and send WhatsApp reminders/confirmations.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-full bg-[#f3f4f5] px-2 py-1 text-xs font-semibold text-[#374151]">
              {feeMessagingRows.length}
            </span>
            <ChevronDown className={`h-4 w-4 text-[#6b7280] transition-transform sm:hidden ${feeMessagingSectionOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Content — show on desktop or when expanded on mobile */}
        {(feeMessagingSectionOpen || isDesktop) && (
        <>
        <div className="mt-3 space-y-3">
          <label className="flex h-11 items-center gap-2 rounded-xl bg-[#f3f4f5] px-3 focus-within:ring-2 focus-within:ring-[#16a34a]/30 sm:h-10">
            <Search className="h-4 w-4 shrink-0 text-[#9ca3af]" />
            <input
              value={feeSearch}
              onChange={(e) => setFeeSearch(e.target.value)}
              placeholder="Search by student name…"
              className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
            />
            {feeSearch ? (
              <button
                type="button"
                onClick={() => setFeeSearch('')}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-[#9ca3af] hover:bg-[#e5e7eb] hover:text-[#374151] lg:h-8 lg:w-8"
                aria-label="Clear fee search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[150px] flex-1 sm:flex-none">
              <select
                value={feeClassFilter}
                onChange={(e) => setFeeClassFilter(e.target.value)}
                className="h-11 w-full rounded-full border-none bg-[#f3f4f5] px-3 text-sm text-[#374151] outline-none focus:ring-2 focus:ring-[#16a34a]/30 lg:h-9"
                aria-label="Fee filter by class"
              >
                <option value="">All Classes</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} – {c.section}</option>)}
              </select>
            </div>

            <div className="flex flex-1 flex-wrap items-center gap-2">
              {FEE_STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setFeeStatusFilter(filter.value)}
                  className={`inline-flex h-11 items-center justify-center rounded-full px-3 text-xs font-semibold transition lg:h-9 ${
                    feeStatusFilter === filter.value
                      ? 'bg-gradient-to-br from-[#004649] to-[#1b5e62] text-white shadow-sm'
                      : 'bg-[#f3f4f5] text-[#4b5563] hover:bg-[#e5e7eb]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {hasActiveFeeFilters ? (
              <button
                type="button"
                onClick={clearFeeFilters}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[#e5e7eb] bg-white px-3 text-xs font-semibold text-[#374151] transition hover:bg-[#f9fafb] lg:h-9"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#6b7280]" />
                Reset
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openBulkModal('unpaid')}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#fff7ed] px-3 text-xs font-semibold text-[#9a5a00] ring-1 ring-[#fed7aa] transition hover:bg-[#ffedd5] lg:h-10"
            >
              Send Reminder to All Unpaid
            </button>
            <button
              type="button"
              onClick={() => openBulkModal('paid')}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#ecfdf3] px-3 text-xs font-semibold text-[#15803d] ring-1 ring-[#bbf7d0] transition hover:bg-[#dcfce7] lg:h-10"
            >
              Send Confirmation to All Paid
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2 sm:hidden">
          {feeMessagingRows.map((row) => (
            <div key={row.studentId} className="rounded-xl border border-[#edf0f2] bg-[#fafafa] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#111827]">{row.studentName}</p>
                  <p className="text-xs text-[#6b7280]">{row.classLabel}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${feeBadgeClass(row.feeStatus)}`}>
                  {row.feeStatus}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#4b5563]">
                <p>Amount: <span className="font-semibold text-[#111827]">{formatPkr(row.amount)}</span></p>
                <p>Remaining: <span className="font-semibold text-[#111827]">{formatPkr(row.remaining)}</span></p>
                <p>Due: <span className="font-semibold text-[#111827]">{row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-CA') : 'N/A'}</span></p>
                <p>Month: <span className="font-semibold text-[#111827]">{row.month || 'N/A'}</span></p>
              </div>
              <button
                type="button"
                onClick={() => openWhatsApp(row)}
                disabled={!toWaRecipient(row.whatsApp)}
                className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#16a34a] px-3 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-50 lg:h-10"
              >
                <MessageSquare className="h-4 w-4" />
                {row.feeStatus === 'PAID' ? 'Send Confirmation' : 'Send Reminder'}
              </button>
            </div>
          ))}
          {feeMessagingRows.length === 0 ? (
            <p className="rounded-xl bg-[#f8fafc] px-3 py-4 text-center text-sm text-[#64748b]">No students match fee filters.</p>
          ) : null}
        </div>

        <div className="mt-4 hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-[0.12em] text-[#9ca3af]">
                <th className="rounded-l-xl px-3 py-2">Student</th>
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Amount / Remaining</th>
                <th className="px-3 py-2">Due Date</th>
                <th className="px-3 py-2">WhatsApp</th>
                <th className="rounded-r-xl px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {feeMessagingRows.map((row) => (
                <tr key={row.studentId} className="hover:bg-[#fafafa]">
                  <td className="px-3 py-3 font-medium text-[#111827]">{row.studentName}</td>
                  <td className="px-3 py-3 text-[#64748b]">{row.classLabel}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${feeBadgeClass(row.feeStatus)}`}>
                      {row.feeStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[#374151]">
                    {formatPkr(row.amount)} / <span className="font-semibold">{formatPkr(row.remaining)}</span>
                  </td>
                  <td className="px-3 py-3 text-[#64748b]">
                    {row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-CA') : 'N/A'}
                  </td>
                  <td className="px-3 py-3 text-[#64748b]">{row.whatsApp ?? 'No number'}</td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openWhatsApp(row)}
                      disabled={!toWaRecipient(row.whatsApp)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#16a34a] px-3 text-xs font-semibold text-white transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-50 lg:h-9"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      WhatsApp
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {feeMessagingRows.length === 0 ? (
            <p className="rounded-xl bg-[#f8fafc] px-3 py-4 text-center text-sm text-[#64748b]">No students match fee filters.</p>
          ) : null}
        </div>
        </>
        )}
      </section>

      {/* ── BULK WHATSAPP MODAL ── */}
      {bulkWhatsAppModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setBulkWhatsAppModal(null)}>
          <div className="h-[82vh] w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-auto sm:max-h-[80vh] sm:max-w-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#eef2f7] px-5 py-4">
              <div>
                <h3 className="font-headline text-base font-bold text-[#111827]">{bulkWhatsAppModal.title}</h3>
                <p className="text-xs text-[#64748b]">
                  Selected: <span className="font-semibold text-[#111827]">{bulkWhatsAppModal.rows.length}</span>
                  {' '}| Skipped (no number): <span className="font-semibold text-[#111827]">{bulkWhatsAppModal.skippedCount}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkWhatsAppModal(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[66vh] space-y-2 overflow-y-auto p-4 sm:max-h-[60vh]">
              {bulkWhatsAppModal.rows.map((row) => (
                <div key={row.studentId} className="rounded-xl border border-[#e5e7eb] bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#111827]">{row.studentName}</p>
                      <p className="text-xs text-[#64748b]">{row.classLabel}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${feeBadgeClass(row.feeStatus)}`}>
                      {row.feeStatus}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-[#4b5563] sm:grid-cols-2">
                    <p>Amount: <span className="font-semibold text-[#111827]">{formatPkr(row.amount)}</span></p>
                    <p>Remaining: <span className="font-semibold text-[#111827]">{formatPkr(row.remaining)}</span></p>
                    <p>Due: <span className="font-semibold text-[#111827]">{row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-CA') : 'N/A'}</span></p>
                    <p>WhatsApp: <span className="font-semibold text-[#111827]">{row.whatsApp ?? 'N/A'}</span></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openWhatsApp(row)}
                    className="mt-2 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#16a34a] px-3 text-xs font-semibold text-white transition hover:bg-[#15803d]"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {bulkWhatsAppModal.mode === 'paid' ? 'Open Confirmation' : 'Open Reminder'}
                  </button>
                </div>
              ))}
              {bulkWhatsAppModal.rows.length === 0 ? (
                <p className="rounded-xl bg-[#f8fafc] px-3 py-4 text-center text-sm text-[#64748b]">
                  No students available with valid WhatsApp numbers for this bulk action.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
