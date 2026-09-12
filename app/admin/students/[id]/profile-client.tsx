'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Eye,
  EyeOff,
  GraduationCap,
  Hash,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Save,
  School,
  Share2,
  Shield,
  User,
  UserCheck,
  UserCog,
  Users,
  X,
  Loader2,
  ExternalLink
} from 'lucide-react';

const SESSION_EXPIRED_MESSAGE = 'Session expire ho gayi hai. Please admin login dubara karein.';

function redirectToAdminLogin() {
  if (typeof window === 'undefined') return;
  window.setTimeout(() => {
    window.location.href = '/login/admin';
  }, 700);
}

// ─── Types ───────────────────────────────────────────────────────────────────

type StudentData = {
  id: string;
  admissionNo: string;
  dateOfBirth: string | null;
  joinDate: string | null;
  currentAddress: string | null;
  emergencyContact: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  fatherName: string | null;
  gender: string | null;
  aadharNo: string | null;
  rollNumber: string | null;
  whatsApp: string | null;
  schoolName: string | null;
  classId: string | null;
  class: { id: string; name: string; section: string } | null;
  user: { id: string; fullName: string; email: string; phone: string | null; isActive: boolean };
};

type ExamRecord = {
  id: string;
  marksObtained: number;
  grade: string;
  remarks: string | null;
  subject: { name: string };
  exam: {
    title: string;
    examDate: string;
    totalMarks: number;
    createdBy: { user: { fullName: string } } | null;
  };
};

type FeeRecord = {
  id: string;
  title: string;
  dueDate: string;
  amount: number;
  discount: number;
  status: string;
  payments: { amountPaid: number }[];
};

type ClassItem = { id: string; name: string; section: string };

type Props = {
  student: StudentData;
  classes: ClassItem[];
  attendance: Array<{ id: string; date: string; status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'; class: { name: string; section: string } }>;
  results: ExamRecord[];
  fees: FeeRecord[];
  collectedFee: number;
  dueFee: number;
  monthlyFee: number | null;
  classTeacher: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '—';
  }
}

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function parseExamTitle(raw: string): { examType: string; title: string } {
  const match = raw.trim().match(/^\[(.+?)\]\s*(.*)$/);
  if (!match) return { examType: 'Custom', title: raw.trim() };
  return { examType: match[1].trim(), title: (match[2] ?? '').trim() || raw.trim() };
}

