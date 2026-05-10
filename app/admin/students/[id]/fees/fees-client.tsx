'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Download,
  Share2,
  Check,
  Loader2,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  X,
  CreditCard,
  ChevronDown,
  ChevronUp
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

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

function fmtDate(v: string): string {
  try {
    return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

const STATUS_STYLE: Record<string, { badge: string; bar: string }> = {
  PAID:    { badge: 'bg-[#dcfce7] text-[#15803d]',  bar: 'bg-[#22c55e]' },
  PENDING: { badge: 'bg-[#fef3c7] text-[#b45309]',  bar: 'bg-[#f59e0b]' },
  PARTIAL: { badge: 'bg-[#eff6ff] text-[#1d4ed8]',  bar: 'bg-[#3b82f6]' },
  OVERDUE: { badge: 'bg-[#fee2e2] text-[#b91c1c]',  bar: 'bg-[#ef4444]' },
};

const METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'ONLINE'];

// ─── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] px-5 py-4">
          <h3 className="font-bold text-[#111827]">{title}</h3>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#374151]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const INPUT = 'h-10 w-full rounded-xl bg-[#f3f4f5] border-none px-3 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#004649]/30';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudentFeesClient({
  student,
  fees: initialFees,
  totalAssigned: _ta,
  totalPaid: _tp,
  totalRemaining: _tr,
  totalOverdue: _to
}: Props) {
  const router = useRouter();
  const [fees, setFees] = useState<FeeRecord[]>(initialFees);

  // Derived totals from live state
  const totalAssigned = fees.reduce((s, f) => s + (f.amount - f.discount), 0);
  const totalPaid = fees.reduce((s, f) => s + f.payments.reduce((a, p) => a + p.amountPaid, 0), 0);
  const totalRemaining = totalAssigned - totalPaid;
  const totalOverdue = fees.filter(f => f.status === 'OVERDUE').reduce((s, f) => {
    const net = f.amount - f.discount;
    const paid = f.payments.reduce((a, p) => a + p.amountPaid, 0);
    return s + Math.max(net - paid, 0);
  }, 0);

  const classInfo = student.class ? `${student.class.name} ${student.class.section || ''}` : 'N/A';
  const waPhone = (student.whatsApp || student.guardianPhone || '').replace(/[^0-9+]/g, '');

  // Expanded payments
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  // Add payment modal
  const [payTarget, setPayTarget] = useState<FeeRecord | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'CASH', ref: '' });
  const [paySaving, setPaySaving] = useState(false);
  const [payErr, setPayErr] = useState('');

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleAddFee() {
    if (!addForm.title || !addForm.amount || !addForm.dueDate) {
      setAddErr('Title, amount and due date are required.');
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
      if (!res.ok) { setAddErr(data.error ?? 'Failed to add fee.'); return; }
      setShowAdd(false);
      setAddForm({ title: '', amount: '', discount: '0', dueDate: '' });
      router.refresh();
      // Optimistic add
      setFees(prev => [...prev, { ...data, amount: Number(data.amount), discount: Number(data.discount), payments: [] }]);
    } catch { setAddErr('Network error.'); }
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
      if (!res.ok) { setEditErr(data.error ?? 'Failed to update fee.'); return; }
      setEditTarget(null);
      setFees(prev => prev.map(f => f.id === editTarget.id
        ? { ...f, title: editForm.title, amount: Number(editForm.amount), discount: Number(editForm.discount), dueDate: new Date(editForm.dueDate).toISOString() }
        : f
      ));
    } catch { setEditErr('Network error.'); }
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
      }
    } finally { setDeleting(false); }
  }

  async function handleAddPayment() {
    if (!payTarget || !payForm.amount) { setPayErr('Amount required.'); return; }
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
      if (!res.ok) { setPayErr(data.error ?? 'Failed to record payment.'); return; }
      setPayTarget(null);
      setPayForm({ amount: '', method: 'CASH', ref: '' });
      // Refresh to get updated status
      router.refresh();
      setFees(prev => prev.map(f => {
        if (f.id !== payTarget.id) return f;
        const newPayments = [...f.payments, { id: data.id, amountPaid: Number(payForm.amount), method: payForm.method, paidAt: new Date().toISOString(), transactionRef: payForm.ref || null }];
        const net = f.amount - f.discount;
        const paid = newPayments.reduce((s, p) => s + p.amountPaid, 0);
        const status = paid >= net ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';
        return { ...f, payments: newPayments, status };
      }));
    } catch { setPayErr('Network error.'); }
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
      `Total Assigned: ${fmtCurrency(totalAssigned)}`,
      `Total Paid: ${fmtCurrency(totalPaid)}`,
      `Remaining: ${fmtCurrency(totalRemaining)}`,
      ''
    ].join('\n');
    const rows = [
      ['Title', 'Due Date', 'Status', 'Amount', 'Paid', 'Remaining'],
      ...fees.map((f) => {
        const net = f.amount - f.discount;
        const paid = f.payments.reduce((s, p) => s + p.amountPaid, 0);
        return [f.title, fmtDate(f.dueDate), f.status, net.toFixed(2), paid.toFixed(2), Math.max(net - paid, 0).toFixed(2)];
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
    const msg = `Fee Summary — ${student.user.fullName}\n\nAssigned: ${fmtCurrency(totalAssigned)}\nPaid: ${fmtCurrency(totalPaid)}\nRemaining: ${fmtCurrency(totalRemaining)}\nOverdue: ${fmtCurrency(totalOverdue)}`;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafb] p-4">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Back Link */}
        <Link href={`/admin/students/${student.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#004649] hover:text-[#1b5e62] transition">
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#f8fafc] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Total Assigned</p>
            <p className="mt-1.5 text-2xl font-bold text-[#111827]">{fmtCurrency(totalAssigned)}</p>
          </div>
          <div className="rounded-xl bg-[#f0fdf4] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Paid</p>
            <p className="mt-1.5 text-2xl font-bold text-[#15803d]">{fmtCurrency(totalPaid)}</p>
          </div>
          <div className="rounded-xl bg-[#fef9f0] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Remaining</p>
            <p className="mt-1.5 text-2xl font-bold text-[#b45309]">{fmtCurrency(totalRemaining)}</p>
          </div>
          <div className="rounded-xl bg-[#fef2f2] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Overdue</p>
            <p className="mt-1.5 text-2xl font-bold text-[#b91c1c]">{fmtCurrency(totalOverdue)}</p>
          </div>
        </div>

        {/* Fee Ledger */}
        <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)]">
          <div className="border-b border-[#f1f5f9] px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-[#111827]">Fee Ledger</h2>
            <button
              onClick={() => { setShowAdd(true); setAddErr(''); }}
              className="flex items-center gap-1.5 rounded-xl bg-[#004649] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1b5e62] transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Fee
            </button>
          </div>

          {fees.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <DollarSign className="h-10 w-10 text-[#d1d5db]" />
              <p className="text-sm text-[#9ca3af]">No fees assigned yet.</p>
              <button onClick={() => setShowAdd(true)} className="text-xs font-semibold text-[#004649] hover:underline">
                + Add first fee
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#f1f5f9]">
              {fees.map((f) => {
                const net = f.amount - f.discount;
                const paid = f.payments.reduce((s, p) => s + p.amountPaid, 0);
                const remaining = Math.max(net - paid, 0);
                const paidPct = net > 0 ? Math.min(Math.round((paid / net) * 100), 100) : 100;
                const style = STATUS_STYLE[f.status.toUpperCase()] ?? { badge: 'bg-[#f1f5f9] text-[#6b7280]', bar: 'bg-[#9ca3af]' };
                const isExpanded = expanded.has(f.id);

                return (
                  <div key={f.id} className="p-4 space-y-3">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#111827] truncate">{f.title}</p>
                        <p className="mt-0.5 text-xs text-[#6b7280]">Due: {fmtDate(f.dueDate)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${style.badge}`}>{f.status}</span>
                        <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg text-[#9ca3af] hover:text-[#2b676e] hover:bg-[#f0f2f5] transition">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(f)} className="p-1.5 rounded-lg text-[#9ca3af] hover:text-[#b91c1c] hover:bg-[#fef2f2] transition">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 w-full rounded-full bg-[#f1f5f9] overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${style.bar}`} style={{ width: `${paidPct}%` }} />
                    </div>

                    {/* Amounts */}
                    <div className="flex gap-4 text-xs">
                      <div>
                        <p className="text-[#9ca3af]">Amount</p>
                        <p className="font-semibold text-[#111827]">{fmtCurrency(net)}</p>
                      </div>
                      <div>
                        <p className="text-[#9ca3af]">Paid</p>
                        <p className="font-semibold text-[#15803d]">{fmtCurrency(paid)}</p>
                      </div>
                      <div>
                        <p className="text-[#9ca3af]">Remaining</p>
                        <p className="font-semibold text-[#b45309]">{fmtCurrency(remaining)}</p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setPayTarget(f); setPayErr(''); setPayForm({ amount: String(remaining > 0 ? remaining : ''), method: 'CASH', ref: '' }); }}
                        className="h-9 flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#004649] text-white text-xs font-semibold hover:bg-[#1b5e62] transition"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Record Payment
                      </button>
                      {f.payments.length > 0 && (
                        <button
                          onClick={() => setExpanded(prev => { const s = new Set(prev); s.has(f.id) ? s.delete(f.id) : s.add(f.id); return s; })}
                          className="h-9 px-3 flex items-center gap-1 rounded-xl bg-[#f0f2f5] text-[#374151] text-xs font-semibold hover:bg-[#e2e8e8] transition"
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          {f.payments.length}
                        </button>
                      )}
                    </div>

                    {/* Payment history */}
                    {isExpanded && f.payments.length > 0 && (
                      <div className="rounded-xl bg-[#f8fafc] divide-y divide-[#f1f5f9]">
                        {f.payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between px-3 py-2.5 gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#111827]">{fmtCurrency(p.amountPaid)}</p>
                              <p className="text-[10px] text-[#9ca3af]">{p.method} · {fmtDate(p.paidAt)}{p.transactionRef ? ` · ${p.transactionRef}` : ''}</p>
                            </div>
                            <button
                              onClick={() => handleDeletePayment(f.id, p.id)}
                              className="p-1.5 rounded-lg text-[#9ca3af] hover:text-[#b91c1c] hover:bg-[#fef2f2] transition flex-shrink-0"
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

        {/* Bottom Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="h-11 flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#004649] text-white font-semibold hover:bg-[#1b5e62] transition"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </button>
          <button
            onClick={handleShareSummary}
            disabled={!waPhone}
            className={`h-11 flex flex-1 items-center justify-center gap-2 rounded-xl font-semibold transition ${
              waPhone ? 'bg-[#25d366] text-white hover:scale-105 active:scale-[0.98]' : 'bg-[#f0f2f5] text-[#6f7979] cursor-not-allowed opacity-60'
            }`}
          >
            <Share2 className="h-4 w-4" />
            WhatsApp
          </button>
        </div>
      </div>

      {/* ── Add Fee Modal ──────────────────────────────────────────────────── */}
      {showAdd && (
        <Modal title="Add Fee" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <Field label="Title">
              <input className={INPUT} placeholder="e.g. Monthly Fee — May 2026" value={addForm.title} onChange={e => setAddForm(p => ({ ...p, title: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount">
                <input className={INPUT} type="number" min="0" step="0.01" placeholder="0.00" value={addForm.amount} onChange={e => setAddForm(p => ({ ...p, amount: e.target.value }))} />
              </Field>
              <Field label="Discount">
                <input className={INPUT} type="number" min="0" step="0.01" placeholder="0.00" value={addForm.discount} onChange={e => setAddForm(p => ({ ...p, discount: e.target.value }))} />
              </Field>
            </div>
            <Field label="Due Date">
              <input className={INPUT} type="date" value={addForm.dueDate} onChange={e => setAddForm(p => ({ ...p, dueDate: e.target.value }))} />
            </Field>
            {addErr && <p className="text-xs text-[#b91c1c] font-medium">{addErr}</p>}
            <button
              onClick={handleAddFee}
              disabled={addSaving}
              className="mt-1 flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-[#004649] text-white font-semibold hover:bg-[#1b5e62] transition disabled:opacity-60"
            >
              {addSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Fee
            </button>
          </div>
        </Modal>
      )}

      {/* ── Edit Fee Modal ─────────────────────────────────────────────────── */}
      {editTarget && (
        <Modal title="Edit Fee" onClose={() => setEditTarget(null)}>
          <div className="space-y-3">
            <Field label="Title">
              <input className={INPUT} value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount">
                <input className={INPUT} type="number" min="0" step="0.01" value={editForm.amount} onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))} />
              </Field>
              <Field label="Discount">
                <input className={INPUT} type="number" min="0" step="0.01" value={editForm.discount} onChange={e => setEditForm(p => ({ ...p, discount: e.target.value }))} />
              </Field>
            </div>
            <Field label="Due Date">
              <input className={INPUT} type="date" value={editForm.dueDate} onChange={e => setEditForm(p => ({ ...p, dueDate: e.target.value }))} />
            </Field>
            {editErr && <p className="text-xs text-[#b91c1c] font-medium">{editErr}</p>}
            <button
              onClick={handleEditFee}
              disabled={editSaving}
              className="mt-1 flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-[#004649] text-white font-semibold hover:bg-[#1b5e62] transition disabled:opacity-60"
            >
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete Fee Confirm ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <Modal title="Delete Fee?" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-[#6b7280]">
              Delete <strong className="text-[#111827]">{deleteTarget.title}</strong>? All payment records for this fee will also be deleted. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 h-11 border border-[#e5e7eb] rounded-xl text-sm font-semibold text-[#374151] hover:bg-[#f9fafb] transition">
                Cancel
              </button>
              <button
                onClick={handleDeleteFee}
                disabled={deleting}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-[#b91c1c] text-white text-sm font-semibold hover:bg-[#991b1b] transition disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Record Payment Modal ───────────────────────────────────────────── */}
      {payTarget && (
        <Modal title={`Record Payment — ${payTarget.title}`} onClose={() => setPayTarget(null)}>
          <div className="space-y-3">
            <Field label="Amount Paid">
              <input className={INPUT} type="number" min="0" step="0.01" placeholder="0.00" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} />
            </Field>
            <Field label="Method">
              <select className={INPUT} value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}>
                {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Transaction Ref (optional)">
              <input className={INPUT} placeholder="e.g. TXN-12345" value={payForm.ref} onChange={e => setPayForm(p => ({ ...p, ref: e.target.value }))} />
            </Field>
            {payErr && <p className="text-xs text-[#b91c1c] font-medium">{payErr}</p>}
            <button
              onClick={handleAddPayment}
              disabled={paySaving}
              className="mt-1 flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-[#004649] text-white font-semibold hover:bg-[#1b5e62] transition disabled:opacity-60"
            >
              {paySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Record Payment
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
