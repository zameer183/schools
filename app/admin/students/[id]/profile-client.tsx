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
  Save,
  School,
  Shield,
  User,
  UserCog,
  Users,
  X,
  Loader2
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
    <div className={fullWidth ? 'col-span-full' : ''}>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#f8fafc]">
          <Icon className="h-4 w-4 text-[#6b7280]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">{label}</p>
          {!editMode ? (
            <p className="mt-0.5 text-sm font-medium text-[#111827] leading-snug">
              {value || <span className="text-[#d1d5db]">Not provided</span>}
            </p>
          ) : options ? (
            <select
              value={editValue}
              onChange={(e) => onChange?.(e.target.value)}
              className="mt-0.5 h-9 w-full rounded-xl bg-[#f3f4f5] border-none px-2.5 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#16a34a]/30"
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
              className="mt-0.5 h-9 w-full rounded-xl bg-[#f3f4f5] border-none px-3 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#16a34a]/30"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

const CARD = 'rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)]';

function CardHeader({
  title,
  trailing
}: {
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#f1f5f9] px-5 py-4">
      <h3 className="font-headline text-base font-bold text-[#111827]">{title}</h3>
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
  dueFee
}: Props) {
  const router = useRouter();

  // Profile edit state
  const [editMode, setEditMode] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

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

  // ─── API Handlers ───────────────────────────────────────────────────────────

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
        setProfileMsg(data.error ?? 'Failed to save profile.');
      } else {
        setEditMode(false);
        setProfileMsg('');
        router.refresh();
      }
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
        setClassMsg(data.error ?? 'Failed to save class.');
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
    <div className="space-y-5">

      {/* ── HERO CARD ─────────────────────────────────────────────────────── */}
      <div className={`${CARD} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#dcfce7] to-[#bbf7d0] text-xl font-bold text-[#15803d] ring-4 ring-[#f0fdf4]">
              {initials(student.user.fullName)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline text-xl font-bold text-[#111827]">{student.user.fullName}</h2>
                {student.user.isActive ? (
                  <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold uppercase text-[#15803d]">Active</span>
                ) : (
                  <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[10px] font-bold uppercase text-[#b91c1c]">Inactive</span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-[#6b7280]">{student.user.email}</p>
              <p className="mt-0.5 text-xs text-[#9ca3af]">Admission No: <span className="font-semibold text-[#374151]">{student.admissionNo}</span></p>
            </div>
          </div>

          {/* Right */}
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {!editMode ? (
              <button
                onClick={() => { setEditMode(true); setProfileMsg(''); }}
                className="flex flex-1 items-center justify-center gap-1.5 bg-[#16a34a] text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-[0_4px_12px_rgba(22,163,74,0.3)] hover:bg-[#15803d] transition sm:flex-none"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Profile
              </button>
            ) : (
              <button
                onClick={() => { setEditMode(false); setProfileMsg(''); }}
                className="flex flex-1 items-center justify-center gap-1.5 border border-[#e5e7eb] rounded-xl px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb] transition sm:flex-none"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            )}
            <Link
              href="/admin/students"
              className="flex flex-1 items-center justify-center gap-1.5 border border-[#e5e7eb] rounded-xl px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb] transition sm:flex-none"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Students
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-5 border-t border-[#f1f5f9] pt-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Class */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Class</p>
              <p className="mt-1 font-bold text-[#111827]">
                {student.class ? `${student.class.name} – ${student.class.section}` : 'Not Assigned'}
              </p>
            </div>
            {/* Attendance */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Attendance</p>
              <p className="mt-1 font-bold text-[#111827]">{attPct}%</p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-[#f1f5f9] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${attPct}%`, backgroundColor: attBarColor }}
                />
              </div>
            </div>
            {/* Collected */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Collected</p>
              <p className="mt-1 font-bold text-[#15803d]">{fmtCurrency(collectedFee)}</p>
            </div>
            {/* Due */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Due</p>
              <p className={`mt-1 font-bold ${dueFee > 0 ? 'text-[#b91c1c]' : 'text-[#111827]'}`}>
                {fmtCurrency(dueFee)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN LAYOUT ─────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">

        {/* ══ LEFT COLUMN ══════════════════════════════════════════════════ */}
        <div className="space-y-5">

          {/* STUDENT DETAILS CARD */}
          <div className={CARD}>
            <CardHeader
              title="Student Details"
              trailing={
                editMode ? (
                  <button
                    onClick={saveProfile}
                    disabled={profileSaving}
                    className="flex items-center gap-1.5 bg-[#16a34a] text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-[0_4px_12px_rgba(22,163,74,0.3)] hover:bg-[#15803d] transition disabled:opacity-60"
                  >
                    {profileSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </button>
                ) : null
              }
            />
            <div className="p-5">
              <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
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
                  label="Email"
                  value={student.user.email}
                  editMode={editMode}
                  editValue={pf.email}
                  onChange={(v) => setPf((p) => ({ ...p, email: v }))}
                  inputType="email"
                />
                <InfoField
                  icon={Phone}
                  label="Phone"
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
                  icon={User}
                  label="Father's Name"
                  value={student.fatherName}
                  editMode={editMode}
                  editValue={pf.fatherName}
                  onChange={(v) => setPf((p) => ({ ...p, fatherName: v }))}
                />
                <InfoField
                  icon={CreditCard}
                  label="Aadhar No"
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
                  label="Join Date"
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
                <p className={`mt-4 text-sm font-medium ${profileMsg.toLowerCase().includes('success') || profileMsg === '' ? 'text-[#15803d]' : 'text-[#b91c1c]'}`}>
                  {profileMsg}
                </p>
              )}
            </div>
          </div>

          {/* QUICK LINKS CARD */}
          <div className={CARD}>
            <CardHeader title="Quick Access" />
            <div className="p-5 flex flex-col sm:flex-row gap-3">
              <Link
                href={`/admin/students/${student.id}/attendance`}
                className="h-11 flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#004649] text-white text-sm font-semibold hover:bg-[#1b5e62] transition"
              >
                <Calendar className="h-4 w-4" />
                View Attendance
              </Link>
              <Link
                href={`/admin/students/${student.id}/fees`}
                className="h-11 flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#f0f2f5] text-[#1a1c1c] text-sm font-semibold hover:bg-[#e2e8e8] transition"
              >
                <DollarSign className="h-4 w-4" />
                View Fees
              </Link>
              <Link
                href={`/admin/reports/individual-complete?studentId=${student.id}`}
                className="h-11 flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#f0f2f5] text-[#1a1c1c] text-sm font-semibold hover:bg-[#e2e8e8] transition"
              >
                <BarChart3 className="h-4 w-4" />
                View Progress
              </Link>
            </div>
          </div>

          {/* EXAM RECORDS CARD */}
          <div className={CARD}>
            <CardHeader title="Exam Records" />
            <div className="p-5">
              {results.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <GraduationCap className="h-10 w-10 text-[#d1d5db]" />
                  <p className="text-sm text-[#9ca3af]">No exam results found.</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[680px]">
                      <thead>
                        <tr className="bg-[#fafafa]">
                          <th className="rounded-l-xl px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Exam</th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Type</th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Subject</th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Teacher</th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Marks</th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Grade</th>
                          <th className="rounded-r-xl px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f8fafc]">
                        {results.map((r) => {
                          const parsed = parseExamTitle(r.exam.title);
                          return (
                            <tr key={r.id} className="hover:bg-[#fafafa]">
                              <td className="px-4 py-3 text-sm font-medium text-[#111827]">{parsed.title}</td>
                              <td className="px-4 py-3 text-sm text-[#6b7280]">{parsed.examType}</td>
                              <td className="px-4 py-3 text-sm text-[#374151]">{r.subject.name}</td>
                              <td className="px-4 py-3 text-sm text-[#374151]">{r.exam.createdBy?.user.fullName ?? '—'}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-[#111827]">
                                {r.marksObtained}/{r.exam.totalMarks}
                              </td>
                              <td className="px-4 py-3">
                                <span className="rounded-full bg-[#eff6ff] px-2.5 py-0.5 text-[11px] font-bold text-[#1d4ed8]">
                                  {r.grade}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-[#6b7280]">{fmtDate(r.exam.examDate)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="space-y-3 md:hidden">
                    {results.map((r) => {
                      const parsed = parseExamTitle(r.exam.title);
                      return (
                        <div key={r.id} className="rounded-xl border border-[#f1f5f9] p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-[#111827]">{parsed.title}</p>
                              <p className="mt-0.5 text-xs text-[#6b7280]">{parsed.examType} · {r.subject.name}</p>
                            </div>
                            <span className="rounded-full bg-[#eff6ff] px-2.5 py-0.5 text-[11px] font-bold text-[#1d4ed8]">
                              {r.grade}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-xs text-[#6b7280]">
                            <span>Marks: <strong className="text-[#111827]">{r.marksObtained}/{r.exam.totalMarks}</strong></span>
                            <span>{fmtDate(r.exam.examDate)}</span>
                          </div>
                          {r.exam.createdBy && (
                            <p className="mt-1 text-xs text-[#9ca3af]">Teacher: {r.exam.createdBy.user.fullName}</p>
                          )}
                          {r.remarks && (
                            <p className="mt-2 text-xs text-[#6b7280]">{r.remarks}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* ══ RIGHT COLUMN ══════════════════════════════════════════════════ */}
        <div>
          {/* TABS CARD */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)]">
            {/* Tab nav */}
            <div className="flex border-b border-[#f1f5f9]">
              <button
                onClick={() => setActiveTab('class')}
                className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3.5 text-xs font-semibold transition ${activeTab === 'class' ? 'border-b-2 border-[#16a34a] text-[#16a34a] -mb-px' : 'border-b-2 border-transparent text-[#9ca3af] hover:text-[#374151]'}`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Class
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3.5 text-xs font-semibold transition ${activeTab === 'security' ? 'border-b-2 border-[#16a34a] text-[#16a34a] -mb-px' : 'border-b-2 border-transparent text-[#9ca3af] hover:text-[#374151]'}`}
              >
                <Shield className="h-3.5 w-3.5" />
                Security
              </button>
              <button
                onClick={() => setActiveTab('guardian')}
                className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3.5 text-xs font-semibold transition ${activeTab === 'guardian' ? 'border-b-2 border-[#16a34a] text-[#16a34a] -mb-px' : 'border-b-2 border-transparent text-[#9ca3af] hover:text-[#374151]'}`}
              >
                <Users className="h-3.5 w-3.5" />
                Guardian
              </button>
            </div>

            {/* ── Tab: Class Management ───────────────────────────────── */}
            {activeTab === 'class' && (
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-1">Current Class</p>
                  <div className="rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] px-4 py-3">
                    <p className="text-sm font-bold text-[#15803d]">
                      {student.class ? `${student.class.name} – ${student.class.section}` : 'Not Assigned'}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                    Assign New Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl bg-[#f3f4f5] border-none px-3 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#16a34a]/30"
                  >
                    <option value="">— No Class —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} – {c.section}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={saveClass}
                  disabled={classSaving}
                  className="flex w-full items-center justify-center gap-1.5 bg-[#16a34a] text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-[0_4px_12px_rgba(22,163,74,0.3)] hover:bg-[#15803d] transition disabled:opacity-60"
                >
                  {classSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCog className="h-3.5 w-3.5" />}
                  Save Class
                </button>
                {classMsg && (
                  <p className={`text-sm font-medium ${classMsg.toLowerCase().includes('success') ? 'text-[#15803d]' : 'text-[#b91c1c]'}`}>
                    {classMsg}
                  </p>
                )}
              </div>
            )}

            {/* ── Tab: Security ──────────────────────────────────────── */}
            {activeTab === 'security' && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                    New Password
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="h-10 w-full rounded-xl bg-[#f3f4f5] border-none pl-3 pr-10 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#16a34a]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#374151]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (newPassword.length < 6) {
                      setPwdMsg('Password must be at least 6 characters.');
                      return;
                    }
                    setPwdMsg('');
                    setShowPwdConfirm(true);
                  }}
                  disabled={pwdSaving}
                  className="flex w-full items-center justify-center gap-1.5 bg-[#16a34a] text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-[0_4px_12px_rgba(22,163,74,0.3)] hover:bg-[#15803d] transition disabled:opacity-60"
                >
                  {pwdSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                  Update Password
                </button>
                {pwdMsg && (
                  <p className={`text-sm font-medium ${pwdMsg.toLowerCase().includes('success') ? 'text-[#15803d]' : 'text-[#b91c1c]'}`}>
                    {pwdMsg}
                  </p>
                )}
              </div>
            )}

            {/* ── Tab: Guardian ──────────────────────────────────────── */}
            {activeTab === 'guardian' && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                    Guardian Phone
                  </label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                    <input
                      type="tel"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      placeholder="Guardian phone number"
                      className="h-10 w-full rounded-xl bg-[#f3f4f5] border-none pl-9 pr-3 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#16a34a]/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                    Guardian Email
                  </label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                    <input
                      type="email"
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                      placeholder="Guardian email address"
                      className="h-10 w-full rounded-xl bg-[#f3f4f5] border-none pl-9 pr-3 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#16a34a]/30"
                    />
                  </div>
                </div>
                <button
                  onClick={saveGuardian}
                  disabled={guardianSaving}
                  className="flex w-full items-center justify-center gap-1.5 bg-[#16a34a] text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-[0_4px_12px_rgba(22,163,74,0.3)] hover:bg-[#15803d] transition disabled:opacity-60"
                >
                  {guardianSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Guardian Info
                </button>
                {guardianMsg && (
                  <p className={`text-sm font-medium ${guardianMsg.toLowerCase().includes('success') || guardianMsg.toLowerCase().includes('updated') ? 'text-[#15803d]' : 'text-[#b91c1c]'}`}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fef3c7]">
                <Lock className="h-6 w-6 text-[#d97706]" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[#111827]">Update Password?</h3>
              <p className="mt-2 text-sm text-[#6b7280]">
                You are about to update the password for <strong className="text-[#111827]">{student.user.fullName}</strong>. This action cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowPwdConfirm(false)}
                className="flex-1 border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb] transition"
              >
                Cancel
              </button>
              <button
                onClick={doSavePassword}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#16a34a] text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-[0_4px_12px_rgba(22,163,74,0.3)] hover:bg-[#15803d] transition"
              >
                <Lock className="h-3.5 w-3.5" />
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