function normalizeWhatsAppPk(raw?: string | null) {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  while (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('92')) {
    digits = digits.slice(2);
    if (digits.startsWith('0')) digits = digits.slice(1);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 11 && digits.startsWith('3')) {
    return `+92${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith('3')) {
    return `+92${digits}`;
  }
  return null;
}

function toLocalDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function phoneDigitsForTel(raw?: string | null) {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, '');
  return digits.length >= 7 ? digits : null;
}

function phoneDigitsForWa(raw?: string | null) {
  const normalized = normalizeWhatsAppPk(raw);
  if (normalized) return normalized.replace(/\D/g, '');
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

const ATT_DAY_TONE: Record<string, string> = {
  PRESENT: 'bg-[#dcfce7] text-[#15803d] font-bold border border-[#bbf7d0]',
  ABSENT: 'bg-[#fee2e2] text-[#b91c1c] font-bold border border-[#fecaca]',
  LATE: 'bg-[#fef3c7] text-[#b45309] font-bold border border-[#fde68a]',
  EXCUSED: 'bg-[#dbeafe] text-[#1d4ed8] font-bold border border-[#bfdbfe]'
};

// ─── Sub-components ───────────────────────────────────────────────────────────

type InfoFieldProps = {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  editMode?: boolean;
  editValue?: string;
  onChange?: (v: string) => void;
  inputType?: string;
  options?: { value: string; label: string }[];
  fullWidth?: boolean;
};

function InfoField({
  icon: Icon,
  label,
  value,
  editMode = false,
  editValue = '',
  onChange,
  inputType = 'text',
  options,
  fullWidth = false
}: InfoFieldProps) {
  return (
    <div className={`rounded-xl bg-[#f8fafc] border border-[#e2e8f0]/80 p-3.5 transition hover:border-[#cbd5e1] ${fullWidth ? 'col-span-full' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-[#e2e8f0] shadow-xs text-[#004649]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#64748b]">{label}</p>
          {!editMode ? (
            <p className="mt-1 text-xs sm:text-sm font-semibold text-[#0f172a] leading-snug break-words">
              {value || <span className="text-xs font-normal text-[#94a3b8] italic">Not provided</span>}
            </p>
          ) : options ? (
            <select
              value={editValue}
              onChange={(e) => onChange?.(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl bg-white border border-[#cbd5e1] px-3 text-xs sm:text-sm text-[#0f172a] outline-none focus:ring-2 focus:ring-[#004649]/20 focus:border-[#004649]"
            >
              <option value="">— Select —</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={inputType}
              value={editValue}
              onChange={(e) => onChange?.(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl bg-white border border-[#cbd5e1] px-3 text-xs sm:text-sm text-[#0f172a] outline-none focus:ring-2 focus:ring-[#004649]/20 focus:border-[#004649]"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

const CARD = 'rounded-2xl bg-white border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.04)]';

function CardHeader({
  title,
  trailing
}: {
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#f1f5f9] px-4 py-3.5 sm:px-6 sm:py-4">
      <h3 className="font-headline text-sm sm:text-base font-bold text-[#0f172a]">{title}</h3>
      {trailing}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudentProfileClient({
  student,
  classes,
  attendance,
  results,
  collectedFee,
  dueFee,
  monthlyFee,
  classTeacher
}: Props) {
  const router = useRouter();

  // Profile edit state
  const [editMode, setEditMode] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [isActive, setIsActive] = useState(student.user.isActive);
  const [activeSaving, setActiveSaving] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [pf, setPf] = useState({
    fullName: student.user.fullName,
    email: student.user.email,
    phone: student.user.phone ?? '',
    whatsApp: student.whatsApp ?? '',
    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
    gender: student.gender ?? '',
    fatherName: student.fatherName ?? '',
    aadharNo: student.aadharNo ?? '',
    rollNumber: student.rollNumber ?? '',
    schoolName: student.schoolName ?? '',
    joinDate: student.joinDate ? student.joinDate.slice(0, 10) : '',
    currentAddress: student.currentAddress ?? '',
    emergencyContact: student.emergencyContact ?? ''
  });

  // Tab state
  const [activeTab, setActiveTab] = useState<'class' | 'security' | 'guardian'>('class');

  // Class tab
  const [selectedClass, setSelectedClass] = useState(student.classId ?? '');
  const [classSaving, setClassSaving] = useState(false);
  const [classMsg, setClassMsg] = useState('');

  // Security tab
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPwdConfirm, setShowPwdConfirm] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');

  // Guardian tab
  const [guardianPhone, setGuardianPhone] = useState(student.guardianPhone ?? '');
  const [guardianEmail, setGuardianEmail] = useState(student.guardianEmail ?? '');
  const [guardianSaving, setGuardianSaving] = useState(false);
  const [guardianMsg, setGuardianMsg] = useState('');

  // Attendance computed values
  const attTotal = attendance.length;
  const attPresent = attendance.filter((a) => a.status === 'PRESENT').length;
  const attPct = attTotal ? Math.round((attPresent / attTotal) * 100) : 0;
  const attBarColor = attPct >= 75 ? '#16a34a' : attPct >= 50 ? '#f59e0b' : '#ef4444';

  const callPhone = phoneDigitsForTel(student.user.phone || student.guardianPhone);
  const waPhone = phoneDigitsForWa(student.whatsApp || student.guardianPhone || student.user.phone);
  const classLabel = student.class ? `${student.class.name} – ${student.class.section}` : 'Not Assigned';
  const monthName = calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
  const firstDow = (new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay() + 6) % 7; // Mon=0
  const monthAttMap = new Map(
    attendance
      .filter((row) => {
        const d = new Date(row.date);
        return d.getFullYear() === calMonth.getFullYear() && d.getMonth() === calMonth.getMonth();
      })
      .map((row) => [toLocalDateStr(new Date(row.date)), row.status] as const)
  );
  const monthStats = {
    present: [...monthAttMap.values()].filter((s) => s === 'PRESENT').length,
    absent: [...monthAttMap.values()].filter((s) => s === 'ABSENT').length,
    late: [...monthAttMap.values()].filter((s) => s === 'LATE').length,
    leave: [...monthAttMap.values()].filter((s) => s === 'EXCUSED').length
  };

  // ─── API Handlers ───────────────────────────────────────────────────────────

  async function toggleActive() {
    setActiveSaving(true);
    setProfileMsg('');
    const next = !isActive;
    try {
      const res = await fetch('/api/students', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: student.id, isActive: next })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setProfileMsg(SESSION_EXPIRED_MESSAGE);
        redirectToAdminLogin();
        return;
      }
      if (!res.ok) {
        setProfileMsg(data.error ?? 'Failed to update active status.');
        return;
      }
      setIsActive(next);
      router.refresh();
    } catch {
      setProfileMsg('Network error. Please try again.');
    } finally {
      setActiveSaving(false);
    }
  }

  function shareAttendanceReport() {
    if (!waPhone) return;
    const msg = [
      '📅 Attendance Report',
      '',
      `Student: ${student.user.fullName}`,
      `Class: ${classLabel}`,
      `Month: ${monthName}`,
      '',
      `✅ Present: ${monthStats.present}`,
      `❌ Absent: ${monthStats.absent}`,
      `🕒 Late: ${monthStats.late}`,
      `📋 Leave: ${monthStats.leave}`
    ].join('\n');
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  async function saveProfile() {
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const payload: Record<string, string | null | undefined> = { id: student.id };
      const addIfChanged = (key: string, current: string, original?: string | null) => {
        const normalizedCurrent = current.trim();
        const normalizedOriginal = (original ?? '').trim();
        if (normalizedCurrent !== normalizedOriginal) {
          payload[key] = normalizedCurrent === '' ? null : current;
        }
      };

      addIfChanged('fullName', pf.fullName, student.user.fullName);
      addIfChanged('email', pf.email, student.user.email);
      addIfChanged('phone', pf.phone, student.user.phone);
      addIfChanged('dateOfBirth', pf.dateOfBirth, student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '');
      addIfChanged('gender', pf.gender, student.gender);
      addIfChanged('fatherName', pf.fatherName, student.fatherName);
      addIfChanged('aadharNo', pf.aadharNo, student.aadharNo);
      addIfChanged('rollNumber', pf.rollNumber, student.rollNumber);
      addIfChanged('schoolName', pf.schoolName, student.schoolName);
      addIfChanged('joinDate', pf.joinDate, student.joinDate ? student.joinDate.slice(0, 10) : '');
      addIfChanged('currentAddress', pf.currentAddress, student.currentAddress);
      addIfChanged('emergencyContact', pf.emergencyContact, student.emergencyContact);

      const currentWhatsApp = pf.whatsApp.trim();
      const originalWhatsApp = (student.whatsApp ?? '').trim();
      if (currentWhatsApp !== originalWhatsApp) {
        if (!currentWhatsApp) {
          payload.whatsApp = null;
        } else {
          const normalizedWhatsApp = normalizeWhatsAppPk(currentWhatsApp);
          if (!normalizedWhatsApp) {
            setProfileMsg('WhatsApp number must be like 03xxxxxxxxx, +92xxxxxxxxxx, or 0092xxxxxxxxxx.');
            return;
          }
          payload.whatsApp = normalizedWhatsApp;
        }
      }

      const res = await fetch('/api/students', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.status === 401) {
        setProfileMsg(SESSION_EXPIRED_MESSAGE);
        redirectToAdminLogin();
        return;
      }
      if (!res.ok) {
        setProfileMsg(data.error ?? 'Failed to update profile.');
        return;
      }
      setEditMode(false);
      setProfileMsg('Profile updated successfully.');
      router.refresh();
    } catch {
      setProfileMsg('Network error. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveClass() {
    setClassSaving(true);
    setClassMsg('');
    try {
      const res = await fetch('/api/students', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: student.id, classId: selectedClass || null })
      });
      const data = await res.json();
      if (res.status === 401) {
        setClassMsg(SESSION_EXPIRED_MESSAGE);
        redirectToAdminLogin();
        return;
      }
      if (!res.ok) {
        setClassMsg(data.error ?? 'Failed to update class.');
      } else {
        setClassMsg('Class updated successfully.');
        router.refresh();
      }
    } catch {
      setClassMsg('Network error. Please try again.');
    } finally {
      setClassSaving(false);
    }
  }

  async function doSavePassword() {
    setShowPwdConfirm(false);
    setPwdSaving(true);
    setPwdMsg('');
    try {
      const res = await fetch('/api/students', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: student.id, password: newPassword })
      });
      const data = await res.json();
      if (res.status === 401) {
        setPwdMsg(SESSION_EXPIRED_MESSAGE);
        redirectToAdminLogin();
        return;
      }
      if (!res.ok) {
        setPwdMsg(data.error ?? 'Failed to update password.');
      } else {
        setNewPassword('');
        setPwdMsg('Password updated successfully.');
        router.refresh();
      }
    } catch {
      setPwdMsg('Network error. Please try again.');
    } finally {
      setPwdSaving(false);
    }
  }

  async function saveGuardian() {
    setGuardianSaving(true);
    setGuardianMsg('');
    try {
      const res = await fetch('/api/students', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: student.id, guardianPhone, guardianEmail })
      });
      const data = await res.json();
      if (res.status === 401) {
        setGuardianMsg(SESSION_EXPIRED_MESSAGE);
        redirectToAdminLogin();
        return;
      }
      if (!res.ok) {
        setGuardianMsg(data.error ?? 'Failed to save guardian info.');
      } else {
        setGuardianMsg('Guardian info updated.');
        router.refresh();
      }
    } catch {
      setGuardianMsg('Network error. Please try again.');
    } finally {
      setGuardianSaving(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">

      {/* ── TOP BACK NAVIGATION BAR ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-[#e2e8f0] px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#0f172a] shadow-2xs hover:bg-[#f8fafc] active:scale-[0.98] transition"
        >
          <ArrowLeft className="h-4 w-4 text-[#004649]" />
          <span>Back to Students</span>
        </Link>
        <span className="text-xs font-semibold text-[#64748b] hidden sm:inline">
          Student ID: <span className="font-mono text-[#0f172a]">{student.admissionNo}</span>
        </span>
      </div>

      {/* ── HERO CARD ─────────────────────────────────────────────────────── */}
      <div className={`${CARD} p-4 sm:p-6 overflow-hidden`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          
          {/* Identity Left */}
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#004649] to-[#1b5e62] text-lg sm:text-xl font-bold text-white shadow-sm ring-4 ring-[#e0eff0]">
              {initials(student.user.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-headline text-lg sm:text-2xl font-bold text-[#0f172a] truncate">
                  {student.user.fullName}
                </h1>
                {isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] border border-[#bbf7d0] px-2.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase text-[#15803d]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fee2e2] border border-[#fecaca] px-2.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase text-[#b91c1c]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626]" />
                    Inactive
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs sm:text-sm text-[#64748b] truncate">{student.user.email}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#64748b]">
                <span className="rounded-md bg-[#f1f5f9] px-2 py-0.5 font-medium text-[#475569]">
                  Adm: {student.admissionNo}
                </span>
                {student.rollNumber && (
                  <span className="rounded-md bg-[#f1f5f9] px-2 py-0.5 font-medium text-[#475569]">
                    Roll: {student.rollNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons Right */}
          <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={toggleActive}
              disabled={activeSaving}
              className={`flex-1 sm:flex-none inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3.5 sm:px-4 text-xs sm:text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60 ${
                isActive
                  ? 'border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] hover:bg-[#fee2e2]'
                  : 'border border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d] hover:bg-[#dcfce7]'
              }`}
            >
              {activeSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {isActive ? 'Mark Inactive' : 'Mark Active'}
            </button>
            {!editMode ? (
              <button
                type="button"
                onClick={() => { setEditMode(true); setProfileMsg(''); }}
                className="flex-1 sm:flex-none inline-flex h-10 items-center justify-center gap-1.5 bg-[#16a34a] text-white rounded-xl px-4 text-xs sm:text-sm font-semibold shadow-xs hover:bg-[#15803d] active:scale-[0.98] transition"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setEditMode(false); setProfileMsg(''); }}
                className="flex-1 sm:flex-none inline-flex h-10 items-center justify-center gap-1.5 border border-[#cbd5e1] bg-white text-[#334155] rounded-xl px-4 text-xs sm:text-sm font-semibold hover:bg-[#f8fafc] active:scale-[0.98] transition"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* Class & Stats Summary Banner */}
        <div className="mt-4 sm:mt-5 rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] p-3.5 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Class / Batch</p>
              <p className="mt-0.5 text-sm sm:text-base font-bold text-[#0f172a] truncate">{classLabel}</p>
              <p className="mt-0.5 text-xs text-[#64748b]">
                Teacher: <span className="font-semibold text-[#0f172a]">{classTeacher || '—'}</span>
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 rounded-xl bg-white border border-[#e2e8f0] px-3.5 py-2 shadow-2xs">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#64748b]">Monthly Fee</span>
              <span className="text-base sm:text-lg font-bold text-[#004649]">{monthlyFee != null ? fmtCurrency(monthlyFee) : '—'}</span>
            </div>
          </div>

          <div className="mt-3.5 pt-3.5 border-t border-[#e2e8f0] grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-xl bg-white/70 border border-[#e2e8f0]/80 p-2.5 sm:p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Join Date</p>
              <p className="mt-1 text-xs sm:text-sm font-bold text-[#0f172a] truncate">{fmtDate(student.joinDate)}</p>
            </div>
            <div className="rounded-xl bg-white/70 border border-[#e2e8f0]/80 p-2.5 sm:p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Attendance</p>
                <span className="text-xs sm:text-sm font-bold text-[#0f172a]">{attPct}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                <div className="h-full rounded-full transition-all" style={{ width: `${attPct}%`, backgroundColor: attBarColor }} />
              </div>
            </div>
            <div className="rounded-xl bg-white/70 border border-[#e2e8f0]/80 p-2.5 sm:p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Collected</p>
              <p className="mt-1 text-xs sm:text-sm font-bold text-[#16a34a] truncate">{fmtCurrency(collectedFee)}</p>
            </div>
            <div className="rounded-xl bg-white/70 border border-[#e2e8f0]/80 p-2.5 sm:p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Due Amount</p>
              <p className={`mt-1 text-xs sm:text-sm font-bold truncate ${dueFee > 0 ? 'text-[#dc2626]' : 'text-[#0f172a]'}`}>
                {fmtCurrency(dueFee)}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Contact Action Bar */}
        <div className="mt-3.5 sm:mt-4 grid grid-cols-3 gap-2 sm:flex sm:gap-3">
          <a
            href={callPhone ? `tel:${callPhone}` : undefined}
            aria-disabled={!callPhone}
            className={`inline-flex h-10 sm:h-11 flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-xl text-xs sm:text-sm font-semibold transition active:scale-[0.98] ${
              callPhone ? 'bg-[#004649] text-white hover:bg-[#1b5e62] shadow-2xs' : 'cursor-not-allowed bg-[#f1f5f9] text-[#94a3b8]'
            }`}
            onClick={(e) => { if (!callPhone) e.preventDefault(); }}
          >
            <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Call</span>
          </a>
          <a
            href={waPhone ? `https://wa.me/${waPhone}` : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!waPhone}
            className={`inline-flex h-10 sm:h-11 flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-xl text-xs sm:text-sm font-semibold transition active:scale-[0.98] ${
              waPhone ? 'bg-[#25d366] text-white hover:brightness-95 shadow-2xs' : 'cursor-not-allowed bg-[#f1f5f9] text-[#94a3b8]'
            }`}
            onClick={(e) => { if (!waPhone) e.preventDefault(); }}
          >
            <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>WhatsApp</span>
          </a>
          <Link
            href={`/admin/messages?recipientId=${student.user.id}`}
            className="inline-flex h-10 sm:h-11 flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-white border border-[#e2e8f0] text-xs sm:text-sm font-semibold text-[#0f172a] shadow-2xs hover:bg-[#f8fafc] active:scale-[0.98] transition"
          >
            <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#64748b]" />
            <span>Message</span>
          </Link>
        </div>
      </div>

      {/* ── TWO-COLUMN MAIN CONTENT ───────────────────────────────────────── */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[3fr_2fr]">

        {/* ══ LEFT COLUMN ══════════════════════════════════════════════════ */}
        <div className="space-y-4 sm:space-y-6">

          {/* STUDENT DETAILS CARD */}
          <div className={CARD}>
            <CardHeader
              title="Student Details"
              trailing={
                editMode ? (
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={profileSaving}
                    className="inline-flex items-center gap-1.5 bg-[#16a34a] text-white rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-semibold shadow-xs hover:bg-[#15803d] active:scale-[0.98] transition disabled:opacity-60"
                  >
                    {profileSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    <span>Save Changes</span>
                  </button>
                ) : null
              }
            />
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <InfoField
                  icon={User}
                  label="Full Name"
                  value={student.user.fullName}
                  editMode={editMode}
                  editValue={pf.fullName}
                  onChange={(v) => setPf((p) => ({ ...p, fullName: v }))}
                />
                <InfoField
                  icon={Mail}
                  label="Email Address"
                  value={student.user.email}
                  editMode={editMode}
                  editValue={pf.email}
                  onChange={(v) => setPf((p) => ({ ...p, email: v }))}
                  inputType="email"
                />
                <InfoField
                  icon={Phone}
                  label="Personal Phone"
                  value={student.user.phone}
                  editMode={editMode}
                  editValue={pf.phone}
                  onChange={(v) => setPf((p) => ({ ...p, phone: v }))}
                  inputType="tel"
                />
                <InfoField
                  icon={MessageSquare}
                  label="WhatsApp"
                  value={student.whatsApp}
                  editMode={editMode}
                  editValue={pf.whatsApp}
                  onChange={(v) => setPf((p) => ({ ...p, whatsApp: v }))}
                  inputType="tel"
                />
                <InfoField
                  icon={UserCheck}
                  label="Father's Name"
                  value={student.fatherName}
                  editMode={editMode}
                  editValue={pf.fatherName}
                  onChange={(v) => setPf((p) => ({ ...p, fatherName: v }))}
                />
                <InfoField
                  icon={Users}
                  label="Mother / Guardian Phone"
                  value={student.guardianPhone}
                  editMode={false}
                />
                <InfoField
                  icon={Calendar}
                  label="Date of Birth"
                  value={fmtDate(student.dateOfBirth)}
                  editMode={editMode}
                  editValue={pf.dateOfBirth}
                  onChange={(v) => setPf((p) => ({ ...p, dateOfBirth: v }))}
                  inputType="date"
                />
                <InfoField
                  icon={User}
                  label="Gender"
                  value={student.gender}
                  editMode={editMode}
                  editValue={pf.gender}
                  onChange={(v) => setPf((p) => ({ ...p, gender: v }))}
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Other', label: 'Other' }
                  ]}
                />
                <InfoField
                  icon={CreditCard}
                  label="Aadhaar / ID No"
                  value={student.aadharNo}
                  editMode={editMode}
                  editValue={pf.aadharNo}
                  onChange={(v) => setPf((p) => ({ ...p, aadharNo: v }))}
                />
                <InfoField
                  icon={Hash}
                  label="Roll Number"
                  value={student.rollNumber}
                  editMode={editMode}
                  editValue={pf.rollNumber}
                  onChange={(v) => setPf((p) => ({ ...p, rollNumber: v }))}
                />
                <InfoField
                  icon={School}
                  label="School Name"
                  value={student.schoolName}
                  editMode={editMode}
                  editValue={pf.schoolName}
                  onChange={(v) => setPf((p) => ({ ...p, schoolName: v }))}
                />
                <InfoField
                  icon={Calendar}
                  label="Enrollment Date"
                  value={fmtDate(student.joinDate)}
                  editMode={editMode}
                  editValue={pf.joinDate}
                  onChange={(v) => setPf((p) => ({ ...p, joinDate: v }))}
                  inputType="date"
                />
                <InfoField
                  icon={MapPin}
                  label="Current Address"
                  value={student.currentAddress}
                  editMode={editMode}
                  editValue={pf.currentAddress}
                  onChange={(v) => setPf((p) => ({ ...p, currentAddress: v }))}
                  fullWidth
                />
                <InfoField
                  icon={AlertCircle}
                  label="Emergency Contact"
                  value={student.emergencyContact}
                  editMode={editMode}
                  editValue={pf.emergencyContact}
                  onChange={(v) => setPf((p) => ({ ...p, emergencyContact: v }))}
                  fullWidth
                />
              </div>
              {profileMsg && (
                <div className={`mt-4 rounded-xl p-3 text-xs sm:text-sm font-medium ${profileMsg.toLowerCase().includes('success') || profileMsg === '' ? 'bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d]' : 'bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c]'}`}>
                  {profileMsg}
                </div>
              )}
            </div>
          </div>

          {/* ATTENDANCE SUMMARY CALENDAR */}
          <div className={CARD}>
            <CardHeader
              title="Attendance Summary"
              trailing={
                <Link
                  href={`/admin/students/${student.id}/attendance`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#004649] hover:underline"
                >
                  <span>Full calendar</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              }
            />
            <div className="p-4 sm:p-6">
              
              {/* Month Navigator */}
              <div className="mb-4 flex items-center justify-between rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-1.5 sm:p-2">
                <button
                  type="button"
                  onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-white border border-[#e2e8f0] text-[#0f172a] shadow-2xs hover:bg-[#f1f5f9] transition active:scale-95"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-xs sm:text-sm font-bold text-[#0f172a]">{monthName}</p>
                <button
                  type="button"
                  onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-white border border-[#e2e8f0] text-[#0f172a] shadow-2xs hover:bg-[#f1f5f9] transition active:scale-95"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] sm:text-xs font-bold text-[#64748b]">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>

              {/* Day cells grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {Array.from({ length: firstDow }).map((_, i) => (
                  <div key={`pad-${i}`} className="aspect-square" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = toLocalDateStr(new Date(calMonth.getFullYear(), calMonth.getMonth(), day));
                  const status = monthAttMap.get(dateStr);
                  return (
                    <div
                      key={dateStr}
                      className={`aspect-square flex items-center justify-center rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold transition ${
                        status ? ATT_DAY_TONE[status] : 'bg-[#f8fafc] text-[#94a3b8] hover:bg-[#f1f5f9]'
                      }`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>

              {/* Attendance count pills */}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] p-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#15803d]">Present</p>
                  <p className="mt-0.5 text-base sm:text-lg font-extrabold text-[#15803d]">{monthStats.present}</p>
                </div>
                <div className="rounded-xl bg-[#fef2f2] border border-[#fecaca] p-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#b91c1c]">Absent</p>
                  <p className="mt-0.5 text-base sm:text-lg font-extrabold text-[#b91c1c]">{monthStats.absent}</p>
                </div>
                <div className="rounded-xl bg-[#fffbeb] border border-[#fde68a] p-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#b45309]">Late</p>
                  <p className="mt-0.5 text-base sm:text-lg font-extrabold text-[#b45309]">{monthStats.late}</p>
                </div>
                <div className="rounded-xl bg-[#eff6ff] border border-[#bfdbfe] p-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#1d4ed8]">Leave</p>
                  <p className="mt-0.5 text-base sm:text-lg font-extrabold text-[#1d4ed8]">{monthStats.leave}</p>
                </div>
              </div>

              {/* Attendance action buttons */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={shareAttendanceReport}
                  disabled={!waPhone}
                  className={`h-11 flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-[0.98] ${
                    waPhone
                      ? 'bg-[#25D366]/15 border border-[#25D366]/40 text-[#128C7E] hover:bg-[#25D366]/25 shadow-2xs'
                      : 'cursor-not-allowed bg-[#f1f5f9] border border-[#e2e8f0] text-[#94a3b8]'
                  }`}
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share Report (WhatsApp)</span>
                </button>
                <Link
                  href={`/admin/students/${student.id}/fees`}
                  className="h-11 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#004649] to-[#1b5e62] text-white text-xs sm:text-sm font-bold shadow-2xs hover:shadow-md hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Add New Fee</span>
                </Link>
              </div>
            </div>
          </div>

          {/* QUICK LINKS CARD */}
          <div className={CARD}>
            <CardHeader title="Quick Actions & History" />
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href={`/admin/students/${student.id}/attendance`}
                className="group flex items-center justify-between rounded-2xl bg-white border border-[#e2e8f0] p-4 shadow-2xs hover:border-[#004649]/40 hover:shadow-sm active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e0eff0] text-[#004649]">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#0f172a] group-hover:text-[#004649] transition-colors">Attendance Records</p>
                    <p className="text-[11px] text-[#64748b]">View monthly calendar</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#94a3b8] group-hover:text-[#004649] group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href={`/admin/students/${student.id}/fees`}
                className="group flex items-center justify-between rounded-2xl bg-white border border-[#e2e8f0] p-4 shadow-2xs hover:border-[#16a34a]/40 hover:shadow-sm active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#dcfce7] text-[#16a34a]">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#0f172a] group-hover:text-[#16a34a] transition-colors">Fee & Invoices</p>
                    <p className="text-[11px] text-[#64748b]">History & payments</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#94a3b8] group-hover:text-[#16a34a] group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href={`/admin/reports/individual-complete?studentId=${student.id}`}
                className="group flex items-center justify-between rounded-2xl bg-white border border-[#e2e8f0] p-4 shadow-2xs hover:border-[#0284c7]/40 hover:shadow-sm active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e0f2fe] text-[#0284c7]">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#0f172a] group-hover:text-[#0284c7] transition-colors">Progress Report</p>
                    <p className="text-[11px] text-[#64748b]">Exams & performance</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#94a3b8] group-hover:text-[#0284c7] group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </div>

          {/* EXAM RECORDS CARD */}
          <div className={CARD}>
            <CardHeader title="Exam Records" />
            <div className="p-4 sm:p-6">
              {results.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1f5f9] text-[#94a3b8]">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-[#64748b]">No exam results found for this student.</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[640px]">
                      <thead>
                        <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                          <th className="rounded-l-xl px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Exam</th>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Type</th>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Subject</th>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Teacher</th>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Marks</th>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Grade</th>
                          <th className="rounded-r-xl px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1f5f9]">
                        {results.map((r) => {
                          const parsed = parseExamTitle(r.exam.title);
                          return (
                            <tr key={r.id} className="hover:bg-[#f8fafc] transition">
                              <td className="px-4 py-3 text-xs sm:text-sm font-bold text-[#0f172a]">{parsed.title}</td>
                              <td className="px-4 py-3 text-xs text-[#64748b]">{parsed.examType}</td>
                              <td className="px-4 py-3 text-xs sm:text-sm font-medium text-[#334155]">{r.subject.name}</td>
                              <td className="px-4 py-3 text-xs text-[#64748b]">{r.exam.createdBy?.user.fullName ?? '—'}</td>
                              <td className="px-4 py-3 text-xs sm:text-sm font-bold text-[#0f172a]">
                                {r.marksObtained}/{r.exam.totalMarks}
                              </td>
                              <td className="px-4 py-3">
                                <span className="rounded-full bg-[#eff6ff] border border-[#bfdbfe] px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-[#1d4ed8]">
                                  {r.grade}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-[#64748b]">{fmtDate(r.exam.examDate)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="space-y-2.5 md:hidden">
                    {results.map((r) => {
                      const parsed = parseExamTitle(r.exam.title);
                      return (
                        <div key={r.id} className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3.5 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-[#0f172a] truncate">{parsed.title}</p>
                              <p className="mt-0.5 text-[11px] text-[#64748b]">{parsed.examType} · {r.subject.name}</p>
                            </div>
                            <span className="rounded-full bg-[#eff6ff] border border-[#bfdbfe] px-2.5 py-0.5 text-[10px] font-bold text-[#1d4ed8]">
                              Grade {r.grade}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-[#64748b] pt-1 border-t border-[#e2e8f0]/80">
                            <span>Score: <strong className="font-bold text-[#0f172a]">{r.marksObtained}/{r.exam.totalMarks}</strong></span>
                            <span>{fmtDate(r.exam.examDate)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* ══ RIGHT COLUMN (TABS CARD) ══════════════════════════════════════ */}
        <div>
          <div className={`${CARD} overflow-hidden`}>
            
            {/* Tab nav Segmented Control */}
            <div className="p-3 sm:p-4 bg-[#f8fafc] border-b border-[#e2e8f0]">
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-[#f1f5f9] p-1.5 border border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setActiveTab('class')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all active:scale-[0.98] ${
                    activeTab === 'class'
                      ? 'bg-white text-[#004649] shadow-xs border border-[#e2e8f0]'
                      : 'text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Class</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all active:scale-[0.98] ${
                    activeTab === 'security'
                      ? 'bg-white text-[#004649] shadow-xs border border-[#e2e8f0]'
                      : 'text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Security</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('guardian')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all active:scale-[0.98] ${
                    activeTab === 'guardian'
                      ? 'bg-white text-[#004649] shadow-xs border border-[#e2e8f0]'
                      : 'text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Guardian</span>
                </button>
              </div>
            </div>

            {/* ── Tab: Class Management ───────────────────────────────── */}
            {activeTab === 'class' && (
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] mb-1.5">Current Enrolled Class</p>
                  <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] border border-[#e2e8f0] px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e0eff0] text-[#004649]">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-[#0f172a] truncate">
                        {student.class ? `${student.class.name} – ${student.class.section}` : 'Not Assigned'}
                      </span>
                    </div>
                    <span className="rounded-md bg-[#dcfce7] border border-[#bbf7d0] px-2 py-0.5 text-[10px] font-bold text-[#15803d]">Enrolled</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                    Assign Different Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl bg-white border border-[#cbd5e1] px-3.5 text-xs sm:text-sm text-[#0f172a] outline-none focus:ring-2 focus:ring-[#004649]/20 focus:border-[#004649]"
                  >
                    <option value="">— Select Class —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} – {c.section}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={saveClass}
                  disabled={classSaving}
                  className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-[#004649] to-[#1b5e62] text-white rounded-xl h-11 text-xs sm:text-sm font-bold shadow-2xs hover:shadow-md hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {classSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />}
                  <span>Save Class Assignment</span>
                </button>
                {classMsg && (
                  <p className={`text-xs sm:text-sm font-medium ${classMsg.toLowerCase().includes('success') ? 'text-[#15803d]' : 'text-[#b91c1c]'}`}>
                    {classMsg}
                  </p>
                )}
              </div>
            )}

            {/* ── Tab: Security ──────────────────────────────────────── */}
            {activeTab === 'security' && (
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                    Set New Password
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="h-11 w-full rounded-xl bg-white border border-[#cbd5e1] pl-3.5 pr-10 text-xs sm:text-sm text-[#0f172a] outline-none focus:ring-2 focus:ring-[#004649]/20 focus:border-[#004649]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (newPassword.length < 6) {
                      setPwdMsg('Password must be at least 6 characters.');
                      return;
                    }
                    setPwdMsg('');
                    setShowPwdConfirm(true);
                  }}
                  disabled={pwdSaving}
                  className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-[#004649] to-[#1b5e62] text-white rounded-xl h-11 text-xs sm:text-sm font-bold shadow-2xs hover:shadow-md hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {pwdSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  <span>Update Password</span>
                </button>
                {pwdMsg && (
                  <p className={`text-xs sm:text-sm font-medium ${pwdMsg.toLowerCase().includes('success') ? 'text-[#15803d]' : 'text-[#b91c1c]'}`}>
                    {pwdMsg}
                  </p>
                )}
              </div>
            )}

            {/* ── Tab: Guardian ──────────────────────────────────────── */}
            {activeTab === 'guardian' && (
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                    Guardian Phone Number
                  </label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                    <input
                      type="tel"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      placeholder="e.g. +92 300 1234567"
                      className="h-11 w-full rounded-xl bg-white border border-[#cbd5e1] pl-10 pr-3.5 text-xs sm:text-sm text-[#0f172a] outline-none focus:ring-2 focus:ring-[#004649]/20 focus:border-[#004649]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                    Guardian Email Address
                  </label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                    <input
                      type="email"
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                      placeholder="guardian@example.com"
                      className="h-11 w-full rounded-xl bg-white border border-[#cbd5e1] pl-10 pr-3.5 text-xs sm:text-sm text-[#0f172a] outline-none focus:ring-2 focus:ring-[#004649]/20 focus:border-[#004649]"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={saveGuardian}
                  disabled={guardianSaving}
                  className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-[#004649] to-[#1b5e62] text-white rounded-xl h-11 text-xs sm:text-sm font-bold shadow-2xs hover:shadow-md hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {guardianSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Save Guardian Info</span>
                </button>
                {guardianMsg && (
                  <p className={`text-xs sm:text-sm font-medium ${guardianMsg.toLowerCase().includes('success') || guardianMsg.toLowerCase().includes('updated') ? 'text-[#15803d]' : 'text-[#b91c1c]'}`}>
                    {guardianMsg}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PASSWORD CONFIRM MODAL ────────────────────────────────────────── */}
      {showPwdConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-[#e2e8f0]">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-[#fef3c7] border border-[#fde68a]">
                <Lock className="h-6 w-6 text-[#d97706]" />
              </div>
              <h3 className="mt-3 text-base sm:text-lg font-bold text-[#0f172a]">Update Password?</h3>
              <p className="mt-1.5 text-xs sm:text-sm text-[#64748b]">
                You are about to update the login password for <strong className="text-[#0f172a]">{student.user.fullName}</strong>.
              </p>
            </div>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowPwdConfirm(false)}
                className="flex-1 h-10 border border-[#cbd5e1] rounded-xl text-xs sm:text-sm font-semibold text-[#334155] hover:bg-[#f8fafc] active:scale-[0.98] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doSavePassword}
                className="flex-1 h-10 flex items-center justify-center gap-1.5 bg-[#16a34a] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:bg-[#15803d] active:scale-[0.98] transition"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Confirm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
