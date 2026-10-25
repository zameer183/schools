'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PrintButton } from '@/components/reports/print-button';
import { formatCurrency } from '@/lib/utils';
import {
  ChevronLeft,
  Download,
  Share2,
  Check,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  CreditCard,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Receipt,
  RefreshCw,
  ArrowUpDown,
  Calendar,
  Sparkles
} from 'lucide-react';

type Payment = {
  id: string;
  amountPaid: number;
  method: string;
  paidAt: string;
  transactionRef: string | null;
};

type FeeRecord = {
  id: string;
  title: string;
  dueDate: string;
  amount: number;
  discount: number;
  status: string;
  payments: Payment[];
};

type StudentData = {
  id: string;
  admissionNo: string;
  whatsApp: string | null;
  guardianPhone: string | null;
  joinDate?: string | null;
  createdAt?: string | null;
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

// ─── Helpers & Constants ──────────────────────────────────────────────────────

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function fmtDate(v?: string | null): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

const STATUS_STYLE: Record<string, { badge: string; bar: string; label: string }> = {
  PAID:    { badge: 'bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]', bar: 'bg-[#22c55e]', label: 'PAID' },
  PENDING: { badge: 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]', bar: 'bg-[#f59e0b]', label: 'PENDING' },
  PARTIAL: { badge: 'bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]', bar: 'bg-[#3b82f6]', label: 'PARTIAL' },
  OVERDUE: { badge: 'bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca]', bar: 'bg-[#ef4444]', label: 'OVERDUE' },
};

const METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'ONLINE'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const FEE_CATEGORIES = [
  { id: 'TUITION', label: 'Monthly Tuition Fee' },
  { id: 'ADMISSION', label: 'Admission Fee' },
  { id: 'ANNUAL', label: 'Annual / Registration Charges' },
  { id: 'EXAM', label: 'Exam Fee' },
  { id: 'BOOKS', label: 'Books & Uniform' },
  { id: 'CUSTOM', label: 'Custom / Other Fee' },
] as const;

// ─── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[#e2e8f0] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] px-5 py-4 bg-[#f8fafc]">
          <h3 className="font-bold text-[#0f172a] text-base">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-[#94a3b8] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 max-h-[85vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const INPUT = 'h-10 w-full rounded-xl bg-[#f8fafc] border border-[#cbd5e1] px-3 text-sm text-[#0f172a] outline-none focus:ring-2 focus:ring-[#004649]/20 focus:border-[#004649] transition';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudentFeesClient({
  student,
  fees: initialFees
}: Props) {
  const router = useRouter();
  const [fees, setFees] = useState<FeeRecord[]>(initialFees);

  // Sorting: oldest first by default (June -> July -> August -> Sep -> Oct)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Derived totals from live state
  const totalAssigned = fees.reduce((s, f) => s + (f.amount - f.discount), 0);
  const totalPaid = fees.reduce((s, f) => s + f.payments.reduce((a, p) => a + p.amountPaid, 0), 0);
  const totalRemaining = Math.max(totalAssigned - totalPaid, 0);
  const totalOverdue = totalRemaining;

  // Unpaid fees with remaining amounts
  const unpaidFees = useMemo(() => {
    return fees
      .map(f => {
        const net = f.amount - f.discount;
        const paid = f.payments.reduce((a, p) => a + p.amountPaid, 0);
        const remaining = Math.max(net - paid, 0);
        return { ...f, net, paid, remaining };
      })
      .filter(f => f.remaining > 0);
  }, [fees]);

  const unpaidMonthsCount = unpaidFees.length;
  const classInfo = student.class ? `${student.class.name} ${student.class.section || ''}` : 'N/A';
  const waPhone = (student.whatsApp || student.guardianPhone || '').replace(/[^0-9+]/g, '');

  // Sorted fees list
  const sortedFees = useMemo(() => {
    return [...fees].sort((a, b) => {
      const tA = new Date(a.dueDate).getTime();
      const tB = new Date(b.dueDate).getTime();
      return sortOrder === 'asc' ? tA - tB : tB - tA;
    });
  }, [fees, sortOrder]);

  // Expanded payments
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Student-level Collect Fee Modal
  const [showStudentPay, setShowStudentPay] = useState(false);
  const [studentPayAmount, setStudentPayAmount] = useState('');
  const [studentPayMethod, setStudentPayMethod] = useState('CASH');
  const [studentPayRef, setStudentPayRef] = useState('');
  const [studentPaySaving, setStudentPaySaving] = useState(false);
  const [studentPayErr, setStudentPayErr] = useState('');

  // Add Fee Modal state
  const [showAdd, setShowAdd] = useState(false);
  const [addCategory, setAddCategory] = useState<'TUITION' | 'ADMISSION' | 'ANNUAL' | 'EXAM' | 'BOOKS' | 'CUSTOM'>('TUITION');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [customTitle, setCustomTitle] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addDiscount, setAddDiscount] = useState('0');
  const [addDueDate, setAddDueDate] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addErr, setAddErr] = useState('');

  // Typical student tuition fee (used for prefill)
  const typicalTuitionAmount = useMemo(() => {
    const tuitionFee = fees.find(f => f.title.toLowerCase().includes('tuition') || f.title.toLowerCase().includes('monthly'));
    return tuitionFee ? String(tuitionFee.amount) : '1500';
  }, [fees]);

  // Initialize or re-calculate Add Fee Form when category, month, or year changes
  useEffect(() => {
    if (addCategory === 'TUITION') {
      const monthStr = String(selectedMonth + 1).padStart(2, '0');
      setAddDueDate(`${selectedYear}-${monthStr}-01`);
      if (!addAmount) setAddAmount(typicalTuitionAmount);
    } else if (addCategory === 'ADMISSION') {
      const today = new Date().toISOString().slice(0, 10);
      setAddDueDate(today);
      if (!addAmount) setAddAmount('5000');
    } else if (addCategory === 'ANNUAL') {
      setAddDueDate(`${selectedYear}-01-01`);
      if (!addAmount) setAddAmount('3000');
    } else if (addCategory === 'EXAM') {
      const today = new Date().toISOString().slice(0, 10);
      setAddDueDate(today);
      if (!addAmount) setAddAmount('1000');
    } else if (addCategory === 'BOOKS') {
      const today = new Date().toISOString().slice(0, 10);
      setAddDueDate(today);
      if (!addAmount) setAddAmount('2000');
    }
  }, [addCategory, selectedMonth, selectedYear, typicalTuitionAmount]);

  // Computed title for Add Fee
  const computedAddTitle = useMemo(() => {
    if (addCategory === 'TUITION') {
      return `Monthly Tuition Fee - ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    }
    if (addCategory === 'ADMISSION') {
      return `Admission Fee - ${student.user.fullName}`;
    }
    if (addCategory === 'ANNUAL') {
      return `Annual Charges - ${selectedYear}`;
    }
    if (addCategory === 'EXAM') {
      return `Exam Fee - ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    }
    if (addCategory === 'BOOKS') {
      return 'Books & Uniform Fee';
    }
    return customTitle.trim();
  }, [addCategory, selectedMonth, selectedYear, student.user.fullName, customTitle]);

  // Edit fee modal
  const [editTarget, setEditTarget] = useState<FeeRecord | null>(null);
  const [editForm, setEditForm] = useState({ title: '', amount: '', discount: '', dueDate: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState('');

  // Delete fee confirm
  const [deleteTarget, setDeleteTarget] = useState<FeeRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Single voucher payment modal
  const [payTarget, setPayTarget] = useState<FeeRecord | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'CASH', ref: '' });
  const [paySaving, setPaySaving] = useState(false);
  const [payErr, setPayErr] = useState('');

  // Live preview of student payment allocation (oldest first)
  const previewAllocations = useMemo(() => {
    const amt = Number(studentPayAmount);
    if (!amt || amt <= 0) return [];
    let remainingToAllocate = amt;
    // Sort oldest first (dueDate asc)
    const sorted = [...unpaidFees].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const res: Array<{ id: string; title: string; allocated: number; willBeFull: boolean; leftover: number }> = [];
    for (const f of sorted) {
      if (remainingToAllocate <= 0) break;
      const take = Math.min(remainingToAllocate, f.remaining);
      const leftover = f.remaining - take;
      res.push({
        id: f.id,
        title: f.title,
        allocated: take,
        willBeFull: leftover === 0,
        leftover
      });
      remainingToAllocate -= take;
    }
    return res;
  }, [studentPayAmount, unpaidFees]);

  const excessPayment = useMemo(() => {
    const amt = Number(studentPayAmount || 0);
    return Math.max(amt - totalRemaining, 0);
  }, [studentPayAmount, totalRemaining]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleSyncFees() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', studentId: student.id })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to sync missing fees.');
        return;
      }

      // Reload updated fees
      const refreshed = await fetch(`/api/fees?studentId=${student.id}`).then(r => r.json()).catch(() => null);
      if (Array.isArray(refreshed)) {
        setFees(refreshed.map((f: any) => ({
          ...f,
          amount: Number(f.amount),
          discount: Number(f.discount),
          payments: (f.payments || []).map((p: any) => ({ ...p, amountPaid: Number(p.amountPaid) }))
        })));
      }
      router.refresh();
      const count = data.feesCreated ?? 0;
      setSyncMessage(count > 0 ? `Synced successfully! Created ${count} missing fee voucher(s).` : 'All monthly fee vouchers are already up to date!');
      setTimeout(() => setSyncMessage(null), 5000);
    } catch {
      alert('Network error while syncing fees. Please try again.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleStudentPayment() {
    const amt = Number(studentPayAmount);
    if (!amt || amt <= 0) {
      setStudentPayErr('Please enter a valid payment amount.');
      return;
    }
    setStudentPaySaving(true);
    setStudentPayErr('');
    try {
      const res = await fetch('/api/fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          amountPaid: amt,
          method: studentPayMethod,
          transactionRef: studentPayRef || null,
          allocateToOldest: true
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setStudentPayErr(data.error ?? 'Failed to record student payment.');
        return;
      }
      setShowStudentPay(false);
      setStudentPayAmount('');
      setStudentPayRef('');
      router.refresh();

      // Refresh local fees state
      const refreshed = await fetch(`/api/fees?studentId=${student.id}`).then(r => r.json()).catch(() => null);
      if (Array.isArray(refreshed)) {
        setFees(refreshed.map((f: any) => ({
          ...f,
          amount: Number(f.amount),
          discount: Number(f.discount),
          payments: (f.payments || []).map((p: any) => ({ ...p, amountPaid: Number(p.amountPaid) }))
        })));
      }
    } catch {
      setStudentPayErr('Network error. Please try again.');
    } finally {
      setStudentPaySaving(false);
    }
  }

  function openAddModal() {
    setAddCategory('TUITION');
    setSelectedMonth(new Date().getMonth());
    setSelectedYear(new Date().getFullYear());
    setCustomTitle('');
    setAddAmount(typicalTuitionAmount);
    setAddDiscount('0');
    const monthStr = String(new Date().getMonth() + 1).padStart(2, '0');
    setAddDueDate(`${new Date().getFullYear()}-${monthStr}-01`);
    setAddErr('');
    setShowAdd(true);
  }

  async function handleAddFee() {
    const finalTitle = computedAddTitle;
    if (!finalTitle || !addAmount || !addDueDate) {
      setAddErr('Title, amount, and due date are required.');
      return;
    }
    setAddSaving(true);
    setAddErr('');
    try {
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          title: finalTitle,
          amount: Number(addAmount),
          discount: Number(addDiscount || 0),
          dueDate: addDueDate,
          feeCategory: addCategory,
          feeType: addCategory === 'TUITION' ? 'MONTHLY' : 'ONE_TIME'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setAddErr(data.error ?? 'Failed to create fee voucher.');
        return;
      }
      setShowAdd(false);
      router.refresh();

      // Refresh fees
      const refreshed = await fetch(`/api/fees?studentId=${student.id}`).then(r => r.json()).catch(() => null);
      if (Array.isArray(refreshed)) {
        setFees(refreshed.map((f: any) => ({
          ...f,
          amount: Number(f.amount),
          discount: Number(f.discount),
          payments: (f.payments || []).map((p: any) => ({ ...p, amountPaid: Number(p.amountPaid) }))
        })));
      }
    } catch {
      setAddErr('Network error. Please try again.');
    } finally {
      setAddSaving(false);
    }
  }

  function openEdit(f: FeeRecord) {
    setEditTarget(f);
    setEditForm({
      title: f.title,
      amount: String(f.amount),
      discount: String(f.discount),
      dueDate: f.dueDate.slice(0, 10)
    });
    setEditErr('');
  }

  async function handleEditFee() {
    if (!editTarget) return;
    setEditSaving(true);
    setEditErr('');
    try {
      const res = await fetch('/api/fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _edit: true,
          feeId: editTarget.id,
          title: editForm.title,
          amount: Number(editForm.amount),
          discount: Number(editForm.discount),
          dueDate: editForm.dueDate
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setEditErr(data.error ?? 'Failed to update fee.');
        return;
      }
      setEditTarget(null);
      setFees(prev => prev.map(f => f.id === editTarget.id
        ? { ...f, title: editForm.title, amount: Number(editForm.amount), discount: Number(editForm.discount), dueDate: new Date(editForm.dueDate).toISOString() }
        : f
      ));
      router.refresh();
    } catch {
      setEditErr('Network error. Please try again.');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteFee() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/fees?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        setFees(prev => prev.filter(f => f.id !== deleteTarget.id));
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddPayment() {
    if (!payTarget || !payForm.amount) {
      setPayErr('Please enter the payment amount.');
      return;
    }
    setPaySaving(true);
    setPayErr('');
    try {
      const res = await fetch('/api/fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeId: payTarget.id,
          amountPaid: Number(payForm.amount),
          method: payForm.method,
          transactionRef: payForm.ref || null,
          allocateToOldest: false
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setPayErr(data.error ?? 'Failed to record payment.');
        return;
      }
      setPayTarget(null);
      setPayForm({ amount: '', method: 'CASH', ref: '' });
      router.refresh();

      // Refresh fees
      const refreshed = await fetch(`/api/fees?studentId=${student.id}`).then(r => r.json()).catch(() => null);
      if (Array.isArray(refreshed)) {
        setFees(refreshed.map((f: any) => ({
          ...f,
          amount: Number(f.amount),
          discount: Number(f.discount),
          payments: (f.payments || []).map((p: any) => ({ ...p, amountPaid: Number(p.amountPaid) }))
        })));
      }
    } catch {
      setPayErr('Network error. Please try again.');
    } finally {
      setPaySaving(false);
    }
  }

  async function handleDeletePayment(feeId: string, paymentId: string) {
    const res = await fetch(`/api/fees?paymentId=${paymentId}`, { method: 'DELETE' });
    if (res.ok) {
      router.refresh();
      setFees(prev => prev.map(f => {
        if (f.id !== feeId) return f;
        const newPayments = f.payments.filter(p => p.id !== paymentId);
        const net = f.amount - f.discount;
        const paid = newPayments.reduce((s, p) => s + p.amountPaid, 0);
        const status = paid >= net ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';
        return { ...f, payments: newPayments, status };
      }));
    }
  }

  const handleDownload = () => {
    const header = [
      `Student: ${student.user.fullName}`,
      `Admission No: ${student.admissionNo}`,
      `Class: ${classInfo}`,
      `Total Assigned: ${formatCurrency(totalAssigned)}`,
      `Total Paid: ${formatCurrency(totalPaid)}`,
      `Total Remaining / Due: ${formatCurrency(totalRemaining)}`,
      `Unpaid Months Count: ${unpaidMonthsCount}`,
      ''
    ].join('\n');
    const rows = [
      ['Title', 'Due Date', 'Status', 'Net Amount (PKR)', 'Paid (PKR)', 'Remaining (PKR)'],
      ...sortedFees.map((f) => {
        const net = f.amount - f.discount;
        const paid = f.payments.reduce((s, p) => s + p.amountPaid, 0);
        return [f.title, fmtDate(f.dueDate), f.status, net.toFixed(0), paid.toFixed(0), Math.max(net - paid, 0).toFixed(0)];
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
    const unpaidList = unpaidFees.map(f => `• ${f.title}: ${formatCurrency(f.remaining)} remaining`).join('\n');
    const msg = [
      `Fee Statement for: ${student.user.fullName} (${student.admissionNo})`,
      `Class: ${classInfo}`,
      '',
      `📌 Total Assigned: ${formatCurrency(totalAssigned)}`,
      `📌 Total Paid: ${formatCurrency(totalPaid)}`,
      `📌 Outstanding Balance: ${formatCurrency(totalRemaining)}`,
      unpaidMonthsCount > 0 ? `📌 Unpaid Months: ${unpaidMonthsCount} month(s)` : '📌 Status: All dues cleared',
      '',
      unpaidFees.length > 0 ? `Pending Breakdown:\n${unpaidList}\n` : '',
      'Please submit the pending fee at your earliest convenience. Thank you!',
      '— Administration'
    ].filter(Boolean).join('\n');

    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafc] p-3 sm:p-6 pb-20">
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-5">

        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href={`/admin/students/${student.id}`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#004649] hover:text-[#1b5e62] transition"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Profile</span>
          </Link>
          <span className="text-xs text-[#64748b]">
            Admission No: <strong className="font-mono text-[#0f172a]">{student.admissionNo}</strong>
          </span>
        </div>

        {/* Student Identity Card */}
        <div className="rounded-2xl bg-white border border-[#e2e8f0] shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#004649] to-[#1b5e62] text-base sm:text-lg font-bold text-white shadow-xs">
              {initials(student.user.fullName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold text-[#0f172a] truncate">{student.user.fullName}</h1>
                {student.user.isActive ? (
                  <span className="rounded-full bg-[#dcfce7] border border-[#bbf7d0] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#15803d]">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-[#fee2e2] border border-[#fecaca] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#b91c1c]">
                    Inactive
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs sm:text-sm text-[#64748b] truncate">
                {classInfo} • Admission: <span className="font-semibold text-[#0f172a]">{student.admissionNo}</span>
                {student.joinDate && (
                  <span className="ml-2 pl-2 border-l border-[#cbd5e1] text-[#004649] font-medium">
                    Joined: {fmtDate(student.joinDate)}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Sync message alert if any */}
        {syncMessage && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 flex items-center justify-between text-xs text-emerald-800 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{syncMessage}</span>
            </div>
            <button onClick={() => setSyncMessage(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ══ GRAND TOTAL DUE BANNER ══════════════════════════════════════════ */}
        <div className={`rounded-2xl border p-4 sm:p-6 shadow-sm transition-all ${
          totalRemaining > 0
            ? 'border-amber-300 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white'
            : 'border-emerald-300 bg-gradient-to-br from-emerald-50/80 via-white to-white'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  totalRemaining > 0
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {totalRemaining > 0 ? (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                      <span>{unpaidMonthsCount} Month{unpaidMonthsCount === 1 ? '' : 's'} Due</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                      <span>All Fees Paid (No Dues)</span>
                    </>
                  )}
                </span>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                  Total Outstanding Balance
                </p>
                <p className={`text-2xl sm:text-4xl font-black tracking-tight mt-0.5 ${
                  totalRemaining > 0 ? 'text-[#b45309]' : 'text-[#15803d]'
                }`}>
                  {formatCurrency(totalRemaining)}
                </p>
              </div>

              {unpaidFees.length > 0 && (
                <div className="pt-2">
                  <p className="text-[11px] font-semibold text-[#64748b] mb-1.5">Outstanding Vouchers Breakdown:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {unpaidFees.map(f => (
                      <span key={f.id} className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-900 shadow-2xs">
                        <span>{f.title}:</span>
                        <strong className="font-bold text-[#b45309]">{formatCurrency(f.remaining)}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Direct Fee Collection CTA */}
            <div className="flex flex-col sm:flex-col gap-2 shrink-0">
              <button
                onClick={() => {
                  setStudentPayErr('');
                  setStudentPayAmount(String(totalRemaining > 0 ? totalRemaining : ''));
                  setShowStudentPay(true);
                }}
                disabled={totalRemaining <= 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#004649] to-[#1b5e62] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-sm hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard className="h-4 w-4" />
                <span>Collect Fee</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={openAddModal}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc] active:scale-[0.98] transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Fee</span>
                </button>
                <button
                  onClick={handleSyncFees}
                  disabled={syncing}
                  title="Auto-generate any missing monthly fee vouchers starting from student's join date up to today"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50/70 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100 active:scale-[0.98] transition disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span className="hidden xs:inline">Sync Missing Months</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ══ 4 STAT SUMMARY CARDS ══════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="rounded-xl bg-white border border-[#e2e8f0] p-3.5 sm:p-4 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Total Assigned</p>
            <p className="mt-1 text-lg sm:text-2xl font-bold text-[#0f172a]">{formatCurrency(totalAssigned)}</p>
          </div>
          <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3.5 sm:p-4 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#15803d]">Paid</p>
            <p className="mt-1 text-lg sm:text-2xl font-bold text-[#15803d]">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="rounded-xl bg-amber-50/70 border border-amber-100 p-3.5 sm:p-4 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#b45309]">Remaining</p>
            <p className="mt-1 text-lg sm:text-2xl font-bold text-[#b45309]">{formatCurrency(totalRemaining)}</p>
          </div>
          <div className="rounded-xl bg-red-50/70 border border-red-100 p-3.5 sm:p-4 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#b91c1c]">Total Due</p>
            <p className="mt-1 text-lg sm:text-2xl font-bold text-[#b91c1c]">{formatCurrency(totalOverdue)}</p>
          </div>
        </div>

        {/* ══ FEE LEDGER / MONTHLY VOUCHERS ══════════════════════════════════ */}
        <div className="rounded-2xl bg-white border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="border-b border-[#e2e8f0] px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 bg-[#f8fafc]">
            <div>
              <h2 className="font-bold text-[#0f172a] text-sm sm:text-base">Fee Ledger</h2>
              <p className="text-xs text-[#64748b]">Monthly fee vouchers and payment records</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-1.5 rounded-xl border border-[#cbd5e1] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#f1f5f9] transition"
                title="Toggle Chronological Sorting"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-[#64748b]" />
                <span>{sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}</span>
              </button>
              <button
                onClick={handleSyncFees}
                disabled={syncing}
                className="flex items-center gap-1.5 rounded-xl border border-[#004649]/20 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-[#004649] hover:bg-teal-100 transition"
                title="Auto-sync all missing monthly fee vouchers from student's join date"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Sync Missing</span>
              </button>
              <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 rounded-xl bg-[#004649] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1b5e62] transition shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Fee</span>
              </button>
            </div>
          </div>

          {fees.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Receipt className="h-10 w-10 text-[#cbd5e1]" />
              <p className="text-sm font-semibold text-[#64748b]">No fee vouchers found for this student.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleSyncFees}
                  disabled={syncing}
                  className="rounded-xl bg-teal-50 border border-teal-200 px-3 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-100 transition"
                >
                  {syncing ? 'Syncing...' : 'Sync All Missing Months'}
                </button>
                <button
                  onClick={openAddModal}
                  className="rounded-xl bg-[#004649] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1b5e62] transition"
                >
                  + Add First Fee
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#f1f5f9]">
              {sortedFees.map((f) => {
                const net = f.amount - f.discount;
                const paid = f.payments.reduce((s, p) => s + p.amountPaid, 0);
                const remaining = Math.max(net - paid, 0);
                const paidPct = net > 0 ? Math.min(Math.round((paid / net) * 100), 100) : 100;
                const isPaid = remaining <= 0 || f.status === 'PAID';
                const style = STATUS_STYLE[f.status.toUpperCase()] ?? { badge: 'bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]', bar: 'bg-[#94a3b8]', label: f.status };
                const isExpanded = expanded.has(f.id);

                return (
                  <div key={f.id} className="p-4 sm:p-5 space-y-3 hover:bg-[#fbfcfd] transition">
                    
                    {/* Voucher Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm sm:text-base font-bold text-[#0f172a]">{f.title}</p>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${style.badge}`}>
                            {style.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#64748b]">Due Date: {fmtDate(f.dueDate)}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => openEdit(f)}
                          title="Edit Fee"
                          className="p-1.5 rounded-lg text-[#64748b] hover:text-[#004649] hover:bg-[#e0eff0] transition"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(f)}
                          title="Delete Fee"
                          className="p-1.5 rounded-lg text-[#64748b] hover:text-[#b91c1c] hover:bg-[#fee2e2] transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-[#64748b]">
                        <span>Payment Progress: {paidPct}%</span>
                        {remaining > 0 && paid > 0 && (
                          <span className="text-[#3b82f6] font-semibold">Partially Paid ({formatCurrency(paid)} paid / {formatCurrency(remaining)} remaining)</span>
                        )}
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#f1f5f9] overflow-hidden border border-[#e2e8f0]/80">
                        <div className={`h-full rounded-full transition-all ${style.bar}`} style={{ width: `${paidPct}%` }} />
                      </div>
                    </div>

                    {/* Amounts Breakdown Grid */}
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-2.5 text-xs">
                      <div>
                        <p className="text-[#64748b] text-[10px] uppercase font-bold">Net Amount</p>
                        <p className="font-bold text-[#0f172a] text-xs sm:text-sm mt-0.5">{formatCurrency(net)}</p>
                      </div>
                      <div>
                        <p className="text-[#15803d] text-[10px] uppercase font-bold">Paid</p>
                        <p className="font-bold text-[#15803d] text-xs sm:text-sm mt-0.5">{formatCurrency(paid)}</p>
                      </div>
                      <div>
                        <p className="text-[#b45309] text-[10px] uppercase font-bold">Remaining</p>
                        <p className={`font-bold text-xs sm:text-sm mt-0.5 ${remaining > 0 ? 'text-[#b45309]' : 'text-[#64748b]'}`}>
                          {formatCurrency(remaining)}
                        </p>
                      </div>
                    </div>

                    {/* Action Row - Record Payment ONLY shown if not fully paid */}
                    <div className="flex gap-2 pt-1">
                      {!isPaid && remaining > 0 ? (
                        <button
                          onClick={() => {
                            setPayTarget(f);
                            setPayErr('');
                            setPayForm({ amount: String(remaining), method: 'CASH', ref: '' });
                          }}
                          className="h-9 flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#004649] text-white text-xs font-semibold hover:bg-[#1b5e62] transition shadow-2xs"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>Record Payment</span>
                        </button>
                      ) : (
                        <div className="h-9 flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Paid in Full</span>
                        </div>
                      )}

                      {f.payments.length > 0 && (
                        <button
                          onClick={() =>
                            setExpanded((prev) => {
                              const s = new Set(prev);
                              if (s.has(f.id)) {
                                s.delete(f.id);
                              } else {
                                s.add(f.id);
                              }
                              return s;
                            })
                          }
                          className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-[#f1f5f9] border border-[#cbd5e1] text-[#334155] text-xs font-semibold hover:bg-[#e2e8f0] transition"
                        >
                          <Receipt className="h-3.5 w-3.5 text-[#64748b]" />
                          <span>{f.payments.length} {f.payments.length === 1 ? 'Payment' : 'Payments'}</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* Payment History Accordion */}
                    {isExpanded && f.payments.length > 0 && (
                      <div className="rounded-xl bg-[#f8fafc] border border-[#e2e8f0] divide-y divide-[#e2e8f0] mt-2">
                        <div className="px-3 py-2 text-[11px] font-bold text-[#64748b] bg-[#f1f5f9]/60">
                          Payment History
                        </div>
                        {f.payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between px-3 py-2.5 gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-[#0f172a]">{formatCurrency(p.amountPaid)}</p>
                              <p className="text-[10px] text-[#64748b]">
                                {p.method} • {fmtDate(p.paidAt)}
                                {p.transactionRef ? ` • Ref: ${p.transactionRef}` : ''}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeletePayment(f.id, p.id)}
                              title="Delete Payment Record"
                              className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#b91c1c] hover:bg-[#fee2e2] transition shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ══ BOTTOM ACTION BAR ══════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row gap-2.5 print:hidden">
          <PrintButton label="Print / PDF Voucher" orientation="portrait" />
          <button
            onClick={handleDownload}
            className="h-11 flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#004649] text-white font-semibold text-xs sm:text-sm hover:bg-[#1b5e62] transition shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span>Download CSV</span>
          </button>
          <button
            onClick={handleShareSummary}
            disabled={!waPhone}
            className={`h-11 flex flex-1 items-center justify-center gap-2 rounded-xl font-semibold text-xs sm:text-sm transition shadow-xs ${
              waPhone
                ? 'bg-[#25d366] text-white hover:brightness-105 active:scale-[0.98]'
                : 'bg-[#f1f5f9] text-[#94a3b8] cursor-not-allowed opacity-60'
            }`}
          >
            <Share2 className="h-4 w-4" />
            <span>WhatsApp Statement</span>
          </button>
        </div>
      </div>

      {/* ── MODAL 1: STUDENT LEVEL FEE COLLECTION (BULK / OLDEST-FIRST) ─── */}
      {showStudentPay && (
        <Modal title="Collect Student Fee" onClose={() => setShowStudentPay(false)}>
          <div className="space-y-4">
            
            {/* Student Info Box */}
            <div className="rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-3.5 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748b]">Student:</span>
                <strong className="text-[#0f172a]">{student.user.fullName} ({student.admissionNo})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Class:</span>
                <span className="font-semibold text-[#0f172a]">{classInfo}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#e2e8f0]">
                <span className="text-[#b45309] font-bold">Total Outstanding:</span>
                <strong className="text-base text-[#b45309] font-black">{formatCurrency(totalRemaining)}</strong>
              </div>
              {unpaidMonthsCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Unpaid Months:</span>
                  <span className="font-bold text-amber-800">{unpaidMonthsCount} Month(s)</span>
                </div>
              )}
            </div>

            {/* Quick Amount Preset Buttons */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] mb-1.5">Quick Presets</p>
              <div className="flex flex-wrap gap-1.5">
                {totalRemaining > 0 && (
                  <button
                    type="button"
                    onClick={() => setStudentPayAmount(String(totalRemaining))}
                    className="rounded-lg bg-amber-50 border border-amber-300 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 transition"
                  >
                    Full Balance: {formatCurrency(totalRemaining)}
                  </button>
                )}
                {unpaidFees.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStudentPayAmount(String(unpaidFees[0].remaining))}
                    className="rounded-lg bg-white border border-[#cbd5e1] px-2.5 py-1 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc] transition"
                  >
                    1 Month: {formatCurrency(unpaidFees[0].remaining)}
                  </button>
                )}
                {unpaidFees.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setStudentPayAmount(String(unpaidFees[0].remaining + unpaidFees[1].remaining))}
                    className="rounded-lg bg-white border border-[#cbd5e1] px-2.5 py-1 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc] transition"
                  >
                    2 Months: {formatCurrency(unpaidFees[0].remaining + unpaidFees[1].remaining)}
                  </button>
                )}
              </div>
            </div>

            {/* Amount input */}
            <Field label="Amount Paid (PKR)">
              <input
                className={INPUT}
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 1500 or 3000"
                value={studentPayAmount}
                onChange={(e) => setStudentPayAmount(e.target.value)}
              />
            </Field>

            {/* Live Allocation Preview */}
            {previewAllocations.length > 0 && (
              <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-3 text-xs space-y-1.5">
                <p className="font-bold text-blue-950 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5 text-blue-700" />
                  <span>Payment Allocation (Oldest Vouchers First):</span>
                </p>
                <div className="divide-y divide-blue-200/60">
                  {previewAllocations.map(p => (
                    <div key={p.id} className="py-1 flex justify-between items-center text-blue-900">
                      <span className="truncate pr-2">{p.title}:</span>
                      <span className="font-semibold shrink-0">
                        {formatCurrency(p.allocated)} {p.willBeFull ? '✓ Paid in Full' : `(Partial - ${formatCurrency(p.leftover)} remaining)`}
                      </span>
                    </div>
                  ))}
                </div>
                {excessPayment > 0 && (
                  <p className="pt-1 border-t border-blue-200 text-emerald-800 font-bold">
                    Excess / Advance Amount: {formatCurrency(excessPayment)}
                  </p>
                )}
              </div>
            )}

            {/* Method selection */}
            <Field label="Payment Method">
              <select
                className={INPUT}
                value={studentPayMethod}
                onChange={(e) => setStudentPayMethod(e.target.value)}
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </Field>

            {/* Transaction Ref */}
            <Field label="Receipt # / Reference (Optional)">
              <input
                className={INPUT}
                placeholder="e.g. Receipt # 1045 or Bank Ref"
                value={studentPayRef}
                onChange={(e) => setStudentPayRef(e.target.value)}
              />
            </Field>

            {studentPayErr && <p className="text-xs text-[#b91c1c] font-semibold">{studentPayErr}</p>}

            <button
              onClick={handleStudentPayment}
              disabled={studentPaySaving || !studentPayAmount || Number(studentPayAmount) <= 0}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-[#004649] to-[#1b5e62] text-white font-bold text-sm hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
            >
              {studentPaySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>Confirm Payment</span>
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL 2: ADD SINGLE FEE (SMART TITLE DROPDOWN) ────────────────── */}
      {showAdd && (
        <Modal title="Add New Fee Voucher" onClose={() => setShowAdd(false)}>
          <div className="space-y-3.5">
            
            {/* Fee Category Dropdown */}
            <Field label="Fee Type">
              <select
                className={INPUT}
                value={addCategory}
                onChange={e => setAddCategory(e.target.value as any)}
              >
                {FEE_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </Field>

            {/* If Tuition Fee: Show Month and Year dropdowns */}
            {addCategory === 'TUITION' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Month">
                  <select
                    className={INPUT}
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Year">
                  <select
                    className={INPUT}
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            {/* If Custom: Show text input */}
            {addCategory === 'CUSTOM' && (
              <Field label="Custom Fee Title">
                <input
                  className={INPUT}
                  placeholder="e.g. Sports Day Charges or Lab Fee"
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                />
              </Field>
            )}

            {/* Generated Title Preview Banner */}
            <div className="rounded-xl bg-teal-50/60 border border-teal-200 p-2.5 text-xs text-teal-950 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-700 shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-teal-800">Title: </span>
                <span className="font-bold text-[#004649]">{computedAddTitle || '(Enter title above)'}</span>
              </div>
            </div>

            {/* Amount and Discount */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (PKR)">
                <input
                  className={INPUT}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="1500"
                  value={addAmount}
                  onChange={e => setAddAmount(e.target.value)}
                />
              </Field>
              <Field label="Discount (PKR)">
                <input
                  className={INPUT}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={addDiscount}
                  onChange={e => setAddDiscount(e.target.value)}
                />
              </Field>
            </div>

            {/* Due Date */}
            <Field label="Due Date">
              <input
                className={INPUT}
                type="date"
                value={addDueDate}
                onChange={e => setAddDueDate(e.target.value)}
              />
            </Field>

            {addErr && <p className="text-xs text-[#b91c1c] font-medium">{addErr}</p>}

            <button
              onClick={handleAddFee}
              disabled={addSaving || !computedAddTitle || !addAmount}
              className="mt-2 flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-[#004649] text-white font-semibold hover:bg-[#1b5e62] transition disabled:opacity-60"
            >
              {addSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Create Fee Voucher</span>
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL 3: EDIT FEE ──────────────────────────────────────────────── */}
      {editTarget && (
        <Modal title="Edit Fee Voucher" onClose={() => setEditTarget(null)}>
          <div className="space-y-3">
            <Field label="Title">
              <input
                className={INPUT}
                value={editForm.title}
                onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (PKR)">
                <input
                  className={INPUT}
                  type="number"
                  min="0"
                  step="1"
                  value={editForm.amount}
                  onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))}
                />
              </Field>
              <Field label="Discount (PKR)">
                <input
                  className={INPUT}
                  type="number"
                  min="0"
                  step="1"
                  value={editForm.discount}
                  onChange={e => setEditForm(p => ({ ...p, discount: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Due Date">
              <input
                className={INPUT}
                type="date"
                value={editForm.dueDate}
                onChange={e => setEditForm(p => ({ ...p, dueDate: e.target.value }))}
              />
            </Field>
            {editErr && <p className="text-xs text-[#b91c1c] font-medium">{editErr}</p>}
            <button
              onClick={handleEditFee}
              disabled={editSaving}
              className="mt-1 flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-[#004649] text-white font-semibold hover:bg-[#1b5e62] transition disabled:opacity-60"
            >
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>Save Changes</span>
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL 4: DELETE CONFIRM ────────────────────────────────────────── */}
      {deleteTarget && (
        <Modal title="Delete Fee Voucher?" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-[#64748b]">
              Are you sure you want to delete <strong className="text-[#0f172a]">{deleteTarget.title}</strong>? Any payment records associated with this voucher will also be deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 border border-[#cbd5e1] rounded-xl text-sm font-semibold text-[#334155] hover:bg-[#f8fafc] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteFee}
                disabled={deleting}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-[#b91c1c] text-white text-sm font-semibold hover:bg-[#991b1b] transition disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 5: SINGLE FEE VOUCHER PAYMENT ────────────────────────────── */}
      {payTarget && (
        <Modal title={`Record Payment — ${payTarget.title}`} onClose={() => setPayTarget(null)}>
          <div className="space-y-3">
            <Field label="Amount Paid (PKR)">
              <input
                className={INPUT}
                type="number"
                min="1"
                step="1"
                placeholder="0"
                value={payForm.amount}
                onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
              />
            </Field>
            <Field label="Payment Method">
              <select
                className={INPUT}
                value={payForm.method}
                onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}
              >
                {METHODS.map(m => (
                  <option key={m} value={m}>
                    {m.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Transaction Ref / Notes (Optional)">
              <input
                className={INPUT}
                placeholder="e.g. Receipt # 1045 or Bank Ref"
                value={payForm.ref}
                onChange={e => setPayForm(p => ({ ...p, ref: e.target.value }))}
              />
            </Field>
            {payErr && <p className="text-xs text-[#b91c1c] font-medium">{payErr}</p>}
            <button
              onClick={handleAddPayment}
              disabled={paySaving}
              className="mt-1 flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-[#004649] text-white font-semibold hover:bg-[#1b5e62] transition disabled:opacity-60"
            >
              {paySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>Record Payment</span>
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
