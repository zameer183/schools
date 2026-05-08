'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, Grid3X3, List, MoreVertical, Pencil, MessageSquare,
  Share2, Trash2, X, Eye, EyeOff, CheckCircle2, AlertCircle,
  Users, GraduationCap, DollarSign, ChevronLeft, ChevronRight,
  Phone, BookOpen,
} from 'lucide-react';
import { KpiCard, Button } from '@/components/ui';

// ── Types ───────────────────────────────────────────────────────────────────
export type TeacherAccess = {
  ACADEMICS: boolean; STUDENTS: boolean; ATTENDANCE: boolean;
  STAFF_ATTENDANCE: boolean; ASSIGNMENTS: boolean; PROGRESS: boolean;
  MESSAGES: boolean; EXAMS: boolean; FEES: boolean;
};
export type TeacherCompensation = {
  baseSalary: number; bonus: number; deduction: number; netSalary: number;
};
export type ClassItem = { id: string; name: string; section: string };
export type TeacherUser = {
  id: string; fullName: string; email: string;
  phone?: string | null; isActive: boolean;
};
export type TeacherItem = {
  id: string;
  employeeCode?: string | null;
  qualification?: string | null;
  specialization?: string | null;
  joiningDate?: Date | string | null;
  user: TeacherUser;
  classAssignments: { classId: string; class: ClassItem }[];
  access?: TeacherAccess;
  compensation?: TeacherCompensation;
};

// ── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_ACCESS: TeacherAccess = {
  ACADEMICS: true, STUDENTS: true, ATTENDANCE: true, STAFF_ATTENDANCE: true,
  ASSIGNMENTS: true, PROGRESS: true, MESSAGES: true, EXAMS: true, FEES: false,
};
const ACCESS_LABELS: Record<keyof TeacherAccess, string> = {
  ACADEMICS: 'Academics', STUDENTS: 'Students', ATTENDANCE: 'Attendance',
  STAFF_ATTENDANCE: 'Staff Attendance', ASSIGNMENTS: 'Assignments',
  PROGRESS: 'Progress', MESSAGES: 'Messages', EXAMS: 'Exams', FEES: 'Fees',
};
const AVATAR_COLORS = ['#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#2563eb', '#0d9488'];

const INPUT_CLS =
  'w-full rounded-xl bg-[#edeeef] border-none px-3 py-2.5 text-sm text-[#1a1c1c] placeholder-[#9ca3af] outline-none focus:ring-2 focus:ring-[#004649]/20 transition-shadow';
const LABEL_CLS = 'mb-1 block text-xs font-medium text-[#6f7979]';
const CARD_CLS = 'rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)]';

// ── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}
function fmtCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);
}
function toDateInput(v: Date | string | null | undefined): string {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

// ── Toast ────────────────────────────────────────────────────────────────────
let _toastSeq = 0;
type Toast = { id: number; message: string; type: 'success' | 'error' };

function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-4 z-[100] flex max-w-xs w-full flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium ${
            t.type === 'success' ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#b91c1c]'
          }`}
        >
          {t.type === 'success'
            ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => remove(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({
  teacher, onCancel, onConfirm, loading,
}: { teacher: TeacherItem; onCancel: () => void; onConfirm: () => void; loading: boolean }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div className={`w-full max-w-sm ${CARD_CLS} p-6`} onClick={e => e.stopPropagation()}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#fef2f2]">
          <Trash2 size={22} className="text-[#b91c1c]" />
        </div>
        <h3 className="mb-1 text-center text-lg font-bold text-[#1a1c1c]">Delete Teacher?</h3>
        <p className="mb-6 text-center text-sm text-[#6f7979]">
          Permanently delete{' '}
          <span className="font-semibold text-[#1a1c1c]">{teacher.user.fullName}</span>{' '}
          and all their data. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-[#e0e5e5] py-2.5 text-sm font-semibold text-[#1a1c1c] hover:bg-[#f3f4f5] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-[#ef4444] py-2.5 text-sm font-bold text-white hover:bg-[#dc2626] disabled:opacity-60 transition-colors"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Share Credentials Modal ───────────────────────────────────────────────────
function ShareModal({ teacher, onClose }: { teacher: TeacherItem; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const rawPhone = (teacher.user.phone ?? '').replace(/\D/g, '');
  const hasPhone = rawPhone.length >= 7;
  const avatarBg = avatarColor(teacher.user.fullName);

  const msg = `Hi ${teacher.user.fullName},\n\nYour teacher portal login credentials:\n📧 Email: ${teacher.user.email}\n🔑 Password: ${password}\n\nPlease keep these safe.`;

  const handleShare = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: teacher.id, shareCredentials: true, password }),
      });
      if (!res.ok) return;
      setDone(true);
      if (hasPhone) {
        window.open(`https://wa.me/${rawPhone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className={`w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.12)] p-5`}
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#e0e5e5] sm:hidden" />

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: avatarBg }}
            >
              {initials(teacher.user.fullName)}
            </div>
            <div>
              <p className="text-sm font-bold text-[#1a1c1c]">{teacher.user.fullName}</p>
              <p className="text-xs text-[#6f7979]">{teacher.user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#6f7979] hover:bg-[#f3f4f5] hover:text-[#1a1c1c]">
            <X size={16} />
          </button>
        </div>

        <div className={`mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
          hasPhone ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fef2f2] text-[#b91c1c]'
        }`}>
          <Phone size={12} />
          {hasPhone ? `WhatsApp: +${rawPhone}` : 'No phone — WhatsApp unavailable'}
        </div>

        <div className="mb-3">
          <label className={LABEL_CLS}>Email</label>
          <input
            readOnly
            value={teacher.user.email}
            className="w-full rounded-xl bg-[#f3f4f5] border-none px-3 py-2 text-sm text-[#6f7979] outline-none"
          />
        </div>

        <div className="mb-4">
          <label className={LABEL_CLS}>Password</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl bg-[#edeeef] border-none px-3 py-2 pr-10 text-sm text-[#1a1c1c] outline-none focus:ring-2 focus:ring-[#004649]/20"
            />
            <button
              type="button"
              onClick={() => setShowPwd(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6f7979] hover:text-[#1a1c1c]"
            >
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-xl bg-[#f3f4f5] p-3">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Preview</p>
          <pre className="whitespace-pre-wrap text-xs text-[#6f7979]">{msg}</pre>
        </div>

        {done ? (
          <div className="flex items-center gap-2 rounded-xl bg-[#dcfce7] px-4 py-3 text-sm text-[#15803d]">
            <CheckCircle2 size={15} /> Credentials saved{hasPhone ? '. WhatsApp opened.' : '.'}
          </div>
        ) : (
          <button
            onClick={handleShare}
            disabled={saving || password.length < 6}
            className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: hasPhone ? '#25D366' : '#004649' }}
          >
            {saving ? 'Saving…' : hasPhone ? 'Save & Open WhatsApp' : 'Save Credentials'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── 3-Dot Action Menu ─────────────────────────────────────────────────────────
function ActionMenu({
  onEdit, onMessage, onShare, onDelete, onViewProfile, onViewClasses, onSuspend,
}: {
  onEdit: () => void;
  onMessage: () => void;
  onShare: () => void;
  onDelete: () => void;
  onViewProfile?: () => void;
  onViewClasses?: () => void;
  onSuspend?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = [
    ...(onViewProfile ? [{ icon: <Eye size={13} />, label: 'View Profile', action: onViewProfile }] : []),
    { icon: <Pencil size={13} />, label: 'Edit', action: onEdit },
    { icon: <MessageSquare size={13} />, label: 'Send Message', action: onMessage },
    ...(onViewClasses ? [{ icon: <BookOpen size={13} />, label: 'View Classes', action: onViewClasses }] : []),
    ...(onSuspend ? [{ icon: <AlertCircle size={13} />, label: 'Suspend', action: onSuspend }] : []),
    { icon: <Share2 size={13} />, label: 'Share Credentials', action: onShare },
    { icon: <Trash2 size={13} />, label: 'Delete', action: onDelete, danger: true },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className="rounded-lg p-1.5 text-[#6f7979] hover:bg-[#f3f4f5] hover:text-[#1a1c1c] transition-colors"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-52 max-h-[60vh] overflow-y-auto overflow-x-hidden rounded-xl border border-[#e2e8e8] bg-white shadow-xl md:w-44 max-md:top-auto max-md:bottom-8">
          {items.map(item => (
            <button
              key={item.label}
              onClick={() => { item.action(); setOpen(false); }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium transition-colors hover:bg-[#f3f4f5] ${
                item.danger ? 'text-[#b91c1c]' : 'text-[#3d4a4a]'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────
type DrawerForm = {
  fullName: string; email: string; password: string; phone: string;
  employeeCode: string; qualification: string; specialization: string;
  joiningDate: string; isActive: boolean;
  classIds: string[]; access: TeacherAccess;
  baseSalary: string; bonus: string; deduction: string;
};

const INITIAL_FORM: DrawerForm = {
  fullName: '', email: '', password: '', phone: '',
  employeeCode: '', qualification: '', specialization: '',
  joiningDate: '', isActive: true,
  classIds: [], access: { ...DEFAULT_ACCESS },
  baseSalary: '0', bonus: '0', deduction: '0',
};

const STEPS = ['Identity', 'Classes & Access', 'Compensation'];

function Drawer({
  open, editId, form, setForm, classes, saving, error, onClose, onSave,
}: {
  open: boolean; editId: string | null; form: DrawerForm;
  setForm: React.Dispatch<React.SetStateAction<DrawerForm>>;
  classes: ClassItem[]; saving: boolean; error: string;
  onClose: () => void; onSave: () => Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [showPwd, setShowPwd] = useState(false);
  const isEdit = Boolean(editId);

  useEffect(() => { if (open) setStep(1); }, [open, editId]);

  const step1Error = (): string | null => {
    if (!form.fullName.trim()) return 'Full name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!isEdit && form.password.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const netSalary = Number(form.baseSalary || 0) + Number(form.bonus || 0) - Number(form.deduction || 0);

  const ff = (field: keyof DrawerForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleNext = () => {
    if (step === 1 && step1Error()) return;
    setStep(s => Math.min(s + 1, 3));
  };


  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white border-l border-[#e2e8e8] shadow-2xl transition-transform duration-300 sm:w-[480px] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#e2e8e8] px-5 py-4">
          <h2 className="font-bold text-[#1a1c1c]">{isEdit ? 'Edit Teacher' : 'Add Teacher'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#6f7979] hover:bg-[#f3f4f5] hover:text-[#1a1c1c]">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex shrink-0 items-center gap-1 border-b border-[#e2e8e8] px-5 py-3">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex items-center gap-1">
                {i > 0 && <div className={`h-px w-5 ${done || active ? 'bg-[#004649]' : 'bg-[#e0e5e5]'}`} />}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      active ? 'bg-[#004649] text-white' : done ? 'bg-[#004649]/20 text-[#004649]' : 'bg-[#edeeef] text-[#6f7979]'
                    }`}
                  >
                    {n}
                  </div>
                  <span
                    className={`hidden text-xs font-medium sm:block ${
                      active ? 'text-[#1a1c1c]' : done ? 'text-[#004649]' : 'text-[#6f7979]'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 && (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL_CLS}>Full Name *</label>
                  <input value={form.fullName} onChange={ff('fullName')} placeholder="Dr. Sarah Ahmed" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Employee Code (Optional)</label>
                  <input value={form.employeeCode} onChange={ff('employeeCode')} placeholder="Auto-generated if empty" className={INPUT_CLS} />
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>Email *</label>
                <input value={form.email} onChange={ff('email')} type="email" placeholder="teacher@school.edu" className={INPUT_CLS} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL_CLS}>Phone / WhatsApp</label>
                  <input value={form.phone} onChange={ff('phone')} type="tel" placeholder="+1 555 000 0000" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>{isEdit ? 'New Password (optional)' : 'Password *'}</label>
                  <div className="relative">
                    <input
                      value={form.password}
                      onChange={ff('password')}
                      type={showPwd ? 'text' : 'password'}
                      placeholder={isEdit ? 'Leave blank to keep' : 'Min 6 characters'}
                      className={`${INPUT_CLS} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6f7979] hover:text-[#1a1c1c]"
                    >
                      {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL_CLS}>Position / Specialization</label>
                  <input value={form.specialization} onChange={ff('specialization')} placeholder="Math Teacher" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Qualification</label>
                  <input value={form.qualification} onChange={ff('qualification')} placeholder="M.Sc. Mathematics" className={INPUT_CLS} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL_CLS}>Joining Date</label>
                  <input value={form.joiningDate} onChange={ff('joiningDate')} type="date" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Status</label>
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
                    className={`flex h-[42px] w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${
                      form.isActive
                        ? 'border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]'
                        : 'border-[#e0e5e5] bg-[#edeeef] text-[#6f7979]'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${form.isActive ? 'bg-[#22c55e]' : 'bg-[#9ca3af]'}`} />
                    {form.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6f7979]">Assign Classes</p>
                {classes.length === 0 ? (
                  <p className="text-xs text-[#6f7979]">No classes available.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {classes.map(c => {
                      const checked = form.classIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            setForm(p => ({
                              ...p,
                              classIds: checked
                                ? p.classIds.filter(id => id !== c.id)
                                : [...p.classIds, c.id],
                            }))
                          }
                          className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                            checked
                              ? 'border-[#004649]/30 bg-[#004649]/5 text-[#1a1c1c]'
                              : 'border-[#e0e5e5] bg-[#f9fafb] text-[#6f7979] hover:bg-[#f3f4f5]'
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              checked ? 'border-[#004649] bg-[#004649]' : 'border-[#d1d5db]'
                            }`}
                          >
                            {checked && (
                              <svg viewBox="0 0 10 8" className="h-2.5 w-2.5">
                                <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          {c.name} – {c.section}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6f7979]">Access Permissions</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {(Object.keys(ACCESS_LABELS) as (keyof TeacherAccess)[]).map(key => {
                    const on = form.access[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, access: { ...p.access, [key]: !p.access[key] } }))}
                        className={`flex min-h-[44px] items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                          on
                            ? 'border-[#004649]/20 bg-[#004649]/5 text-[#1a1c1c]'
                            : 'border-[#e0e5e5] bg-[#f9fafb] text-[#6f7979]'
                        }`}
                      >
                        <span className="pr-2 text-left">{ACCESS_LABELS[key]}</span>
                        <span
                          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${on ? 'bg-[#004649]' : 'bg-[#d1d5db]'}`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4.5' : 'translate-x-0.5'}`}
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className={LABEL_CLS}>Base Salary</label>
                <input value={form.baseSalary} onChange={ff('baseSalary')} type="number" min={0} step={100} placeholder="0" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Bonus</label>
                <input value={form.bonus} onChange={ff('bonus')} type="number" min={0} step={100} placeholder="0" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Deduction</label>
                <input value={form.deduction} onChange={ff('deduction')} type="number" min={0} step={100} placeholder="0" className={INPUT_CLS} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] px-4 py-3">
                <span className="text-sm text-[#6f7979]">Net Salary</span>
                <span className="text-lg font-bold text-[#15803d]">{fmtCurrency(netSalary)}</span>
              </div>
            </div>
          )}

          {step === 1 && step1Error() && (
            <p className="mt-3 text-xs text-[#b91c1c]">{step1Error()}</p>
          )}
          {error && <p className="mt-3 text-xs text-[#b91c1c]">{error}</p>}
        </div>

        {/* Footer */}
        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-[#e2e8e8] px-5 py-4">
          {step > 1 ? (
            <Button variant="secondary" fullWidth onClick={() => setStep(s => s - 1)}>
              <ChevronLeft size={16} /> Back
            </Button>
          ) : (
            <Button variant="secondary" fullWidth onClick={onClose}>
              Cancel
            </Button>
          )}
          {step < 3 ? (
            <Button fullWidth onClick={handleNext} disabled={step === 1 && Boolean(step1Error())}>
              Next <ChevronRight size={16} />
            </Button>
          ) : (
            <Button fullWidth onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Teacher'}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className={`animate-pulse ${CARD_CLS} p-4`}>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-[#edeeef]" />
        <div className="flex-1">
          <div className="mb-1.5 h-4 w-32 rounded bg-[#edeeef]" />
          <div className="h-3 w-20 rounded bg-[#edeeef]" />
        </div>
      </div>
      <div className="mb-2 h-3 w-24 rounded bg-[#edeeef]" />
      <div className="mb-3 flex gap-1.5">
        <div className="h-5 w-16 rounded-lg bg-[#edeeef]" />
        <div className="h-5 w-16 rounded-lg bg-[#edeeef]" />
      </div>
      <div className="h-px w-full rounded bg-[#edeeef]" />
      <div className="mt-2 flex justify-between">
        <div className="h-3 w-16 rounded bg-[#edeeef]" />
        <div className="h-3 w-20 rounded bg-[#edeeef]" />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminTeachersPageClient({
  initialTeachers,
  initialClasses,
}: {
  initialTeachers: TeacherItem[];
  initialClasses: ClassItem[];
}) {
  const router = useRouter();
  const [teachers, setTeachers] = useState<TeacherItem[]>(initialTeachers);
  const [classes] = useState<ClassItem[]>(initialClasses);
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DrawerForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<TeacherItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [shareTarget, setShareTarget] = useState<TeacherItem | null>(null);
  const [mobileActionTeacher, setMobileActionTeacher] = useState<TeacherItem | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++_toastSeq;
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  const removeToast = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teachers', { cache: 'no-store' });
      if (res.ok) setTeachers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(t =>
      t.user.fullName.toLowerCase().includes(q) ||
      t.user.email.toLowerCase().includes(q) ||
      (t.specialization ?? '').toLowerCase().includes(q) ||
      (t.qualification ?? '').toLowerCase().includes(q) ||
      (t.employeeCode ?? '').toLowerCase().includes(q)
    );
  }, [teachers, search]);

  useEffect(() => { setPage(1); }, [search, view]);

  const PAGE_SIZE = view === 'grid' ? 9 : 15;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const total = teachers.length;
    const active = teachers.filter(t => t.user.isActive).length;
    const uniqueClasses = new Set(teachers.flatMap(t => t.classAssignments.map(ca => ca.classId))).size;
    const avgSalary =
      total > 0 ? teachers.reduce((s, t) => s + (t.compensation?.netSalary ?? 0), 0) / total : 0;
    return { total, active, uniqueClasses, avgSalary };
  }, [teachers]);

  const openAdd = () => {
    setEditId(null);
    setForm({ ...INITIAL_FORM, access: { ...DEFAULT_ACCESS } });
    setFormError('');
    setDrawerOpen(true);
  };

  const openEdit = (t: TeacherItem) => {
    setEditId(t.id);
    setForm({
      fullName: t.user.fullName,
      email: t.user.email,
      password: '',
      phone: t.user.phone ?? '',
      employeeCode: t.employeeCode ?? '',
      qualification: t.qualification ?? '',
      specialization: t.specialization ?? '',
      joiningDate: toDateInput(t.joiningDate),
      isActive: t.user.isActive,
      classIds: t.classAssignments.map(ca => ca.classId),
      access: t.access ? { ...t.access } : { ...DEFAULT_ACCESS },
      baseSalary: String(t.compensation?.baseSalary ?? 0),
      bonus: String(t.compensation?.bonus ?? 0),
      deduction: String(t.compensation?.deduction ?? 0),
    });
    setFormError('');
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    try {
      const isEdit = Boolean(editId);
      const payload = {
        ...(isEdit ? { id: editId } : {}),
        fullName: form.fullName,
        email: form.email,
        ...(form.password ? { password: form.password } : {}),
        phone: form.phone,
        employeeCode: form.employeeCode,
        qualification: form.qualification,
        specialization: form.specialization,
        joiningDate: form.joiningDate || null,
        isActive: form.isActive,
        classIds: form.classIds,
        access: form.access,
        baseSalary: Number(form.baseSalary || 0),
        bonus: Number(form.bonus || 0),
        deduction: Number(form.deduction || 0),
      };

      const res = await fetch('/api/teachers', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFormError(data?.error ?? 'Unable to save teacher.');
        return;
      }

      setDrawerOpen(false);
      await reload();
      addToast(isEdit ? `${form.fullName} updated.` : `${form.fullName} added.`, 'success');
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/teachers?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 404) {
          // Record already deleted elsewhere; treat as successful cleanup.
          setDeleteTarget(null);
          await reload();
          addToast('Teacher already removed.', 'success');
          return;
        }
        addToast(data?.error ?? 'Unable to delete teacher.', 'error');
        return;
      }
      const name = deleteTarget.user.fullName;
      setDeleteTarget(null);
      await reload();
      addToast(`${name} removed.`, 'success');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard variant="success" icon={<Users size={20} />} label="Total Teachers" value={stats.total} />
        <KpiCard variant="primary" icon={<GraduationCap size={20} />} label="Active" value={stats.active} />
        <KpiCard variant="danger" icon={<BookOpen size={20} />} label="Classes Covered" value={stats.uniqueClasses} />
        <KpiCard variant="accent" icon={<DollarSign size={20} />} label="Avg Net Salary" value={fmtCurrency(stats.avgSalary)} />
      </div>

      {/* Toolbar */}
      <div className={`${CARD_CLS} p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search teachers…"
              className="h-10 w-full rounded-xl bg-[#edeeef] border-none pl-9 pr-8 text-sm text-[#1a1c1c] placeholder-[#9ca3af] outline-none focus:ring-2 focus:ring-[#004649]/20"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6f7979] hover:text-[#1a1c1c]"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-[#edeeef] p-1">
            <button
              onClick={() => setView('grid')}
              className={`rounded-lg p-1.5 transition-colors ${view === 'grid' ? 'bg-gradient-to-br from-[#004649] to-[#1b5e62] text-white shadow-sm' : 'text-[#6f7979] hover:text-[#1a1c1c]'}`}
            >
              <Grid3X3 size={15} />
            </button>
            <button
              onClick={() => setView('table')}
              className={`rounded-lg p-1.5 transition-colors ${view === 'table' ? 'bg-gradient-to-br from-[#004649] to-[#1b5e62] text-white shadow-sm' : 'text-[#6f7979] hover:text-[#1a1c1c]'}`}
            >
              <List size={15} />
            </button>
          </div>
          <Button onClick={openAdd}>
            <Plus size={16} /> Add Teacher
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        view === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className={`${CARD_CLS} animate-pulse p-8 text-center text-sm text-[#6f7979]`}>
            Loading teachers…
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className={`${CARD_CLS} flex flex-col items-center justify-center px-4 py-16 text-center`}>
          <Users size={40} className="mb-3 text-[#d1d5db]" />
          <p className="mb-1 font-semibold text-[#1a1c1c]">
            {search ? 'No teachers matched' : 'No teachers yet'}
          </p>
          <p className="mb-5 text-sm text-[#6f7979]">
            {search ? 'Try a different search term.' : 'Add your first teacher to get started.'}
          </p>
          {!search && (
            <Button onClick={openAdd} size="lg">
              <Plus size={16} /> Add Teacher
            </Button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map(t => {
            const bg = avatarColor(t.user.fullName);
            return (
              <div key={t.id} className={`flex flex-col ${CARD_CLS} p-4`}>
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white"
                      style={{ backgroundColor: bg }}
                    >
                      {initials(t.user.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#1a1c1c]">{t.user.fullName}</p>
                      <p className="truncate text-xs text-[#6f7979]">{t.specialization || 'No position'}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${t.user.isActive ? 'bg-[#22c55e]' : 'bg-[#d1d5db]'}`}
                    />
                    <div className="hidden md:block">
                      <ActionMenu
                        onViewProfile={() => router.push(`/admin/teachers/${t.id}`)}
                        onEdit={() => openEdit(t)}
                        onMessage={() => router.push(`/admin/messages?recipientId=${t.user.id}`)}
                        onViewClasses={() => router.push(`/admin/teachers/${t.id}/classes`)}
                        onSuspend={() => setDeleteTarget(t)}
                        onShare={() => setShareTarget(t)}
                        onDelete={() => setDeleteTarget(t)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileActionTeacher(t)}
                      className="rounded-lg p-1.5 text-[#6f7979] hover:bg-[#f3f4f5] hover:text-[#1a1c1c] md:hidden"
                      aria-label="Open teacher actions"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>

                {t.qualification && (
                  <span className="mb-2 self-start rounded-lg bg-[#f3f4f5] px-2 py-0.5 text-[10px] text-[#6f7979]">
                    {t.qualification}
                  </span>
                )}

                <div className="mb-3 flex flex-wrap gap-1">
                  {t.classAssignments.slice(0, 3).map(ca => (
                    <span
                      key={ca.classId}
                      className="rounded-lg border border-[#004649]/20 bg-[#004649]/10 px-2 py-0.5 text-[10px] font-medium text-[#004649]"
                    >
                      {ca.class.name}-{ca.class.section}
                    </span>
                  ))}
                  {t.classAssignments.length > 3 && (
                    <span className="rounded-lg bg-[#f3f4f5] px-2 py-0.5 text-[10px] text-[#6f7979]">
                      +{t.classAssignments.length - 3}
                    </span>
                  )}
                  {t.classAssignments.length === 0 && (
                    <span className="text-[10px] text-[#9ca3af]">No classes assigned</span>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-[#f3f4f5] pt-3">
                  <span className="text-xs text-[#6f7979]">Net Salary</span>
                  <span className="text-sm font-bold text-[#1a1c1c]">
                    {fmtCurrency(t.compensation?.netSalary ?? 0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`overflow-x-auto ${CARD_CLS}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f3f4f5]">
                {['Teacher', 'Position', 'Classes', 'Net Salary', 'Status', ''].map(col => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-[#6f7979]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((t, idx) => {
                const bg = avatarColor(t.user.fullName);
                return (
                  <tr
                    key={t.id}
                    className={`transition-colors hover:bg-[#f9fafb] ${idx < paged.length - 1 ? 'border-b border-[#f3f4f5]' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                          style={{ backgroundColor: bg }}
                        >
                          {initials(t.user.fullName)}
                        </div>
                        <div>
                          <p className="font-semibold text-[#1a1c1c]">{t.user.fullName}</p>
                          <p className="text-xs text-[#6f7979]">{t.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-[#6f7979]">
                      {t.specialization || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {t.classAssignments.slice(0, 2).map(ca => (
                          <span key={ca.classId} className="rounded bg-[#004649]/10 px-1.5 py-0.5 text-[10px] text-[#004649]">
                            {ca.class.name}-{ca.class.section}
                          </span>
                        ))}
                        {t.classAssignments.length > 2 && (
                          <span className="rounded bg-[#f3f4f5] px-1.5 py-0.5 text-[10px] text-[#6f7979]">
                            +{t.classAssignments.length - 2}
                          </span>
                        )}
                        {t.classAssignments.length === 0 && <span className="text-xs text-[#9ca3af]">—</span>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#1a1c1c]">
                      {fmtCurrency(t.compensation?.netSalary ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          t.user.isActive ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#f3f4f5] text-[#6f7979]'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${t.user.isActive ? 'bg-[#22c55e]' : 'bg-[#9ca3af]'}`} />
                        {t.user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="hidden md:block">
                        <ActionMenu
                          onViewProfile={() => router.push(`/admin/teachers/${t.id}`)}
                          onEdit={() => openEdit(t)}
                          onMessage={() => router.push(`/admin/messages?recipientId=${t.user.id}`)}
                          onViewClasses={() => router.push(`/admin/teachers/${t.id}/classes`)}
                          onSuspend={() => setDeleteTarget(t)}
                          onShare={() => setShareTarget(t)}
                          onDelete={() => setDeleteTarget(t)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setMobileActionTeacher(t)}
                        className="rounded-lg p-1.5 text-[#6f7979] hover:bg-[#f3f4f5] hover:text-[#1a1c1c] md:hidden"
                        aria-label="Open teacher actions"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#6f7979]">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg p-2 text-[#6f7979] hover:bg-[#f3f4f5] hover:text-[#1a1c1c] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .reduce<(number | '…')[]>((acc, n, i, arr) => {
                if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('…');
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) =>
                n === '…' ? (
                  <span key={`el-${i}`} className="px-1 text-xs text-[#6f7979]">…</span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n as number)}
                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors ${
                      page === n
                        ? 'bg-gradient-to-br from-[#004649] to-[#1b5e62] text-white shadow-sm'
                        : 'text-[#6f7979] hover:bg-[#f3f4f5] hover:text-[#1a1c1c]'
                    }`}
                  >
                    {n}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg p-2 text-[#6f7979] hover:bg-[#f3f4f5] hover:text-[#1a1c1c] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Overlays */}
      <Drawer
        open={drawerOpen}
        editId={editId}
        form={form}
        setForm={setForm}
        classes={classes}
        saving={saving}
        error={formError}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
      />
      {deleteTarget && (
        <DeleteModal
          teacher={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
      {shareTarget && (
        <ShareModal teacher={shareTarget} onClose={() => setShareTarget(null)} />
      )}
      {mobileActionTeacher && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 md:hidden" onClick={() => setMobileActionTeacher(null)}>
          <div className="w-full rounded-t-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: avatarColor(mobileActionTeacher.user.fullName) }}
              >
                {initials(mobileActionTeacher.user.fullName)}
              </div>
              <div>
                <p className="font-bold text-[#111827]">{mobileActionTeacher.user.fullName}</p>
                <p className="text-xs text-[#9ca3af]">{mobileActionTeacher.employeeCode}</p>
              </div>
            </div>
            <div className="space-y-0.5">
              <button type="button" onClick={() => { const t = mobileActionTeacher; setMobileActionTeacher(null); router.push(`/admin/teachers/${t.id}`); }} className="flex h-[42px] w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#1a1c2e] transition hover:bg-[#f8fafc]">
                <Eye size={16} /> View Profile
              </button>
              <button type="button" onClick={() => { const t = mobileActionTeacher; setMobileActionTeacher(null); openEdit(t); }} className="flex h-[42px] w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#1a1c2e] transition hover:bg-[#f8fafc]">
                <Pencil size={16} /> Edit
              </button>
              <button type="button" onClick={() => { const t = mobileActionTeacher; setMobileActionTeacher(null); router.push(`/admin/messages?recipientId=${t.user.id}`); }} className="flex h-[42px] w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#1a1c2e] transition hover:bg-[#f8fafc]">
                <MessageSquare size={16} /> Send Message
              </button>
              <button type="button" onClick={() => { const t = mobileActionTeacher; setMobileActionTeacher(null); setShareTarget(t); }} className="flex h-[42px] w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#1a1c2e] transition hover:bg-[#f8fafc]">
                <Share2 size={16} /> Share Credentials
              </button>
              <button type="button" onClick={() => { const t = mobileActionTeacher; setMobileActionTeacher(null); setDeleteTarget(t); }} className="mt-1 flex h-[42px] w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#ef4444] transition hover:bg-[#fef2f2]">
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} remove={removeToast} />
    </div>
  );
}
