'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
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
  Wallet,
  Receipt
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function fmtDate(v: string): string {
  try {
    return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

const STATUS_STYLE: Record<string, { badge: string; bar: string; label: string }> = {
  PAID:    { badge: 'bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]', bar: 'bg-[#22c55e]', label: 'PAID (ادا شدہ)' },
  PENDING: { badge: 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]', bar: 'bg-[#f59e0b]', label: 'PENDING (غیر ادا)' },
  PARTIAL: { badge: 'bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]', bar: 'bg-[#3b82f6]', label: 'PARTIAL (جزوی ادا)' },
  OVERDUE: { badge: 'bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca]', bar: 'bg-[#ef4444]', label: 'OVERDUE (واجب الادا)' },
};

const METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'ONLINE'];

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

  // Expanded payments
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Student-level Collect Fee Modal
  const [showStudentPay, setShowStudentPay] = useState(false);
  const [studentPayAmount, setStudentPayAmount] = useState('');
  const [studentPayMethod, setStudentPayMethod] = useState('CASH');
  const [studentPayRef, setStudentPayRef] = useState('');
  const [studentPaySaving, setStudentPaySaving] = useState(false);
  const [studentPayErr, setStudentPayErr] = useState('');

  // Add fee modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ title: '', amount: '', discount: '0', dueDate: '' });
  const [addSaving, setAddSaving] = useState(false);
  const [addErr, setAddErr] = useState('');

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

  async function handleStudentPayment() {
    const amt = Number(studentPayAmount);
    if (!amt || amt <= 0) {
      setStudentPayErr('براہ کرم درست رقم درج کریں۔');
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
        setStudentPayErr(data.error ?? 'فیس وصولی ریکارڈ کرنے میں خرابی پیش آئی۔');
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
      setStudentPayErr('نیٹ ورک میں مسئلہ ہے۔ براہ کرم دوبارہ کوشش کریں۔');
    } finally {
      setStudentPaySaving(false);
    }
  }

  async function handleAddFee() {
    if (!addForm.title || !addForm.amount || !addForm.dueDate) {
      setAddErr('عنوان، رقم اور آخری تاریخ لازمی ہیں۔');
      return;
    }
    setAddSaving(true); setAddErr('');
    try {
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          title: addForm.title,
          amount: Number(addForm.amount),
          discount: Number(addForm.discount || 0),
          dueDate: addForm.dueDate
        })
      });
      const data = await res.json();
      if (!res.ok) { setAddErr(data.error ?? 'فیس شامل نہ ہو سکی۔'); return; }
      setShowAdd(false);
      setAddForm({ title: '', amount: '', discount: '0', dueDate: '' });
      router.refresh();
      setFees(prev => [...prev, { ...data, amount: Number(data.amount), discount: Number(data.discount), payments: [] }]);
    } catch { setAddErr('نیٹ ورک کا مسئلہ ہے۔'); }
    finally { setAddSaving(false); }
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
    setEditSaving(true); setEditErr('');
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
      if (!res.ok) { setEditErr(data.error ?? 'تبدیلی محفوظ نہ ہو سکی۔'); return; }
      setEditTarget(null);
      setFees(prev => prev.map(f => f.id === editTarget.id
        ? { ...f, title: editForm.title, amount: Number(editForm.amount), discount: Number(editForm.discount), dueDate: new Date(editForm.dueDate).toISOString() }
        : f
      ));
      router.refresh();
    } catch { setEditErr('نیٹ ورک کا مسئلہ ہے۔'); }
    finally { setEditSaving(false); }
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
    } finally { setDeleting(false); }
  }

  async function handleAddPayment() {
    if (!payTarget || !payForm.amount) { setPayErr('رقم درج کریں۔'); return; }
    setPaySaving(true); setPayErr('');
    try {
      const res = await fetch('/api/fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeId: payTarget.id,
          amountPaid: Number(payForm.amount),
          method: payForm.method,
          transactionRef: payForm.ref || null
        })
      });
      const data = await res.json();
      if (!res.ok) { setPayErr(data.error ?? 'فیس وصولی درج نہ ہو سکی۔'); return; }
      setPayTarget(null);
      setPayForm({ amount: '', method: 'CASH', ref: '' });
      router.refresh();
      setFees(prev => prev.map(f => {
        if (f.id !== payTarget.id) return f;
        const newPayments = [...f.payments, { id: data.id, amountPaid: Number(payForm.amount), method: payForm.method, paidAt: new Date().toISOString(), transactionRef: payForm.ref || null }];
        const net = f.amount - f.discount;
        const paid = newPayments.reduce((s, p) => s + p.amountPaid, 0);
        const status = paid >= net ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';
        return { ...f, payments: newPayments, status };
      }));
    } catch { setPayErr('نیٹ ورک کا مسئلہ ہے۔'); }
    finally { setPaySaving(false); }
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
      `Total Due / Remaining: ${formatCurrency(totalRemaining)}`,
      `Due Months Count: ${unpaidMonthsCount}`,
      ''
    ].join('\n');
    const rows = [
      ['Title', 'Due Date', 'Status', 'Net Amount (PKR)', 'Paid (PKR)', 'Remaining (PKR)'],
      ...fees.map((f) => {
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
    const unpaidList = unpaidFees.map(f => `• ${f.title}: ${formatCurrency(f.remaining)} باقی`).join('\n');
    const msg = [
      `محترم والدین! طالب علم ${student.user.fullName} (${student.admissionNo}) کی فیس کی سمری:`,
      '',
      `📌 کل لاگو شدہ فیس: ${formatCurrency(totalAssigned)}`,
      `📌 وصول شدہ فیس: ${formatCurrency(totalPaid)}`,
      `📌 کل واجب الادا رقم: ${formatCurrency(totalRemaining)}`,
      unpaidMonthsCount > 0 ? `📌 واجب الادا مہینے: ${unpaidMonthsCount} ماہ` : '📌 تمام واجبات ادا ہیں',
      '',
      unpaidFees.length > 0 ? `تفصیل واجبات:\n${unpaidList}\n` : '',
      'برائے مہربانی بقایا فیس بر وقت جمع کروائیں۔ شکریہ!',
      '— الحفظ اکیڈمی / ادارہ'
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
            <span>طالب علم پروفائل پر واپس جائیں (Back to Profile)</span>
          </Link>
          <span className="text-xs text-[#64748b]">
            Adm: <strong className="font-mono text-[#0f172a]">{student.admissionNo}</strong>
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
                {classInfo} • داخلہ نمبر: <span className="font-semibold text-[#0f172a]">{student.admissionNo}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ══ GRAND TOTAL DUE BANNER (PROMINENT SUMMARY) ══════════════════════ */}
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
                      <span>{unpaidMonthsCount} ماہ کی فیس واجب الادا ہے ({unpaidMonthsCount} Months Due)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                      <span>تمام فیسیں ادا شدہ ہیں (No Dues)</span>
                    </>
                  )}
                </span>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                  کل واجب الادا رقم (Total Outstanding Balance)
                </p>
                <p className={`text-2xl sm:text-4xl font-black tracking-tight mt-0.5 ${
                  totalRemaining > 0 ? 'text-[#b45309]' : 'text-[#15803d]'
                }`}>
                  {formatCurrency(totalRemaining)}
                </p>
              </div>

              {unpaidFees.length > 0 && (
                <div className="pt-2">
                  <p className="text-[11px] font-semibold text-[#64748b] mb-1.5">واجب الادا مہینوں کی تفصیل:</p>
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
            <div className="flex sm:flex-col gap-2 shrink-0">
              <button
                onClick={() => {
                  setStudentPayErr('');
                  setStudentPayAmount(String(totalRemaining > 0 ? totalRemaining : ''));
                  setShowStudentPay(true);
                }}
                disabled={totalRemaining <= 0}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#004649] to-[#1b5e62] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-sm hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard className="h-4 w-4" />
                <span>فیس وصول کریں (Collect Fee)</span>
              </button>
              <button
                onClick={() => { setShowAdd(true); setAddErr(''); }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc] active:scale-[0.98] transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>نئی فیس شامل کریں (Add Fee)</span>
              </button>
            </div>
          </div>
        </div>

        {/* ══ 4 STAT SUMMARY CARDS ══════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="rounded-xl bg-white border border-[#e2e8f0] p-3.5 sm:p-4 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Total Assigned (کل فیس)</p>
            <p className="mt-1 text-lg sm:text-2xl font-bold text-[#0f172a]">{formatCurrency(totalAssigned)}</p>
          </div>
          <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3.5 sm:p-4 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#15803d]">Paid (وصول شدہ)</p>
            <p className="mt-1 text-lg sm:text-2xl font-bold text-[#15803d]">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="rounded-xl bg-amber-50/70 border border-amber-100 p-3.5 sm:p-4 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#b45309]">Remaining (بقایا رقم)</p>
            <p className="mt-1 text-lg sm:text-2xl font-bold text-[#b45309]">{formatCurrency(totalRemaining)}</p>
          </div>
          <div className="rounded-xl bg-red-50/70 border border-red-100 p-3.5 sm:p-4 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#b91c1c]">Total Due (واجب الادا)</p>
            <p className="mt-1 text-lg sm:text-2xl font-bold text-[#b91c1c]">{formatCurrency(totalOverdue)}</p>
          </div>
        </div>

        {/* ══ FEE LEDGER / MONTHLY VOUCHERS ══════════════════════════════════ */}
        <div className="rounded-2xl bg-white border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="border-b border-[#e2e8f0] px-4 sm:px-5 py-3.5 flex items-center justify-between bg-[#f8fafc]">
            <div>
              <h2 className="font-bold text-[#0f172a] text-sm sm:text-base">Fee Ledger (فیس ریکارڈ و کھاتہ)</h2>
              <p className="text-xs text-[#64748b]">ماہانہ فیس واؤچرز اور ادائیگی کی تفصیل</p>
            </div>
            <button
              onClick={() => { setShowAdd(true); setAddErr(''); }}
              className="flex items-center gap-1.5 rounded-xl bg-[#004649] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1b5e62] transition shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Fee</span>
            </button>
          </div>

          {fees.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Receipt className="h-10 w-10 text-[#cbd5e1]" />
              <p className="text-sm font-semibold text-[#64748b]">کوئی فیس واؤچر موجود نہیں ہے۔</p>
              <button onClick={() => setShowAdd(true)} className="text-xs font-bold text-[#004649] hover:underline">
                + پہلی فیس شامل کریں
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#f1f5f9]">
              {fees.map((f) => {
                const net = f.amount - f.discount;
                const paid = f.payments.reduce((s, p) => s + p.amountPaid, 0);
                const remaining = Math.max(net - paid, 0);
                const paidPct = net > 0 ? Math.min(Math.round((paid / net) * 100), 100) : 100;
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
                        <p className="mt-0.5 text-xs text-[#64748b]">آخری تاریخ (Due Date): {fmtDate(f.dueDate)}</p>
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
                        <span>ادائیگی کی شرح: {paidPct}%</span>
                        {remaining > 0 && paid > 0 && (
                          <span className="text-[#3b82f6] font-semibold">جزوی ادا شدہ ({formatCurrency(paid)} ادا / {formatCurrency(remaining)} باقی)</span>
                        )}
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#f1f5f9] overflow-hidden border border-[#e2e8f0]/80">
                        <div className={`h-full rounded-full transition-all ${style.bar}`} style={{ width: `${paidPct}%` }} />
                      </div>
                    </div>

                    {/* Amounts Breakdown Grid */}
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-2.5 text-xs">
                      <div>
                        <p className="text-[#64748b] text-[10px] uppercase font-bold">کل رقم (Net)</p>
                        <p className="font-bold text-[#0f172a] text-xs sm:text-sm mt-0.5">{formatCurrency(net)}</p>
                      </div>
                      <div>
                        <p className="text-[#15803d] text-[10px] uppercase font-bold">وصول شدہ (Paid)</p>
                        <p className="font-bold text-[#15803d] text-xs sm:text-sm mt-0.5">{formatCurrency(paid)}</p>
                      </div>
                      <div>
                        <p className="text-[#b45309] text-[10px] uppercase font-bold">بقایا (Remaining)</p>
                        <p className={`font-bold text-xs sm:text-sm mt-0.5 ${remaining > 0 ? 'text-[#b45309]' : 'text-[#64748b]'}`}>
                          {formatCurrency(remaining)}
                        </p>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          setPayTarget(f);
                          setPayErr('');
                          setPayForm({ amount: String(remaining > 0 ? remaining : ''), method: 'CASH', ref: '' });
                        }}
                        className="h-9 flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#004649] text-white text-xs font-semibold hover:bg-[#1b5e62] transition shadow-2xs"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Record Payment (ادائیگی درج کریں)</span>
                      </button>

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
                          <span>{f.payments.length} اقساط</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* Payment History Accordion */}
                    {isExpanded && f.payments.length > 0 && (
                      <div className="rounded-xl bg-[#f8fafc] border border-[#e2e8f0] divide-y divide-[#e2e8f0] mt-2">
                        <div className="px-3 py-2 text-[11px] font-bold text-[#64748b] bg-[#f1f5f9]/60">
                          ادائیگیوں کی تاریخ (Payment History)
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
          <PrintButton label="Print / PDF واؤچر" orientation="portrait" />
          <button
            onClick={handleDownload}
            className="h-11 flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#004649] text-white font-semibold text-xs sm:text-sm hover:bg-[#1b5e62] transition shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span>Download CSV (ایکسل فائل)</span>
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
            <span>WhatsApp فیس سمری</span>
          </button>
        </div>
      </div>

      {/* ── MODAL 1: STUDENT LEVEL FEE COLLECTION (BULK / OLDEST-FIRST) ─── */}
      {showStudentPay && (
        <Modal title="طالب علم سے فیس وصول کریں (Collect Fee)" onClose={() => setShowStudentPay(false)}>
          <div className="space-y-4">
            
            {/* Student Info Box */}
            <div className="rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-3.5 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748b]">طالب علم:</span>
                <strong className="text-[#0f172a]">{student.user.fullName} ({student.admissionNo})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">کلاس:</span>
                <span className="font-semibold text-[#0f172a]">{classInfo}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#e2e8f0]">
                <span className="text-[#b45309] font-bold">کل واجب الادا فیس:</span>
                <strong className="text-base text-[#b45309] font-black">{formatCurrency(totalRemaining)}</strong>
              </div>
              {unpaidMonthsCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#64748b]">واجب الادا مہینے:</span>
                  <span className="font-bold text-amber-800">{unpaidMonthsCount} ماہ</span>
                </div>
              )}
            </div>

            {/* Quick Amount Preset Buttons */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] mb-1.5">فوری رقم کا انتخاب (Quick Presets)</p>
              <div className="flex flex-wrap gap-1.5">
                {totalRemaining > 0 && (
                  <button
                    type="button"
                    onClick={() => setStudentPayAmount(String(totalRemaining))}
                    className="rounded-lg bg-amber-50 border border-amber-300 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 transition"
                  >
                    مکمل بقایا: {formatCurrency(totalRemaining)}
                  </button>
                )}
                {unpaidFees.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStudentPayAmount(String(unpaidFees[0].remaining))}
                    className="rounded-lg bg-white border border-[#cbd5e1] px-2.5 py-1 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc] transition"
                  >
                    1 ماہ: {formatCurrency(unpaidFees[0].remaining)}
                  </button>
                )}
                {unpaidFees.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setStudentPayAmount(String(unpaidFees[0].remaining + unpaidFees[1].remaining))}
                    className="rounded-lg bg-white border border-[#cbd5e1] px-2.5 py-1 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc] transition"
                  >
                    2 ماہ: {formatCurrency(unpaidFees[0].remaining + unpaidFees[1].remaining)}
                  </button>
                )}
              </div>
            </div>

            {/* Amount input */}
            <Field label="وصول شدہ رقم (Amount Paid in PKR)">
              <input
                className={INPUT}
                type="number"
                min="1"
                step="1"
                placeholder="مثلاً: 1500 یا 2000"
                value={studentPayAmount}
                onChange={(e) => setStudentPayAmount(e.target.value)}
              />
            </Field>

            {/* Live Allocation Preview */}
            {previewAllocations.length > 0 && (
              <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-3 text-xs space-y-1.5">
                <p className="font-bold text-blue-950 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5 text-blue-700" />
                  <span>رقم کی تقسیم (سب سے پرانی فیس پہلے):</span>
                </p>
                <div className="divide-y divide-blue-200/60">
                  {previewAllocations.map(p => (
                    <div key={p.id} className="py-1 flex justify-between items-center text-blue-900">
                      <span className="truncate pr-2">{p.title}:</span>
                      <span className="font-semibold shrink-0">
                        {formatCurrency(p.allocated)} {p.willBeFull ? '✓ مکمل ادا' : `(جزوی - ${formatCurrency(p.leftover)} باقی)`}
                      </span>
                    </div>
                  ))}
                </div>
                {excessPayment > 0 && (
                  <p className="pt-1 border-t border-blue-200 text-emerald-800 font-bold">
                    اضافی ایڈوانس رقم: {formatCurrency(excessPayment)}
                  </p>
                )}
              </div>
            )}

            {/* Method selection */}
            <Field label="ادائیگی کا ذریعہ (Payment Method)">
              <select
                className={INPUT}
                value={studentPayMethod}
                onChange={(e) => setStudentPayMethod(e.target.value)}
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m === 'CASH' ? 'نقد (CASH)' : m === 'BANK_TRANSFER' ? 'بینک ٹرانسفر (BANK TRANSFER)' : m === 'ONLINE' ? 'آن لائن (ONLINE)' : m}
                  </option>
                ))}
              </select>
            </Field>

            {/* Transaction Ref */}
            <Field label="رسید نمبر / حوالہ (Transaction Reference / Notes)">
              <input
                className={INPUT}
                placeholder="اختیاری: مثلاً رسید # 1045"
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
              <span>ادائیگی وصول اور تصدیق کریں (Confirm Payment)</span>
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL 2: ADD SINGLE FEE ────────────────────────────────────────── */}
      {showAdd && (
        <Modal title="نئی فیس شامل کریں (Add Fee)" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <Field label="عنوان (Title)">
              <input
                className={INPUT}
                placeholder="مثلاً: Monthly Tuition Fee - November 2026"
                value={addForm.title}
                onChange={e => setAddForm(p => ({ ...p, title: e.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="فیس رقم (Amount PKR)">
                <input
                  className={INPUT}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="1500"
                  value={addForm.amount}
                  onChange={e => setAddForm(p => ({ ...p, amount: e.target.value }))}
                />
              </Field>
              <Field label="رعایت (Discount PKR)">
                <input
                  className={INPUT}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={addForm.discount}
                  onChange={e => setAddForm(p => ({ ...p, discount: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="آخری تاریخ (Due Date)">
              <input
                className={INPUT}
                type="date"
                value={addForm.dueDate}
                onChange={e => setAddForm(p => ({ ...p, dueDate: e.target.value }))}
              />
            </Field>
            {addErr && <p className="text-xs text-[#b91c1c] font-medium">{addErr}</p>}
            <button
              onClick={handleAddFee}
              disabled={addSaving}
              className="mt-1 flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-[#004649] text-white font-semibold hover:bg-[#1b5e62] transition disabled:opacity-60"
            >
              {addSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Add Fee</span>
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL 3: EDIT FEE ──────────────────────────────────────────────── */}
      {editTarget && (
        <Modal title="فیس تبدیل کریں (Edit Fee)" onClose={() => setEditTarget(null)}>
          <div className="space-y-3">
            <Field label="عنوان (Title)">
              <input
                className={INPUT}
                value={editForm.title}
                onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="فیس رقم (Amount PKR)">
                <input
                  className={INPUT}
                  type="number"
                  min="0"
                  step="1"
                  value={editForm.amount}
                  onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))}
                />
              </Field>
              <Field label="رعایت (Discount PKR)">
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
            <Field label="آخری تاریخ (Due Date)">
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
        <Modal title="فیس ڈیلیٹ کریں؟ (Delete Fee)" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-[#64748b]">
              کیا آپ واقعی <strong className="text-[#0f172a]">{deleteTarget.title}</strong> ڈیلیٹ کرنا چاہتے ہیں؟ اس فیس کی تمام ادا شدہ رسیدیں بھی حذف ہو جائیں گی۔
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 border border-[#cbd5e1] rounded-xl text-sm font-semibold text-[#334155] hover:bg-[#f8fafc] transition"
              >
                منسوخ کریں (Cancel)
              </button>
              <button
                onClick={handleDeleteFee}
                disabled={deleting}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-[#b91c1c] text-white text-sm font-semibold hover:bg-[#991b1b] transition disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>ڈیلیٹ کریں (Delete)</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 5: SINGLE FEE VOUCHER PAYMENT ────────────────────────────── */}
      {payTarget && (
        <Modal title={`ادائیگی درج کریں — ${payTarget.title}`} onClose={() => setPayTarget(null)}>
          <div className="space-y-3">
            <Field label="ادا شدہ رقم (Amount Paid PKR)">
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
            <Field label="ادائیگی کا ذریعہ (Method)">
              <select
                className={INPUT}
                value={payForm.method}
                onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}
              >
                {METHODS.map(m => (
                  <option key={m} value={m}>
                    {m === 'CASH' ? 'نقد (CASH)' : m === 'BANK_TRANSFER' ? 'بینک ٹرانسفر (BANK TRANSFER)' : m === 'ONLINE' ? 'آن لائن (ONLINE)' : m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="رسید نمبر / تفصیل (Transaction Ref - Optional)">
              <input
                className={INPUT}
                placeholder="مثلاً: TXN-99881 یا Cash Rec # 12"
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
