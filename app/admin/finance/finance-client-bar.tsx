'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, X, Search } from 'lucide-react';
import { runAutoFeesAction } from './actions';
import { FinanceToast } from './finance-toast';

type ClassOption = { id: string; name: string; section: string };
type StudentOption = {
  id: string;
  admissionNo: string;
  user: { fullName: string };
  class: { name: string; section: string } | null;
};

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function FinanceClientBar({
  classes,
  selectedClassId,
  selectedStatus,
  selectedSort,
  selectedPeriod,
  selectedMonth,
  selectedFrom,
  selectedTo,
  searchValue
}: {
  classes: ClassOption[];
  selectedClassId: string;
  selectedStatus: string;
  selectedSort: string;
  selectedPeriod: string;
  selectedMonth: string;
  selectedFrom: string;
  selectedTo: string;
  searchValue: string;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [autoRunPending, startAutoRun] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState(searchValue);
  const [month, setMonth] = useState(selectedMonth);
  const [fromDate, setFromDate] = useState(selectedFrom);
  const [toDate, setToDate] = useState(selectedTo);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMonth(selectedMonth);
    setFromDate(selectedFrom);
    setToDate(selectedTo);
  }, [selectedMonth, selectedFrom, selectedTo]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      p.set('status', selectedStatus);
      p.set('sort', selectedSort);
      p.set('classId', selectedClassId);
      p.set('period', selectedPeriod);
      if (month) p.set('month', month);
      if (fromDate) p.set('from', fromDate);
      if (toDate) p.set('to', toDate);
      router.push(`/admin/finance?${p.toString()}`);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, selectedStatus, selectedSort, selectedClassId, selectedPeriod, month, fromDate, toDate, router]);

  const updateFilter = (key: string, value: string) => {
    const p = new URLSearchParams();
    p.set('search', search);
    p.set('status', key === 'status' ? value : selectedStatus);
    p.set('sort', key === 'sort' ? value : selectedSort);
    p.set('classId', key === 'classId' ? value : selectedClassId);
    p.set('period', key === 'period' ? value : selectedPeriod);
    if (month) p.set('month', month);
    if (fromDate) p.set('from', fromDate);
    if (toDate) p.set('to', toDate);
    router.push(`/admin/finance?${p.toString()}`);
  };

  const handleAutoRun = () => {
    startAutoRun(async () => {
      try {
        const r = await runAutoFeesAction();
        setToast({ message: `${r.feesCreated} monthly fee(s) created, ${r.feesSkipped} skipped.`, type: 'success' });
        router.refresh();
      } catch {
        setToast({ message: 'Auto fees failed. Try again.', type: 'error' });
      }
    });
  };

  const statusChips = [
    { value: 'all', label: 'All' },
    { value: 'paid', label: 'Paid' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partial', label: 'Partial' }
  ];

  const sortOptions = [
    { value: 'dueDate', label: 'Due Date' },
    { value: 'amount', label: 'Amount' },
    { value: 'name', label: 'Name' }
  ];

  const periodOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'mtd_1_8', label: '1 to 8' },
    { value: 'mtd_1_15', label: '1 to 15' },
    { value: 'mtd_full', label: '1 to End Month' }
  ];

  return (
    <>
      <div className="w-full space-y-3.5">
        
        {/* Search input — full width */}
        <div className="relative">
          <label className="flex h-11 items-center gap-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] px-3.5 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-[#004649]/20 focus-within:border-[#004649]">
            <Search className="h-4 w-4 shrink-0 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search by student name or fee description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#94a3b8] hover:bg-[#e2e8f0] hover:text-[#0f172a] transition"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </label>
        </div>

        {/* Primary Controls: Class, Period & Status Chips */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          
          {/* Status chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {statusChips.map(chip => (
              <button
                key={chip.value}
                type="button"
                onClick={() => updateFilter('status', chip.value)}
                className={`shrink-0 inline-flex h-9 items-center justify-center rounded-xl px-3.5 text-xs font-bold transition-all active:scale-95 ${
                  selectedStatus === chip.value
                    ? 'bg-gradient-to-r from-[#004649] to-[#1b5e62] text-white shadow-2xs'
                    : 'bg-[#f8fafc] border border-[#e2e8f0] text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Action buttons (Auto Fees & Add Fee) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoRun}
              disabled={autoRunPending}
              title="Create monthly fees for current active students"
              className="flex-1 sm:flex-none inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#004649]/30 bg-[#e0eff0]/60 px-3.5 text-xs font-bold text-[#004649] hover:bg-[#e0eff0] active:scale-95 transition disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${autoRunPending ? 'animate-spin' : ''}`} />
              <span>Generate Monthly Fees</span>
            </button>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex-1 sm:flex-none inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#004649] to-[#1b5e62] px-4 text-xs font-bold text-white shadow-2xs hover:brightness-105 active:scale-95 transition"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Fee</span>
            </button>
          </div>
        </div>

        {/* Secondary Filters: Class, Period, Sort, and Dates */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#f1f5f9]">
          
          <select
            value={selectedClassId}
            onChange={e => updateFilter('classId', e.target.value)}
            className="h-9 rounded-xl bg-[#f8fafc] border border-[#cbd5e1] px-3 text-xs font-semibold text-[#0f172a] outline-none focus:ring-2 focus:ring-[#004649]/20 focus:border-[#004649] transition cursor-pointer"
            aria-label="Filter by class"
          >
            <option value="all">All Classes & Sections</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} – {c.section}</option>
            ))}
          </select>

          <select
            value={selectedPeriod || 'all'}
            onChange={e => updateFilter('period', e.target.value)}
            className="h-9 rounded-xl bg-[#f8fafc] border border-[#cbd5e1] px-3 text-xs font-semibold text-[#0f172a] outline-none focus:ring-2 focus:ring-[#004649]/20 focus:border-[#004649] transition cursor-pointer"
            aria-label="Filter by period"
          >
            {periodOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={selectedSort || 'dueDate'}
            onChange={e => updateFilter('sort', e.target.value)}
            className="h-9 rounded-xl bg-[#f8fafc] border border-[#cbd5e1] px-3 text-xs font-semibold text-[#0f172a] outline-none focus:ring-2 focus:ring-[#004649]/20 focus:border-[#004649] transition cursor-pointer"
            aria-label="Sort records"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>Sort: {opt.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748b] pl-1">Range:</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => {
                const next = e.target.value;
                setFromDate(next);
                if (next) setMonth('');
              }}
              className="h-7 bg-transparent text-xs font-medium text-[#0f172a] outline-none"
              aria-label="From Date"
            />
            <span className="text-[#94a3b8]">-</span>
            <input
              type="date"
              value={toDate}
              onChange={e => {
                const next = e.target.value;
                setToDate(next);
                if (next) setMonth('');
              }}
              className="h-7 bg-transparent text-xs font-medium text-[#0f172a] outline-none"
              aria-label="To Date"
            />
          </div>

          <span className="text-xs text-[#94a3b8] font-bold">OR</span>

          <input
            type="month"
            value={month}
            onChange={e => {
              const next = e.target.value;
              setMonth(next);
              if (next) {
                setFromDate('');
                setToDate('');
              }
            }}
            className="h-9 rounded-xl bg-[#f8fafc] border border-[#cbd5e1] px-2.5 text-xs font-medium text-[#0f172a] outline-none focus:ring-2 focus:ring-[#004649]/20"
            aria-label="Month filter"
          />

          {(month || fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setMonth('');
                setFromDate('');
                setToDate('');
                const p = new URLSearchParams();
                p.set('search', search);
                p.set('status', selectedStatus);
                p.set('sort', selectedSort);
                p.set('classId', selectedClassId);
                p.set('period', selectedPeriod);
                router.push(`/admin/finance?${p.toString()}`);
              }}
              className="h-9 inline-flex items-center gap-1 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-2.5 text-xs font-bold text-[#b91c1c] hover:bg-[#fee2e2] transition active:scale-95"
            >
              <X className="h-3 w-3" />
              <span>Clear Dates</span>
            </button>
          )}
        </div>
      </div>

      {toast ? (
        <FinanceToast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      ) : null}

      {showModal ? (
        <AddFeeModal
          onClose={() => setShowModal(false)}
          onSuccess={(msg) => {
            setShowModal(false);
            setToast({ message: msg, type: 'success' });
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

// ─── Add Fee Modal ────────────────────────────────────────────────────────────

function AddFeeModal({
  onClose,
  onSuccess
}: {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    studentId: '',
    title: '',
    amount: '',
    dueDate: toInputDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  });

  useEffect(() => {
    fetch('/api/students')
      .then(r => r.json())
      .then(d => setStudents(Array.isArray(d) ? d : []));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const res = await fetch('/api/fees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: form.studentId,
        title: form.title,
        amount: Number(form.amount),
        dueDate: form.dueDate
      })
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'Failed to create fee');
      setSubmitting(false);
      return;
    }
    onSuccess('Fee added successfully.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-headline text-xl font-bold text-[#1a1c1c]">Add Fee</h2>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#6f7979] transition-colors hover:bg-[#f3f4f5]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">
              Student
            </label>
            <select
              required
              value={form.studentId}
              onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
              className="h-11 w-full rounded-xl bg-[#f0f2f5] border-none px-3 text-sm text-[#2c3e50] outline-none focus:ring-2 focus:ring-[#004649]/20"
            >
              <option value="">Select Student</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.user.fullName}{s.class ? ` — ${s.class.name} ${s.class.section}` : ''} ({s.admissionNo})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">
              Fee Name / Type
            </label>
            <input
              required
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Monthly Tuition Fee - April"
              className="h-11 w-full rounded-xl bg-[#f0f2f5] border-none px-3 text-sm text-[#2c3e50] placeholder:text-[#6f7979]/60 outline-none focus:ring-2 focus:ring-[#004649]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">
                Amount
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="h-11 w-full rounded-xl bg-[#f0f2f5] border-none px-3 text-sm text-[#2c3e50] placeholder:text-[#6f7979]/60 outline-none focus:ring-2 focus:ring-[#004649]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">
                Due Date
              </label>
              <input
                required
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="h-11 w-full rounded-xl bg-[#f0f2f5] border-none px-3 text-sm text-[#2c3e50] outline-none focus:ring-2 focus:ring-[#004649]/20"
              />
            </div>
          </div>

          {error ? <p className="text-sm text-[#e74c3c]">{error}</p> : null}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-xl bg-[#f0f2f5] text-sm font-semibold text-[#2c3e50] transition-all duration-200 hover:bg-[#e8ecf0] active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-11 flex-1 rounded-xl bg-gradient-to-br from-[#ff8c42] to-[#e67e22] text-sm font-bold text-white shadow-[0_4px_12px_rgba(255,140,66,0.35)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_6px_16px_rgba(255,140,66,0.45)] active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? 'Adding...' : 'Add Fee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
