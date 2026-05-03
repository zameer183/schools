'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, BadgeCheck, BookOpen, Calendar, Check,
  ChevronDown, ChevronLeft, ChevronRight,
  DollarSign, Eye, Grid3X3, Hash, KeyRound, Lock, List,
  Mail, MapPin, MessageSquare, MoreVertical, Pencil,
  Phone, School, Search, SlidersHorizontal, Trash2,
  TrendingUp, User, UserCheck, UserPlus, Users, X
} from 'lucide-react';
import { KpiCard, Button, PersonCard } from '@/components/ui';

export type ClassItem = { id: string; name: string; section: string };
export type StudentItem = {
  id: string;
  admissionNo: string;
  createdAt?: string | Date | null;
  dateOfBirth?: string | Date | null;
  joinDate?: string | Date | null;
  currentAddress?: string | null;
  emergencyContact?: string | null;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  fatherName?: string | null;
  aadharNo?: string | null;
  gender?: string | null;
  whatsApp?: string | null;
  schoolName?: string | null;
  rollNumber?: string | null;
  classId?: string | null;
  attendancePercentage?: number;
  feeStatus?: 'PAID' | 'PENDING' | 'PARTIAL' | 'OVERDUE';
  lastActivityAt?: string | Date | null;
  attendance?: Array<{ status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'; date: string | Date }>;
  user: { id: string; fullName: string; email: string; phone?: string | null; isActive?: boolean };
  class?: { id: string; name: string; section: string } | null;
  fees?: Array<{ title: string; amount: string; discount: string; dueDate: string | Date; status?: 'PAID' | 'PENDING' | 'PARTIAL' | 'OVERDUE'; updatedAt?: string | Date }>;
};

type EditFormState = {
  id: string;
  // Student info
  fullName: string; fatherName: string; dateOfBirth: string;
  aadharNo: string; gender: 'MALE' | 'FEMALE' | '';
  // Contact
  whatsappCode: string; whatsappNumber: string; phone: string;
  email: string; currentAddress: string;
  // Institute
  schoolName: string; rollNumber: string; classId: string; joinDate: string;
  // Security
  password: string;
  // Fee config
  feeCategory: string; feeType: string; feeTitle: string;
  fromDate: string; toDate: string; feeAmount: string;
  feeDiscount: string; feeDueDate: string;
  partialFeeSupported: boolean; collectOnMonthStart: boolean;
};

type StatusFilter = 'all' | 'active' | 'inactive' | 'paid' | 'pending' | 'overdue';

const BASE_PAGE_SIZE = 25;

const emptyEditForm: EditFormState = {
  id: '', fullName: '', fatherName: '', dateOfBirth: '', aadharNo: '', gender: '',
  whatsappCode: '+92', whatsappNumber: '', phone: '', email: '', currentAddress: '',
  schoolName: '', rollNumber: '', classId: '', joinDate: '',
  password: '',
  feeCategory: '', feeType: '', feeTitle: 'Monthly Tuition Fee',
  fromDate: '', toDate: '', feeAmount: '', feeDiscount: '0',
  feeDueDate: '', partialFeeSupported: false, collectOnMonthStart: false,
};

const COUNTRY_CODES = [
  { code: '+92', label: 'PK 🇵🇰' }, { code: '+91', label: 'IN 🇮🇳' },
  { code: '+971', label: 'AE 🇦🇪' }, { code: '+1',  label: 'US 🇺🇸' },
  { code: '+44', label: 'GB 🇬🇧' }, { code: '+966', label: 'SA 🇸🇦' },
  { code: '+20', label: 'EG 🇪🇬' },
];
const FEE_CATEGORIES = ['Monthly','Quarterly','Semi-Annual','Annual','One-time','Admission','Exam'];
const FEE_TYPES = ['Tuition Fee','Transport Fee','Exam Fee','Activity Fee','Library Fee','Hostel Fee','Other'];

function parseWhatsApp(raw: string | null | undefined): { code: string; number: string } {
  if (!raw) return { code: '+92', number: '' };
  const codes = ['+971', '+966', '+92', '+91', '+44', '+20', '+1'];
  for (const code of codes) {
    if (raw.startsWith(code)) return { code, number: raw.slice(code.length) };
  }
  return { code: '+92', number: raw };
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function safeDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatLastActivity(value: string | Date | null | undefined) {
  const date = safeDate(value);
  if (!date) return '—';
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))}m ago`;
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))}h ago`;
  if (diff < 604_800_000) return `${Math.max(1, Math.floor(diff / 86_400_000))}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function feeBadgeClass(status: string) {
  if (status === 'PAID') return 'bg-[#dcfce7] text-[#15803d]';
  if (status === 'OVERDUE') return 'bg-[#fee2e2] text-[#b91c1c]';
  return 'bg-[#fff7ed] text-[#b45309]';
}

function attendanceBarColor(pct: number) {
  if (pct >= 75) return '#16a34a';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

function normalizeStudentsData(value: unknown): StudentItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const s = raw as StudentItem;
    const att = Array.isArray(s.attendance) ? s.attendance : [];
    const present = att.filter((r) => r.status === 'PRESENT').length;
    const attendancePercentage = typeof s.attendancePercentage === 'number'
      ? s.attendancePercentage
      : att.length ? Math.round((present / att.length) * 100) : 0;
    return {
      ...s,
      user: { ...s.user, isActive: s.user?.isActive ?? true },
      attendancePercentage,
      feeStatus: s.feeStatus ?? s.fees?.[0]?.status ?? 'PENDING',
      lastActivityAt: s.lastActivityAt ?? att[0]?.date ?? s.fees?.[0]?.updatedAt ?? null
    };
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   StudentActionMenu — self-contained dropdown with keyboard navigation
───────────────────────────────────────────────────────────────────────── */
function StudentActionMenu({
  student,
  onEdit,
  onShare,
  onRemoveClick,
  onMessage,
  onViewAttendance,
  onViewFees,
}: {
  student: StudentItem;
  onEdit: () => void;
  onShare: () => void;
  onRemoveClick: () => void;
  onMessage?: () => void;
  onViewAttendance?: () => void;
  onViewFees?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | HTMLButtonElement | null>>([]);

  type NavItem =
    | { kind: 'link'; label: string; icon: React.ComponentType<{ className?: string }>; href: string; danger?: false }
    | { kind: 'btn';  label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void; danger?: boolean; divider?: boolean };

  const items: NavItem[] = [
    { kind: 'link', label: 'View Profile',       icon: Eye,      href: `/admin/students/${student.id}` },
    { kind: 'btn',  label: 'Edit Student',        icon: Pencil,   onClick: onEdit },
    { kind: 'btn',  label: 'Send Message',        icon: MessageSquare, onClick: onMessage || (() => {}) },
    { kind: 'btn',  label: 'View Attendance',     icon: Calendar, onClick: onViewAttendance || (() => {}) },
    { kind: 'btn',  label: 'View Fees',           icon: DollarSign, onClick: onViewFees || (() => {}) },
    { kind: 'btn',  label: 'Remove Student',      icon: Trash2,   onClick: onRemoveClick, danger: true, divider: true },
  ];

  const close = () => {
    setOpen(false);
    setFocusedIndex(-1);
    buttonRef.current?.focus();
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ESC key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Focus item when index changes
  useEffect(() => {
    if (open && focusedIndex >= 0) itemRefs.current[focusedIndex]?.focus();
  }, [focusedIndex, open]);

  const handleButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setFocusedIndex(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setFocusedIndex(items.length - 1);
    }
  };

  const handleItemKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex((idx + 1) % items.length); }
    else if (e.key === 'ArrowUp')  { e.preventDefault(); setFocusedIndex(idx === 0 ? items.length - 1 : idx - 1); }
    else if (e.key === 'Escape')  close();
  };

  const itemClass = (danger?: boolean) =>
    `flex h-[42px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium outline-none transition-colors focus:ring-2 ${
      danger
        ? 'text-[#ef4444] hover:bg-[#fef2f2] focus:bg-[#fef2f2] focus:ring-[#ef4444]/20'
        : 'text-[#1a1c2e] hover:bg-[#f8fafc] focus:bg-[#f8fafc] focus:ring-[#16a34a]/20'
    }`;

  return (
    <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Student actions"
        onClick={() => { setOpen((p) => !p); setFocusedIndex(-1); }}
        onKeyDown={handleButtonKeyDown}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-[#9ca3af] outline-none transition hover:bg-[#f3f4f5] hover:text-[#374151] focus:ring-2 focus:ring-[#16a34a]/30"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          className="animate-dropdown absolute right-0 top-10 z-40 w-[220px] overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]"
        >
          <div className="p-1.5">
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={item.label}>
                  {item.kind === 'btn' && item.divider ? (
                    <div className="mx-2 my-1.5 border-t border-[#f1f5f9]" />
                  ) : null}

                  {item.kind === 'link' ? (
                    <Link
                      href={item.href}
                      role="menuitem"
                      ref={(el) => { itemRefs.current[i] = el; }}
                      onKeyDown={(e) => handleItemKeyDown(e, i)}
                      onClick={close}
                      className={itemClass(false)}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[#9ca3af]" />
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      ref={(el) => { itemRefs.current[i] = el; }}
                      onKeyDown={(e) => handleItemKeyDown(e, i)}
                      onClick={() => { item.onClick(); close(); }}
                      className={itemClass(item.danger)}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${item.danger ? 'text-[#ef4444]' : 'text-[#9ca3af]'}`} />
                      {item.label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   RemoveConfirmModal
───────────────────────────────────────────────────────────────────────── */
function RemoveConfirmModal({
  student,
  onConfirm,
  onCancel,
}: {
  student: StudentItem;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fef2f2]">
            <Trash2 className="h-6 w-6 text-[#ef4444]" strokeWidth={1.75} />
          </div>
          <h3 className="font-headline mt-4 text-lg font-bold text-[#111827]">Remove Student?</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[#6b7280]">
            This action will permanently remove{' '}
            <span className="font-semibold text-[#111827]">{student.user.fullName}</span>
            &apos;s record. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-2 border-t border-[#f1f5f9] px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-[#e5e7eb] py-2.5 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-[#ef4444] py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(239,68,68,0.25)] transition hover:bg-[#dc2626]"
          >
            Remove Student
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   EmptyState
───────────────────────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="relative mb-6">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7] ring-8 ring-[#f0fdf4]">
          <BookOpen className="h-12 w-12 text-[#86efac]" strokeWidth={1.5} />
        </div>
        <div className="absolute -right-1 -top-1 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-[#fff7ed] text-base">
          🔍
        </div>
      </div>
      <h3 className="font-headline text-xl font-bold text-[#111827]">No students found</h3>
      <p className="mt-2 max-w-xs text-sm text-[#64748b]">
        Try adjusting search terms or filters. Or enroll a new student to get started.
      </p>
      <Link
        href="/admin/students/enroll"
        className="h-10 px-4 py-2.5 text-sm font-medium bg-[#1F5A5C] text-white hover:bg-[#174548] active:scale-[0.98] rounded-lg transition-all inline-flex items-center justify-center gap-2"
      >
        <UserPlus size={16} />
        Enroll Student
      </Link>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Edit modal helpers
───────────────────────────────────────────────────────────────────────── */
const eInputCls = (err?: boolean) =>
  `h-11 w-full rounded-xl border-none px-4 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition-all ${
    err ? 'bg-[#fef2f2] ring-2 ring-[#ef4444]/30' : 'bg-[#f1f5f9] focus:ring-2 focus:ring-[#16a34a]/25 focus:bg-white'
  }`;

const eLabelCls = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#475569]';

function EditToggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        checked ? 'bg-[#16a34a]' : 'bg-[#e2e8f0]'
      }`}
      aria-pressed={checked}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  );
}

function EField({
  label, icon: Icon, children, className = '', err,
}: {
  label: string; icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode; className?: string; err?: string;
}) {
  return (
    <div className={className}>
      <label className={eLabelCls}>{label}</label>
      {Icon ? (
        <div className="relative">
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
          <div className="[&_input]:pl-9 [&_select]:pl-9 [&_textarea]:pl-9">{children}</div>
        </div>
      ) : children}
      {err ? <p className="mt-1 text-xs text-[#ef4444]">⚠ {err}</p> : null}
    </div>
  );
}

function EditClassDropdown({ classes, value, onChange }: {
  classes: ClassItem[]; value: string; onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    if (!q) return classes;
    const lq = q.toLowerCase();
    return classes.filter(c => `${c.name} ${c.section}`.toLowerCase().includes(lq));
  }, [classes, q]);
  const selected = classes.find(c => c.id === value);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex h-11 w-full items-center justify-between rounded-xl border-none px-4 text-sm transition-all ${
          open ? 'bg-white ring-2 ring-[#16a34a]/25' : 'bg-[#f1f5f9] hover:bg-[#e8edf5]'
        }`}
      >
        <span className={selected ? 'text-[#0f172a]' : 'text-[#94a3b8]'}>
          {selected ? `${selected.name} – ${selected.section}` : 'Select class'}
        </span>
        <ChevronDown className={`h-4 w-4 text-[#94a3b8] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-12 z-[60] rounded-xl border border-[#e2e8f0] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="border-b border-[#f1f5f9] p-2">
            <div className="flex items-center gap-2 rounded-lg bg-[#f1f5f9] px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search class…"
                className="w-full bg-transparent text-xs text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0
              ? <p className="px-4 py-3 text-xs text-[#94a3b8]">No classes found</p>
              : filtered.map(c => (
                <button key={c.id} type="button"
                  onClick={() => { onChange(c.id); setOpen(false); setQ(''); }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#f0fdf4] ${
                    value === c.id ? 'bg-[#f0fdf4] font-semibold text-[#16a34a]' : 'text-[#374151]'
                  }`}
                >
                  {c.name} – {c.section}
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   ShareCredentialsModal
───────────────────────────────────────────────────────────────────────── */
function ShareCredentialsModal({
  student,
  onCancel,
}: {
  student: StudentItem;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleShare = async () => {
    const rawWa = student.whatsApp?.trim();
    if (!rawWa) {
      setError('Student WhatsApp number not available');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: student.id, shareCredentials: true, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error ?? 'Failed to fetch credentials'); return; }

      const creds = data?.credentials;
      if (!creds) { setError('Credentials not returned from server'); return; }

      // Strip non-digits (handles +92... → 92...)
      const phone = rawWa.replace(/\D/g, '');
      const msg =
        `Assalamualaikum ${student.user.fullName},\n` +
        `Your login credentials are:\n` +
        `Email: ${creds.email}\n` +
        `Password: ${creds.password}\n` +
        `Please login and keep your credentials secure.`;

      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
      onCancel();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4"
      onClick={onCancel}
    >
      <div
        className="w-full sm:max-w-sm max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-[0_-4px_40px_rgba(0,0,0,0.15)] sm:shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-[#e2e8f0]" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#f1f5f9] px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f0fdf4]">
            <MessageSquare className="h-5 w-5 text-[#16a34a]" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold leading-tight text-[#0f172a]">Share Credentials</p>
            <p className="truncate text-xs text-[#94a3b8]">via WhatsApp</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#94a3b8] transition hover:bg-[#f1f5f9] hover:text-[#374151]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Student identity */}
          <div className="flex items-center gap-3 rounded-2xl bg-[#f8fafc] px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dcfce7] text-sm font-bold text-[#15803d]">
              {initials(student.user.fullName)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-[#111827]">{student.user.fullName}</p>
              <p className="font-mono text-[11px] text-[#9ca3af]">{student.admissionNo}</p>
            </div>
          </div>

          {/* WhatsApp destination */}
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${student.whatsApp ? 'bg-[#f0fdf4]' : 'bg-[#fef2f2]'}`}>
            <MessageSquare className={`h-4 w-4 shrink-0 ${student.whatsApp ? 'text-[#16a34a]' : 'text-[#ef4444]'}`} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">WhatsApp Number</p>
              {student.whatsApp ? (
                <p className="font-semibold text-sm text-[#15803d]">{student.whatsApp}</p>
              ) : (
                <p className="text-sm font-semibold text-[#ef4444]">Not available</p>
              )}
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            {/* Email — read-only */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  value={student.user.email}
                  readOnly
                  className="h-12 w-full rounded-xl border-none bg-[#f1f5f9] pl-9 pr-4 text-sm text-[#0f172a] outline-none cursor-default"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  className="h-12 w-full rounded-xl border-none bg-[#f1f5f9] pl-9 pr-16 text-sm text-[#0f172a] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#16a34a]/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-[#94a3b8] transition hover:bg-[#e2e8f0] hover:text-[#475569]"
                >
                  {showPwd ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-[#94a3b8]">Student&apos;s password will be updated to this value.</p>
            </div>
          </div>

          {/* Message preview */}
          <div className="rounded-xl bg-[#f8fafc] px-4 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Message Preview</p>
            <p className="whitespace-pre-line text-xs leading-relaxed text-[#374151]">
              {`Assalamualaikum ${student.user.fullName},\nYour login credentials are:\nEmail: ${student.user.email}\nPassword: ${showPwd ? password : '••••••••'}\nPlease login and keep your credentials secure.`}
            </p>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-xl bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#ef4444]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}
        </div>

        {/* Footer buttons */}
        <div className="flex gap-2 border-t border-[#f1f5f9] px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading || password.length < 6}
            className="flex-1 rounded-xl border border-[#e5e7eb] py-3 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb] active:scale-[0.98] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={loading}
            className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-[#16a34a] py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(22,163,74,0.25)] transition hover:bg-[#15803d] active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending…
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4" />
                Send on WhatsApp
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Main page client component
───────────────────────────────────────────────────────────────────────── */
export default function AdminStudentsPageClient({
  initialStudents,
  initialClasses,
}: {
  initialStudents: StudentItem[];
  initialClasses: ClassItem[];
}) {
  const router = useRouter();
  const [students, setStudents] = useState<StudentItem[]>(normalizeStudentsData(initialStudents));
  const [classes, setClasses] = useState<ClassItem[]>(initialClasses);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteClassId, setPromoteClassId] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const [removeConfirmStudent, setRemoveConfirmStudent] = useState<StudentItem | null>(null);
  const [shareConfirmStudent, setShareConfirmStudent] = useState<StudentItem | null>(null);
  const [mobileActionStudent, setMobileActionStudent] = useState<StudentItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<EditFormState>(emptyEditForm);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      total: students.length,
      active: students.filter((s) => s.user.isActive).length,
      pendingFees: students.filter((s) => s.feeStatus !== 'PAID').length,
      newThisMonth: students.filter((s) => {
        const d = safeDate(s.createdAt);
        return d !== null && d >= monthStart;
      }).length,
    };
  }, [students]);

  /* ── Filter ── */
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (classFilter && s.classId !== classFilter) return false;
      if (statusFilter === 'active'   && !s.user.isActive)          return false;
      if (statusFilter === 'inactive' &&  s.user.isActive)          return false;
      if (statusFilter === 'paid'     && s.feeStatus !== 'PAID')    return false;
      if (statusFilter === 'pending'  && s.feeStatus === 'PAID')    return false;
      if (statusFilter === 'overdue'  && s.feeStatus !== 'OVERDUE') return false;
      const text = search.trim().toLowerCase();
      if (text) {
        const match =
          s.user.fullName.toLowerCase().includes(text) ||
          s.user.email.toLowerCase().includes(text) ||
          s.admissionNo.toLowerCase().includes(text);
        if (!match) return false;
      }
      return true;
    });
  }, [students, classFilter, search, statusFilter]);

  useEffect(() => { setPage(1); }, [search, classFilter, statusFilter]);

  const PAGE_SIZE = view === 'grid' ? 12 : BASE_PAGE_SIZE;
  const totalPages  = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const pagedStudents = filteredStudents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allPageSelected = pagedStudents.length > 0 && pagedStudents.every((s) => selected.has(s.id));

  /* ── Selection ── */
  const toggleSelect = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelected((prev) => {
      const n = new Set(prev);
      allPageSelected ? pagedStudents.forEach((s) => n.delete(s.id)) : pagedStudents.forEach((s) => n.add(s.id));
      return n;
    });

  const clearSelection = () => setSelected(new Set());

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /* ── Data loaders ── */
  const load = async () => {
    setLoading(true);
    try {
      const [sr, cr] = await Promise.all([fetch('/api/students'), fetch('/api/classes')]);
      const sd = sr.ok ? await sr.json() : [];
      const cd = cr.ok ? await cr.json() : [];
      setStudents(normalizeStudentsData(sd));
      setClasses(Array.isArray(cd) ? cd : []);
    } finally { setLoading(false); }
  };

  const clearFilters = () => { setClassFilter(''); setSearch(''); setStatusFilter('all'); };

  /* ── Edit ── */
  const openEdit = (student: StudentItem) => {
    const wa = parseWhatsApp(student.whatsApp);
    setForm({
      id: student.id,
      fullName: student.user.fullName,
      fatherName: student.fatherName ?? '',
      dateOfBirth: student.dateOfBirth ? String(student.dateOfBirth).slice(0, 10) : '',
      aadharNo: student.aadharNo ?? '',
      gender: (student.gender as 'MALE' | 'FEMALE' | '') || '',
      whatsappCode: wa.code,
      whatsappNumber: wa.number,
      phone: student.user.phone ?? '',
      email: student.user.email,
      currentAddress: student.currentAddress ?? '',
      schoolName: student.schoolName ?? '',
      rollNumber: student.rollNumber ?? '',
      classId: student.classId ?? '',
      joinDate: student.joinDate ? String(student.joinDate).slice(0, 10) : '',
      password: '',
      feeCategory: '', feeType: '', feeTitle: 'Monthly Tuition Fee',
      fromDate: '', toDate: '', feeAmount: '', feeDiscount: '0',
      feeDueDate: new Date().toISOString().slice(0, 10),
      partialFeeSupported: false, collectOnMonthStart: false,
    });
    setEditOpen(true);
    setMessage('');
  };

  const saveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const { whatsappCode, whatsappNumber, ...rest } = form;
      const payload = {
        ...rest,
        whatsApp: whatsappCode && whatsappNumber ? whatsappCode + whatsappNumber : undefined,
      };
      const res = await fetch('/api/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMessage(data?.error ?? 'Unable to update student'); return; }
      setMessage('Student updated.');
      setEditOpen(false);
      setForm(emptyEditForm);
      await load();
    } catch { setMessage('Network error.'); }
    finally { setSaving(false); }
  };

  /* ── Remove ── */
  const removeStudent = async (student: StudentItem) => {
    setMessage('');
    const res = await fetch(`/api/students?id=${student.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage(data?.error ?? 'Unable to delete'); return; }
    setMessage('Student removed.');
    clearSelection();
    await load();
  };

  /* ── Bulk delete ── */
  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.size} student(s)? This cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      await Promise.all(Array.from(selected).map((id) => fetch(`/api/students?id=${id}`, { method: 'DELETE' })));
      clearSelection();
      await load();
      setMessage(`${selected.size} student(s) deleted.`);
    } finally { setBulkLoading(false); }
  };

  /* ── Bulk promote ── */
  const bulkPromote = async () => {
    if (!promoteClassId) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch('/api/students', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, classId: promoteClassId }),
          })
        )
      );
      setShowPromoteModal(false);
      setPromoteClassId('');
      clearSelection();
      await load();
      setMessage(`${selected.size} student(s) promoted.`);
    } finally { setBulkLoading(false); }
  };

  /* ── Share credentials ── */
  const shareCredentials = (student: StudentItem) => {
    setShareConfirmStudent(student);
  };

  /* ── Stats cards config ── */
  /* ════════════════════════════════════════════════════════════════════ */
  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden">

      {/* ── HEADER ── */}
      <section className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b7280]">Student Management</p>
            <h1 className="font-headline mt-1 text-2xl font-bold text-[#111827] sm:text-3xl">Students Dashboard</h1>
            <p className="mt-1 text-sm text-[#64748b]">Manage enrollment records, track attendance and fees, keep credentials organized.</p>
          </div>
          <Link
            href="/admin/students/enroll"
            className="h-10 px-4 py-2.5 text-sm font-medium bg-[#1F5A5C] text-white hover:bg-[#174548] active:scale-[0.98] rounded-lg transition-all inline-flex items-center justify-center gap-2"
          >
            <UserPlus size={16} />
            Enroll Student
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard variant="success" icon={<Users size={20} />} label="Total Students" value={stats.total} />
          <KpiCard variant="primary" icon={<UserCheck size={20} />} label="Active" value={stats.active} />
          <KpiCard variant="accent" icon={<AlertCircle size={20} />} label="Fees Pending" value={stats.pendingFees} />
          <KpiCard variant="danger" icon={<TrendingUp size={20} />} label="New This Month" value={stats.newThisMonth} />
        </div>
      </section>

      {/* ── FILTER BAR ── */}
      <section className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)]">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_180px_auto_auto]">
          <label className="flex h-11 items-center gap-2 rounded-xl bg-[#f3f4f5] px-3 transition focus-within:ring-2 focus-within:ring-[#16a34a]/30">
            <Search className="h-4 w-4 shrink-0 text-[#9ca3af]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or admission ID…"
              className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
            />
            {search ? (
              <button onClick={() => setSearch('')} className="shrink-0 text-[#9ca3af] hover:text-[#374151]">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </label>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="h-11 rounded-xl border-none bg-[#f3f4f5] px-3 text-sm text-[#374151] outline-none focus:ring-2 focus:ring-[#16a34a]/30"
          >
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} – {c.section}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-11 rounded-xl border-none bg-[#f3f4f5] px-3 text-sm text-[#374151] outline-none focus:ring-2 focus:ring-[#16a34a]/30"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="paid">Fee Paid</option>
            <option value="pending">Fee Pending</option>
            <option value="overdue">Fee Overdue</option>
          </select>

          <button
            onClick={clearFilters}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#374151] transition hover:bg-[#f9fafb]"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#6b7280]" />
            Reset
          </button>

          <div className="flex items-center gap-1 rounded-xl bg-[#edeeef] p-1">
            <button
              onClick={() => setView('grid')}
              className={`rounded-lg p-1.5 transition-colors ${view === 'grid' ? 'bg-gradient-to-br from-[#004649] to-[#1b5e62] text-white shadow-sm' : 'text-[#6f7979] hover:text-[#1a1c1c]'}`}
            >
              <Grid3X3 size={15} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`rounded-lg p-1.5 transition-colors ${view === 'list' ? 'bg-gradient-to-br from-[#004649] to-[#1b5e62] text-white shadow-sm' : 'text-[#6f7979] hover:text-[#1a1c1c]'}`}
            >
              <List size={15} />
            </button>
          </div>
        </div>
        {message ? <p className="mt-3 text-sm font-medium text-[#16a34a]">{message}</p> : null}
      </section>

      {/* ── STUDENT LIST ── */}
      <section className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)]">

        {/* List header */}
        <div className="flex items-center justify-between gap-4 border-b border-[#f1f5f9] px-5 py-4">
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={allPageSelected} onChange={toggleAll}
              className="h-4 w-4 rounded accent-[#16a34a]" title="Select all on page" />
            <h2 className="font-headline text-base font-bold text-[#111827]">Student Directory</h2>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 ? (
              <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-semibold text-[#15803d]">
                {selected.size} selected
              </span>
            ) : null}
            <span className="rounded-full bg-[#f3f4f5] px-3 py-1 text-xs font-semibold text-[#374151]">
              {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
            </span>
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-[#f1f5f9] bg-[#f0fdf4] px-5 py-3">
            <span className="text-sm font-semibold text-[#15803d]">{selected.size} selected</span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                onClick={() => router.push('/admin/messages')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#374151] shadow-sm ring-1 ring-[#e5e7eb] transition hover:bg-[#f9fafb]"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Message
              </button>
              <button
                onClick={() => { setPromoteClassId(''); setShowPromoteModal(true); }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#374151] shadow-sm ring-1 ring-[#e5e7eb] transition hover:bg-[#f9fafb]"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Promote Class
              </button>
              <button
                onClick={() => void bulkDelete()}
                disabled={bulkLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#fee2e2] px-3 py-2 text-xs font-semibold text-[#b91c1c] transition hover:bg-[#fecaca] disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
              <button onClick={clearSelection} className="rounded-xl p-2 text-[#9ca3af] transition hover:text-[#374151]">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}

        {view === 'grid' ? (
          // Grid view
          <div className="p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pagedStudents.map((student) => {
                const bg = ['#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#2563eb'][student.user.fullName.charCodeAt(0) % 6];
                return (
                  <div
                    key={student.id}
                    className={`rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm hover:shadow-md transition-shadow ${
                      selected.has(student.id) ? 'ring-2 ring-[#16a34a]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={selected.has(student.id)}
                        onChange={() => toggleSelect(student.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded accent-[#16a34a] mt-1 cursor-pointer"
                      />
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shrink-0 cursor-pointer"
                        style={{ backgroundColor: bg }}
                        onClick={() => toggleSelect(student.id)}
                      >
                        {initials(student.user.fullName)}
                      </div>
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => toggleSelect(student.id)}>
                        <p className="font-semibold text-[#1a1c1c] truncate">{student.user.fullName}</p>
                        <p className="text-xs text-[#6b7280] truncate">{student.class?.name || 'No class'}</p>
                      </div>
                      <div className="hidden md:block">
                        <StudentActionMenu
                          student={student}
                          onEdit={() => {
                            setForm({
                              ...emptyEditForm,
                              id: student.id,
                              fullName: student.user.fullName,
                              email: student.user.email,
                              phone: student.user.phone || '',
                            });
                            setEditOpen(true);
                          }}
                          onShare={() => shareCredentials(student)}
                          onRemoveClick={() => setRemoveConfirmStudent(student)}
                          onMessage={() => router.push('/admin/messages')}
                          onViewAttendance={() => router.push(`/admin/students/${student.id}`)}
                          onViewFees={() => router.push(`/admin/students/${student.id}`)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setMobileActionStudent(student)}
                        className="shrink-0 self-start rounded-xl p-1.5 text-[#9ca3af] hover:bg-[#f3f4f6] md:hidden"
                        aria-label="Open student actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-2 text-xs cursor-pointer" onClick={() => toggleSelect(student.id)}>
                      <div className="flex justify-between">
                        <span className="text-[#6b7280]">Attendance</span>
                        <span className="font-semibold text-[#1a1c1c]">{student.attendancePercentage ?? 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6b7280]">Fee Status</span>
                        <span className={`font-semibold ${
                          student.feeStatus === 'PAID' ? 'text-[#16a34a]' :
                          student.feeStatus === 'PENDING' ? 'text-[#d97706]' :
                          'text-[#dc2626]'
                        }`}>
                          {student.feeStatus || 'PENDING'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // List view
          <>
            {/* Column headers */}
            <div className="hidden border-b border-[#f1f5f9] bg-[#fafafa] px-5 py-2.5 md:grid md:grid-cols-[auto_1fr_220px_160px_44px] md:gap-4 lg:grid-cols-[auto_1fr_240px_180px_44px]">
              <div className="w-10" />
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Student</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Class / Attendance</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Fee / Activity</p>
              <div />
            </div>

            {/* Desktop rows */}
            <div className="hidden divide-y divide-[#f8fafc] md:block">
          {pagedStudents.map((student) => {
            const att = Math.max(0, Math.min(100, student.attendancePercentage ?? 0));
            const feeStatus = student.feeStatus ?? 'PENDING';
            const isSelected = selected.has(student.id);

            return (
              <div
                key={student.id}
                className={`grid grid-cols-[auto_1fr_220px_160px_44px] items-start gap-4 px-5 py-4 transition-colors lg:grid-cols-[auto_1fr_240px_180px_44px] ${
                  isSelected ? 'bg-[#f0fdf4]' : 'hover:bg-[#fafafa]'
                }`}
              >
                {/* Checkbox + Avatar */}
                <div className="flex w-10 flex-col items-center gap-2 pt-0.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(student.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded accent-[#16a34a]"
                  />
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                    isSelected ? 'bg-[#bbf7d0] text-[#15803d]' : 'bg-[#f0fdf4] text-[#16a34a]'
                  }`}>
                    {initials(student.user.fullName)}
                  </div>
                </div>

                {/* Identity */}
                <div className="min-w-0">
                  <Link
                    href={`/admin/students/${student.id}`}
                    className="block truncate font-semibold text-[#111827] transition hover:text-[#16a34a]"
                  >
                    {student.user.fullName}
                  </Link>
                  <p className="mt-0.5 min-w-0 truncate text-xs text-[#9ca3af]" title={student.user.email}>{student.user.email}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      student.user.isActive ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#b91c1c]'
                    }`}>
                      {student.user.isActive ? '● Active' : '● Inactive'}
                    </span>
                    {student.guardianPhone ? (
                      <span className="text-[11px] text-[#9ca3af]">{student.guardianPhone}</span>
                    ) : null}
                  </div>
                </div>

                {/* Class + Attendance */}
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-[#9ca3af]">{student.admissionNo}</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-[#374151]">
                    {student.class ? `${student.class.name} – ${student.class.section}` : 'Not assigned'}
                  </p>
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] text-[#9ca3af]">Attendance</span>
                      <span className="text-[10px] font-semibold text-[#374151]">{att}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#f1f5f9]">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${att}%`, backgroundColor: attendanceBarColor(att) }}
                      />
                    </div>
                  </div>
                </div>

                {/* Fee + Activity */}
                <div className="flex flex-col items-start gap-1">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${feeBadgeClass(feeStatus)}`}>
                    {feeStatus}
                  </span>
                  <p className="text-[11px] text-[#9ca3af]">{formatLastActivity(student.lastActivityAt)}</p>
                </div>

                {/* Action menu */}
                <div className="flex justify-end">
                  <StudentActionMenu
                    student={student}
                    onEdit={() => openEdit(student)}
                    onShare={() => shareCredentials(student)}
                    onRemoveClick={() => setRemoveConfirmStudent(student)}
                    onMessage={() => router.push('/admin/messages')}
                    onViewAttendance={() => router.push(`/admin/students/${student.id}`)}
                    onViewFees={() => router.push(`/admin/students/${student.id}`)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-[#f8fafc] md:hidden">
          {pagedStudents.map((student) => {
            const att = Math.max(0, Math.min(100, student.attendancePercentage ?? 0));
            const feeStatus = student.feeStatus ?? 'PENDING';
            const isSelected = selected.has(student.id);

            const isExpanded = expandedIds.has(student.id);
            const classLabel = student.class ? `${student.class.name}–${student.class.section}` : 'Unassigned';

            return (
              <div key={student.id} className={`p-3 sm:p-4 transition-colors ${isSelected ? 'bg-[#f0fdf4]' : ''}`}>
                {/* Main row — always visible */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(student.id)}
                    className="mt-0.5 h-5 w-5 rounded accent-[#16a34a] shrink-0"
                  />
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isSelected ? 'bg-[#bbf7d0] text-[#15803d]' : 'bg-[#f0fdf4] text-[#16a34a]'
                  }`}>
                    {initials(student.user.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/students/${student.id}`} className="block truncate text-sm font-semibold text-[#111827]">
                      {student.user.fullName}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1 flex-wrap text-xs">
                      <span className="text-[#6b7280]">{classLabel}</span>
                      <span className="text-[#9ca3af]">·</span>
                      <span className="font-semibold" style={{ color: attendanceBarColor(att) }}>{att}%</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${feeBadgeClass(feeStatus)}`}>{feeStatus}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExpand(student.id)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#9ca3af] hover:bg-[#f3f4f6] transition-transform"
                    aria-label="Toggle student details"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileActionStudent(student)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#9ca3af] hover:bg-[#f3f4f6]"
                    aria-label="Open student actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>

                {/* Expanded details — shown on tap */}
                {isExpanded && (
                  <div className="mt-2 ml-[50px] sm:ml-[62px] space-y-1 rounded-lg bg-[#f8fafc] p-2">
                    <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{student.user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                      <Hash className="h-3 w-3 shrink-0" />
                      <span className="font-mono text-[10px]">{student.admissionNo}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${student.user.isActive ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#b91c1c]'}`}>
                        {student.user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        type="button"
                        onClick={() => openEdit(student)}
                        className="text-[#1F5A5C] font-semibold hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#16a34a] border-t-transparent" />
            <span className="ml-2 text-sm text-[#9ca3af]">Loading…</span>
          </div>
        ) : null}
          </>
        )}

        {/* Empty */}
        {!loading && filteredStudents.length === 0 ? <EmptyState /> : null}

        {/* Pagination */}
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-[#f1f5f9] px-5 py-4">
            <p className="text-xs text-[#9ca3af]">
              Showing <span className="font-semibold text-[#374151]">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredStudents.length)}</span> of <span className="font-semibold text-[#374151]">{filteredStudents.length}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f3f4f5] text-[#6b7280] transition hover:bg-[#e9eaeb] disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold transition ${
                      p === page
                        ? 'bg-[#16a34a] text-white shadow-[0_4px_12px_rgba(22,163,74,0.3)]'
                        : 'bg-[#f3f4f5] text-[#6b7280] hover:bg-[#e9eaeb]'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f3f4f5] text-[#6b7280] transition hover:bg-[#e9eaeb] disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {/* ── SHARE CREDENTIALS MODAL ── */}
      {shareConfirmStudent ? (
        <ShareCredentialsModal
          student={shareConfirmStudent}
          onCancel={() => setShareConfirmStudent(null)}
        />
      ) : null}

      {/* ── REMOVE CONFIRM MODAL ── */}
      {removeConfirmStudent ? (
        <RemoveConfirmModal
          student={removeConfirmStudent}
          onConfirm={async () => {
            const s = removeConfirmStudent;
            setRemoveConfirmStudent(null);
            await removeStudent(s);
          }}
          onCancel={() => setRemoveConfirmStudent(null)}
        />
      ) : null}

      {/* ── MOBILE ACTION SHEET ── */}
      {mobileActionStudent ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 md:hidden" onClick={() => setMobileActionStudent(null)}>
          <div className="w-full rounded-t-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0fdf4] text-sm font-bold text-[#16a34a]">
                {initials(mobileActionStudent.user.fullName)}
              </div>
              <div>
                <p className="font-bold text-[#111827]">{mobileActionStudent.user.fullName}</p>
                <p className="text-xs text-[#9ca3af]">{mobileActionStudent.admissionNo}</p>
              </div>
            </div>
            <div className="space-y-0.5">
              <Link
                href={`/admin/students/${mobileActionStudent.id}`}
                className="flex h-[42px] items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#1a1c2e] transition hover:bg-[#f8fafc]"
                onClick={() => setMobileActionStudent(null)}
              >
                <Eye className="h-4 w-4 text-[#9ca3af]" />
                View Profile
              </Link>
              <button
                onClick={() => { const s = mobileActionStudent; setMobileActionStudent(null); openEdit(s); }}
                className="flex h-[42px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-[#1a1c2e] transition hover:bg-[#f8fafc]"
              >
                <Pencil className="h-4 w-4 text-[#9ca3af]" />
                Edit Student
              </button>
              <button
                onClick={() => { setMobileActionStudent(null); router.push('/admin/messages'); }}
                className="flex h-[42px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-[#1a1c2e] transition hover:bg-[#f8fafc]"
              >
                <MessageSquare className="h-4 w-4 text-[#9ca3af]" />
                Send Message
              </button>
              <button
                onClick={() => { const s = mobileActionStudent; setMobileActionStudent(null); router.push(`/admin/students/${s.id}`); }}
                className="flex h-[42px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-[#1a1c2e] transition hover:bg-[#f8fafc]"
              >
                <Calendar className="h-4 w-4 text-[#9ca3af]" />
                View Attendance
              </button>
              <button
                onClick={() => { const s = mobileActionStudent; setMobileActionStudent(null); router.push(`/admin/students/${s.id}`); }}
                className="flex h-[42px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-[#1a1c2e] transition hover:bg-[#f8fafc]"
              >
                <DollarSign className="h-4 w-4 text-[#9ca3af]" />
                View Fees
              </button>
              <button
                onClick={() => { const s = mobileActionStudent; setMobileActionStudent(null); shareCredentials(s); }}
                className="flex h-[42px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-[#1a1c2e] transition hover:bg-[#f8fafc]"
              >
                <KeyRound className="h-4 w-4 text-[#9ca3af]" />
                Share Credentials
              </button>
              <div className="mx-2 my-1.5 border-t border-[#f1f5f9]" />
              <button
                onClick={() => { const s = mobileActionStudent; setMobileActionStudent(null); setRemoveConfirmStudent(s); }}
                className="flex h-[42px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-[#ef4444] transition hover:bg-[#fef2f2]"
              >
                <Trash2 className="h-4 w-4 text-[#ef4444]" />
                Remove Student
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── PROMOTE MODAL ── */}
      {showPromoteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
            <h3 className="font-headline text-lg font-bold text-[#111827]">Promote Students</h3>
            <p className="mt-1 text-sm text-[#6b7280]">
              Move <strong>{selected.size}</strong> student(s) to a new class.
            </p>
            <select
              value={promoteClassId}
              onChange={(e) => setPromoteClassId(e.target.value)}
              className="mt-4 h-11 w-full rounded-xl border-none bg-[#f3f4f5] px-3 text-sm text-[#374151] outline-none focus:ring-2 focus:ring-[#16a34a]/30"
            >
              <option value="">Select target class…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} – {c.section}</option>)}
            </select>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => void bulkPromote()}
                disabled={!promoteClassId || bulkLoading}
                className="flex-1 rounded-xl bg-[#16a34a] py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(22,163,74,0.3)] transition hover:bg-[#15803d] disabled:opacity-50"
              >
                {bulkLoading ? 'Promoting…' : 'Promote'}
              </button>
              <button
                onClick={() => setShowPromoteModal(false)}
                className="flex-1 rounded-xl border border-[#e5e7eb] py-2.5 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── EDIT MODAL ── */}
      {editOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={() => setEditOpen(false)}
        >
          <div
            className="max-h-[96vh] w-full sm:max-w-2xl overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[#f8fafc] shadow-[0_-4px_40px_rgba(0,0,0,0.18)] sm:shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky header */}
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-white px-5 py-4 shadow-[0_1px_0_#f1f5f9]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0fdf4]">
                  <Pencil className="h-4 w-4 text-[#16a34a]" />
                </div>
                <div>
                  <p className="font-semibold leading-tight text-[#0f172a]">Edit Student</p>
                  <p className="min-w-0 max-w-[200px] truncate text-xs text-[#94a3b8]" title={form.fullName}>{form.fullName || 'Update student details'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[#94a3b8] transition hover:bg-[#f1f5f9] hover:text-[#374151]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveStudent} className="space-y-3 p-4 sm:p-5">

              {/* ── Section 1: Student Information ── */}
              <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f0fdf4]">
                    <User className="h-4 w-4 text-[#16a34a]" />
                  </div>
                  <p className="font-semibold text-[#0f172a]">Student Information</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <EField label="Student Name *" icon={User}>
                    <input
                      value={form.fullName}
                      onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                      placeholder="Full name"
                      required
                      className={eInputCls()}
                    />
                  </EField>
                  <EField label="Father Name" icon={Users}>
                    <input
                      value={form.fatherName}
                      onChange={e => setForm(p => ({ ...p, fatherName: e.target.value }))}
                      placeholder="Father's full name"
                      className={eInputCls()}
                    />
                  </EField>
                  <EField label="Date of Birth" icon={Calendar}>
                    <input
                      value={form.dateOfBirth}
                      onChange={e => setForm(p => ({ ...p, dateOfBirth: e.target.value }))}
                      type="date"
                      className={eInputCls()}
                    />
                  </EField>
                  <EField label="Aadhar Number" icon={Hash}>
                    <input
                      value={form.aadharNo}
                      onChange={e => setForm(p => ({ ...p, aadharNo: e.target.value }))}
                      placeholder="XXXX XXXX XXXX"
                      maxLength={14}
                      className={eInputCls()}
                    />
                  </EField>
                </div>
                {/* Gender */}
                <div className="mt-4">
                  <label className={eLabelCls}>Gender</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['MALE', 'FEMALE'] as const).map(g => (
                      <label
                        key={g}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                          form.gender === g
                            ? 'border-[#16a34a] bg-[#f0fdf4]'
                            : 'border-[#e2e8f0] bg-white hover:border-[#bbf7d0]'
                        }`}
                      >
                        <input
                          type="radio" name="edit-gender" value={g}
                          checked={form.gender === g}
                          onChange={() => setForm(p => ({ ...p, gender: g }))}
                          className="hidden"
                        />
                        <div className={`flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 transition-all ${
                          form.gender === g ? 'border-[#16a34a] bg-[#16a34a]' : 'border-[#cbd5e1]'
                        }`}>
                          {form.gender === g && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <span className={`text-sm font-semibold ${form.gender === g ? 'text-[#15803d]' : 'text-[#374151]'}`}>
                          {g === 'MALE' ? '♂ Male' : '♀ Female'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Section 2: Contact Information ── */}
              <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f0f9ff]">
                    <Phone className="h-4 w-4 text-[#0ea5e9]" />
                  </div>
                  <p className="font-semibold text-[#0f172a]">Contact Information</p>
                </div>
                <div className="space-y-4">
                  {/* WhatsApp */}
                  <div>
                    <label className={eLabelCls}>WhatsApp Number</label>
                    <div className="flex gap-2">
                      <select
                        value={form.whatsappCode}
                        onChange={e => setForm(p => ({ ...p, whatsappCode: e.target.value }))}
                        className="h-11 rounded-xl border-none bg-[#f1f5f9] px-2 text-sm text-[#0f172a] outline-none focus:ring-2 focus:ring-[#16a34a]/25 focus:bg-white"
                      >
                        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                      <input
                        value={form.whatsappNumber}
                        onChange={e => setForm(p => ({ ...p, whatsappNumber: e.target.value }))}
                        type="tel"
                        placeholder="3xx xxxxxxx"
                        className={`flex-1 ${eInputCls()}`}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <EField label="Mobile Number" icon={Phone}>
                      <input
                        value={form.phone}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        type="tel"
                        placeholder="+92 3xx xxxxxxx"
                        className={eInputCls()}
                      />
                    </EField>
                    <EField label="Email Address" icon={BadgeCheck}>
                      <input
                        value={form.email}
                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        type="email"
                        placeholder="student@example.com"
                        className={eInputCls()}
                      />
                    </EField>
                  </div>
                  <EField label="Address" icon={MapPin}>
                    <textarea
                      value={form.currentAddress}
                      onChange={e => setForm(p => ({ ...p, currentAddress: e.target.value }))}
                      rows={2}
                      placeholder="Home / residential address"
                      className="w-full rounded-xl border-none bg-[#f1f5f9] px-4 py-3 pl-9 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none resize-none transition-all focus:bg-white focus:ring-2 focus:ring-[#16a34a]/25"
                    />
                  </EField>
                </div>
              </div>

              {/* ── Section 3: Institute Information ── */}
              <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#faf5ff]">
                    <School className="h-4 w-4 text-[#9333ea]" />
                  </div>
                  <p className="font-semibold text-[#0f172a]">Institute Information</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <EField label="School / Institute Name" icon={School} className="sm:col-span-2">
                    <input
                      value={form.schoolName}
                      onChange={e => setForm(p => ({ ...p, schoolName: e.target.value }))}
                      placeholder="e.g. Al-Noor Institute"
                      className={eInputCls()}
                    />
                  </EField>
                  <EField label="Roll Number" icon={Hash}>
                    <input
                      value={form.rollNumber}
                      onChange={e => setForm(p => ({ ...p, rollNumber: e.target.value }))}
                      placeholder="Optional"
                      className={eInputCls()}
                    />
                  </EField>
                  <EField label="Join Date" icon={Calendar}>
                    <input
                      value={form.joinDate}
                      onChange={e => setForm(p => ({ ...p, joinDate: e.target.value }))}
                      type="date"
                      className={eInputCls()}
                    />
                  </EField>
                  <div className="sm:col-span-2">
                    <label className={eLabelCls}>Class / Standard</label>
                    <EditClassDropdown
                      classes={classes}
                      value={form.classId}
                      onChange={id => setForm(p => ({ ...p, classId: id }))}
                    />
                  </div>
                </div>
              </div>

              {/* ── Section 4: Fee Configuration ── */}
              <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <div className="mb-1 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fffbeb]">
                    <DollarSign className="h-4 w-4 text-[#d97706]" />
                  </div>
                  <p className="font-semibold text-[#0f172a]">Fee Configuration</p>
                </div>
                <p className="mb-4 text-xs text-[#94a3b8]">Fill fee amount to add a new fee record for this student.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={eLabelCls}>Fee Category</label>
                    <select
                      value={form.feeCategory}
                      onChange={e => setForm(p => ({ ...p, feeCategory: e.target.value }))}
                      className={`h-11 w-full rounded-xl border-none px-4 text-sm text-[#0f172a] outline-none transition-all bg-[#f1f5f9] focus:ring-2 focus:ring-[#16a34a]/25 focus:bg-white`}
                    >
                      <option value="">Select category</option>
                      {FEE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={eLabelCls}>Fee Type</label>
                    <select
                      value={form.feeType}
                      onChange={e => setForm(p => ({ ...p, feeType: e.target.value }))}
                      className={`h-11 w-full rounded-xl border-none px-4 text-sm text-[#0f172a] outline-none transition-all bg-[#f1f5f9] focus:ring-2 focus:ring-[#16a34a]/25 focus:bg-white`}
                    >
                      <option value="">Select type</option>
                      {FEE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <EField label="Fee Title" className="sm:col-span-2">
                    <input
                      value={form.feeTitle}
                      onChange={e => setForm(p => ({ ...p, feeTitle: e.target.value }))}
                      placeholder="e.g. Monthly Tuition Fee – May"
                      className={eInputCls()}
                    />
                  </EField>
                  <div>
                    <label className={eLabelCls}>From Date</label>
                    <input
                      type="date" value={form.fromDate}
                      onChange={e => setForm(p => ({ ...p, fromDate: e.target.value }))}
                      className={eInputCls()}
                    />
                  </div>
                  <div>
                    <label className={eLabelCls}>To Date</label>
                    <input
                      type="date" value={form.toDate}
                      onChange={e => setForm(p => ({ ...p, toDate: e.target.value }))}
                      className={eInputCls()}
                    />
                  </div>
                  {/* Fee amount — highlighted */}
                  <div className="sm:col-span-2">
                    <label className={eLabelCls}>Fee Amount</label>
                    <div className="relative">
                      <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#16a34a]" />
                      <input
                        type="number" min={0} step="0.01"
                        value={form.feeAmount}
                        onChange={e => setForm(p => ({ ...p, feeAmount: e.target.value }))}
                        placeholder="0.00"
                        className="h-12 w-full rounded-xl border-none bg-[#f0fdf4] pl-9 pr-4 text-base font-semibold text-[#15803d] outline-none ring-2 ring-[#16a34a]/20 transition-all focus:bg-white focus:ring-[#16a34a]/40"
                      />
                    </div>
                  </div>
                  <EField label="Discount" icon={DollarSign}>
                    <input
                      type="number" min={0} step="0.01"
                      value={form.feeDiscount}
                      onChange={e => setForm(p => ({ ...p, feeDiscount: e.target.value }))}
                      placeholder="0.00"
                      className={eInputCls()}
                    />
                  </EField>
                  <div>
                    <label className={eLabelCls}>Due Date</label>
                    <input
                      type="date" value={form.feeDueDate}
                      onChange={e => setForm(p => ({ ...p, feeDueDate: e.target.value }))}
                      className={eInputCls()}
                    />
                  </div>
                </div>
                {/* Payment toggles */}
                <div className="mt-4 space-y-3 rounded-xl bg-[#f8fafc] p-4">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Payment Options</p>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#0f172a]">Partial Fee Supported</p>
                      <p className="text-xs text-[#94a3b8]">Allow student to pay in installments</p>
                    </div>
                    <EditToggle
                      checked={form.partialFeeSupported}
                      onChange={() => setForm(p => ({ ...p, partialFeeSupported: !p.partialFeeSupported }))}
                    />
                  </div>
                  <div className="h-px bg-[#e2e8f0]" />
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#0f172a]">Collect Fee On Month Start</p>
                      <p className="text-xs text-[#94a3b8]">Auto-generate fee record on 1st of each month</p>
                    </div>
                    <EditToggle
                      checked={form.collectOnMonthStart}
                      onChange={() => setForm(p => ({ ...p, collectOnMonthStart: !p.collectOnMonthStart }))}
                    />
                  </div>
                </div>
              </div>

              {/* ── Security ── */}
              <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff7ed]">
                    <Lock className="h-4 w-4 text-[#f59e0b]" />
                  </div>
                  <p className="font-semibold text-[#0f172a]">Security</p>
                </div>
                <div>
                  <label className={eLabelCls}>New Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                    <input
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Leave blank to keep current password"
                      className="h-11 w-full rounded-xl border-none bg-[#f1f5f9] pl-9 pr-16 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#16a34a]/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#94a3b8] transition hover:text-[#475569]"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-[#94a3b8]">Minimum 6 characters if changing password.</p>
                </div>
              </div>

              {/* Error */}
              {message && !message.includes('updated') ? (
                <div className="rounded-xl bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#ef4444]">⚠ {message}</div>
              ) : null}

              {/* Footer */}
              <div className="flex gap-3 pt-1 pb-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 rounded-xl border border-[#e2e8f0] py-2.5 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb]"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#16a34a] to-[#15803d] py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(22,163,74,0.3)] transition hover:shadow-[0_6px_16px_rgba(22,163,74,0.4)] disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
