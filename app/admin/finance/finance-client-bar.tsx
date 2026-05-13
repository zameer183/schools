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

export function FinanceClientBar({
  classes,
  selectedClassId,
  selectedStatus,
  selectedSort,
  searchValue
}: {
  classes: ClassOption[];
  selectedClassId: string;
  selectedStatus: string;
  selectedSort: string;
  searchValue: string;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [autoRunPending, startAutoRun] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState(searchValue);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      p.set('status', selectedStatus);
      p.set('sort', selectedSort);
      p.set('classId', selectedClassId);
      router.push(`/admin/finance?${p.toString()}`);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, selectedStatus, selectedSort, selectedClassId, router]);

  const updateFilter = (key: string, value: string) => {
    const p = new URLSearchParams();
    p.set('search', search);
    p.set('status', key === 'status' ? value : selectedStatus);
    p.set('sort', key === 'sort' ? value : selectedSort);
    p.set('classId', key === 'classId' ? value : selectedClassId);
    router.push(`/admin/finance?${p.toString()}`);
  };

  const handleAutoRun = () => {
    startAutoRun(async () => {
      try {
        const r = await runAutoFeesAction();
        setToast({ message: `${r.feesCreated} fees created, ${r.overdueMarked} marked overdue.`, type: 'success' });
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
    { value: 'partial', label: 'Partial' },
    { value: 'overdue', label: 'Due 🔴' }
  ];

  const sortOptions = [
    { value: 'dueDate', label: 'Due Date' },
    { value: 'amount', label: 'Amount' },
    { value: 'name', label: 'Name' }
  ];

  return (
    <>
      <div className="w-full space-y-3">
        {/* Search input — full width */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-[#6f7979]" />
          <input
            type="text"
            placeholder="Search student name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-11 w-full pl-10 pr-4 rounded-xl bg-[#f0f2f5] border-none text-sm text-[#2c3e50] placeholder:text-[#6f7979]/60 outline-none focus:ring-2 focus:ring-[#004649]/20"
          />
        </div>

        {/* Status chips + Sort */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status chips — scrollable on mobile */}
          <div className="flex-1 overflow-x-auto flex gap-2 pb-1">
            {statusChips.map(chip => (
              <button
                key={chip.value}
                onClick={() => updateFilter('status', chip.value)}
                className={`shrink-0 h-10 px-3 rounded-xl text-xs font-semibold transition-all ${
                  selectedStatus === chip.value
                    ? 'bg-gradient-to-br from-[#004649] to-[#1b5e62] text-white shadow-sm'
                    : 'bg-[#f0f2f5] text-[#2c3e50] hover:bg-[#e8ecf0]'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <select
            value={selectedSort || 'dueDate'}
            onChange={e => updateFilter('sort', e.target.value)}
            className="h-10 rounded-xl bg-[#f0f2f5] border-none px-3 text-xs font-semibold text-[#2c3e50] outline-none focus:ring-2 focus:ring-[#004649]/20"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Class filter + Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedClassId}
            onChange={e => updateFilter('classId', e.target.value)}
            className="h-10 rounded-xl bg-[#f0f2f5] border-none px-3 text-sm text-[#2c3e50] outline-none focus:ring-2 focus:ring-[#004649]/20"
          >
            <option value="all">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
            ))}
          </select>

          {/* Auto Fees — teal gradient */}
          <button
            onClick={handleAutoRun}
            disabled={autoRunPending}
            title="Create monthly fees + mark overdue"
            className="flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-3 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(0,70,73,0.2)] transition-all duration-200 hover:scale-105 hover:shadow-[0_6px_16px_rgba(0,70,73,0.3)] active:scale-[0.98] disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${autoRunPending ? 'animate-spin' : ''}`} />
            Auto Fees
          </button>

          {/* Add Fee — orange gradient */}
          <button
            onClick={() => setShowModal(true)}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#ff8c42] to-[#e67e22] px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(255,140,66,0.35)] transition-all duration-200 hover:scale-105 hover:shadow-[0_6px_16px_rgba(255,140,66,0.45)] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add Fee
          </button>
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
    dueDate: new Date().toISOString().slice(0, 10)
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
