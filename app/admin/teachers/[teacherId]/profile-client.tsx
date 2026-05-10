'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  Pencil,
  Phone,
  Save,
  Shield,
  User,
  Users,
  X,
  Loader2,
  Hash,
  Layers
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ClassAssignment = {
  isClassLead: boolean;
  class: {
    id: string;
    name: string;
    section: string;
    academicYear: string;
    _count: { students: number };
  };
};

type Subject = {
  id: string;
  name: string;
  code: string;
  class: { name: string; section: string };
};

type AccessControl = { module: string; enabled: boolean };

type TeacherData = {
  id: string;
  employeeCode: string;
  qualification: string | null;
  specialization: string | null;
  joiningDate: string | null;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    isActive: boolean;
  };
  classAssignments: ClassAssignment[];
  subjects: Subject[];
  accessControls: AccessControl[];
  compensation: { baseSalary: number; bonus: number; deduction: number } | null;
};

type ClassItem = { id: string; name: string; section: string; academicYear: string };

type Props = {
  teacher: TeacherData;
  allClasses: ClassItem[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

// ─── Sub-components ───────────────────────────────────────────────────────────

type InfoFieldProps = {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  editMode?: boolean;
  editValue?: string;
  onChange?: (v: string) => void;
  inputType?: string;
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
          ) : (
            <input
              type={inputType}
              value={editValue}
              onChange={(e) => onChange?.(e.target.value)}
              className="mt-0.5 h-9 w-full rounded-xl bg-[#f3f4f5] border-none px-3 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#2b676e]/30"
            />
          )}
        </div>
      </div>
    </div>
  );
}

const CARD = 'rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)]';

function CardHeader({ title, trailing }: { title: string; trailing?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[#f1f5f9] px-5 py-4">
      <h3 className="font-headline text-base font-bold text-[#111827]">{title}</h3>
      {trailing}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeacherProfileClient({ teacher, allClasses }: Props) {
  const router = useRouter();

  const [editMode, setEditMode] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [pf, setPf] = useState({
    fullName: teacher.user.fullName,
    email: teacher.user.email,
    phone: teacher.user.phone ?? '',
    qualification: teacher.qualification ?? '',
    specialization: teacher.specialization ?? '',
    joiningDate: teacher.joiningDate ? teacher.joiningDate.slice(0, 10) : '',
    employeeCode: teacher.employeeCode
  });

  const [activeTab, setActiveTab] = useState<'classes' | 'subjects' | 'security'>('classes');

  // Classes tab
  const assignedClassIds = teacher.classAssignments.map((ca) => ca.class.id);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(assignedClassIds);
  const [classSaving, setClassSaving] = useState(false);
  const [classMsg, setClassMsg] = useState('');

  // Security tab
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPwdConfirm, setShowPwdConfirm] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');

  // Stats
  const totalStudents = teacher.classAssignments.reduce((s, ca) => s + ca.class._count.students, 0);
  const netSalary = teacher.compensation
    ? teacher.compensation.baseSalary + teacher.compensation.bonus - teacher.compensation.deduction
    : null;

  // ─── Handlers ────────────────────────────────────────────────────────────────

  async function saveProfile() {
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const res = await fetch('/api/teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: teacher.id,
          fullName: pf.fullName,
          email: pf.email,
          phone: pf.phone,
          qualification: pf.qualification,
          specialization: pf.specialization,
          joiningDate: pf.joiningDate || null,
          employeeCode: pf.employeeCode
        })
      });
      const data = await res.json();
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

  function toggleClass(classId: string) {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  }

  async function saveClasses() {
    setClassSaving(true);
    setClassMsg('');
    try {
      const res = await fetch('/api/teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: teacher.id, classIds: selectedClassIds })
      });
      const data = await res.json();
      if (!res.ok) {
        setClassMsg(data.error ?? 'Failed to save classes.');
      } else {
        setClassMsg('Classes updated successfully.');
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
      const res = await fetch('/api/teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: teacher.id, password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdMsg(data.error ?? 'Failed to update password.');
      } else {
        setNewPassword('');
        setPwdMsg('Password updated successfully.');
      }
    } catch {
      setPwdMsg('Network error. Please try again.');
    } finally {
      setPwdSaving(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── HERO CARD ─────────────────────────────────────────────────────── */}
      <div className={`${CARD} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d0e8ea] to-[#a8d0d4] text-xl font-bold text-[#2b676e] ring-4 ring-[#eaf4f5]">
              {initials(teacher.user.fullName)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline text-xl font-bold text-[#111827]">{teacher.user.fullName}</h2>
                {teacher.user.isActive ? (
                  <span className="rounded-full bg-[#d0e8ea] px-2 py-0.5 text-[10px] font-bold uppercase text-[#2b676e]">Active</span>
                ) : (
                  <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[10px] font-bold uppercase text-[#b91c1c]">Inactive</span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-[#6b7280]">{teacher.user.email}</p>
              <p className="mt-0.5 text-xs text-[#9ca3af]">
                Employee Code: <span className="font-semibold text-[#374151]">{teacher.employeeCode}</span>
              </p>
            </div>
          </div>

          {/* Right buttons */}
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {!editMode ? (
              <button
                onClick={() => { setEditMode(true); setProfileMsg(''); }}
                className="flex flex-1 items-center justify-center gap-1.5 bg-[#2b676e] text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-[0_4px_12px_rgba(43,103,110,0.3)] hover:bg-[#1a5058] transition sm:flex-none"
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
              href="/admin/teachers"
              className="flex flex-1 items-center justify-center gap-1.5 border border-[#e5e7eb] rounded-xl px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb] transition sm:flex-none"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Teachers
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-5 border-t border-[#f1f5f9] pt-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Classes</p>
              <p className="mt-1 font-bold text-[#111827]">{teacher.classAssignments.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Students</p>
              <p className="mt-1 font-bold text-[#111827]">{totalStudents}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Subjects</p>
              <p className="mt-1 font-bold text-[#111827]">{teacher.subjects.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Net Salary</p>
              <p className="mt-1 font-bold text-[#2b676e]">
                {netSalary !== null ? fmtCurrency(netSalary) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN LAYOUT ─────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">

        {/* ══ LEFT: Teacher Details ══════════════════════════════════════════ */}
        <div className="space-y-5">
          <div className={CARD}>
            <CardHeader
              title="Teacher Details"
              trailing={
                editMode ? (
                  <button
                    onClick={saveProfile}
                    disabled={profileSaving}
                    className="flex items-center gap-1.5 bg-[#2b676e] text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-[0_4px_12px_rgba(43,103,110,0.3)] hover:bg-[#1a5058] transition disabled:opacity-60"
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
                  value={teacher.user.fullName}
                  editMode={editMode}
                  editValue={pf.fullName}
                  onChange={(v) => setPf((p) => ({ ...p, fullName: v }))}
                />
                <InfoField
                  icon={Mail}
                  label="Email"
                  value={teacher.user.email}
                  editMode={editMode}
                  editValue={pf.email}
                  onChange={(v) => setPf((p) => ({ ...p, email: v }))}
                  inputType="email"
                />
                <InfoField
                  icon={Phone}
                  label="Phone"
                  value={teacher.user.phone}
                  editMode={editMode}
                  editValue={pf.phone}
                  onChange={(v) => setPf((p) => ({ ...p, phone: v }))}
                  inputType="tel"
                />
                <InfoField
                  icon={Hash}
                  label="Employee Code"
                  value={teacher.employeeCode}
                  editMode={editMode}
                  editValue={pf.employeeCode}
                  onChange={(v) => setPf((p) => ({ ...p, employeeCode: v }))}
                />
                <InfoField
                  icon={GraduationCap}
                  label="Qualification"
                  value={teacher.qualification}
                  editMode={editMode}
                  editValue={pf.qualification}
                  onChange={(v) => setPf((p) => ({ ...p, qualification: v }))}
                />
                <InfoField
                  icon={Award}
                  label="Specialization"
                  value={teacher.specialization}
                  editMode={editMode}
                  editValue={pf.specialization}
                  onChange={(v) => setPf((p) => ({ ...p, specialization: v }))}
                />
                <InfoField
                  icon={Calendar}
                  label="Joining Date"
                  value={fmtDate(teacher.joiningDate)}
                  editMode={editMode}
                  editValue={pf.joiningDate}
                  onChange={(v) => setPf((p) => ({ ...p, joiningDate: v }))}
                  inputType="date"
                />
              </div>
              {profileMsg && (
                <p className={`mt-4 text-sm font-medium ${profileMsg.toLowerCase().includes('success') ? 'text-[#2b676e]' : 'text-[#b91c1c]'}`}>
                  {profileMsg}
                </p>
              )}
            </div>
          </div>

          {/* Assigned Classes table */}
          <div className={CARD}>
            <CardHeader title="Assigned Classes" />
            <div className="p-5">
              {teacher.classAssignments.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <Layers className="h-10 w-10 text-[#d1d5db]" />
                  <p className="text-sm text-[#9ca3af]">No classes assigned yet.</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[480px]">
                      <thead>
                        <tr className="bg-[#fafafa]">
                          <th className="rounded-l-xl px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Class</th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Section</th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Academic Year</th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Students</th>
                          <th className="rounded-r-xl px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f8fafc]">
                        {teacher.classAssignments.map((ca) => (
                          <tr key={ca.class.id} className="hover:bg-[#fafafa]">
                            <td className="px-4 py-3 text-sm font-medium text-[#111827]">{ca.class.name}</td>
                            <td className="px-4 py-3 text-sm text-[#6b7280]">{ca.class.section}</td>
                            <td className="px-4 py-3 text-sm text-[#6b7280]">{ca.class.academicYear}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-[#111827]">{ca.class._count.students}</td>
                            <td className="px-4 py-3">
                              {ca.isClassLead ? (
                                <span className="rounded-full bg-[#d0e8ea] px-2.5 py-0.5 text-[11px] font-bold text-[#2b676e]">Class Lead</span>
                              ) : (
                                <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[11px] font-bold text-[#6b7280]">Teacher</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="space-y-3 md:hidden">
                    {teacher.classAssignments.map((ca) => (
                      <div key={ca.class.id} className="rounded-xl border border-[#f1f5f9] p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[#111827]">{ca.class.name} – {ca.class.section}</p>
                            <p className="mt-0.5 text-xs text-[#6b7280]">{ca.class.academicYear} · {ca.class._count.students} students</p>
                          </div>
                          {ca.isClassLead ? (
                            <span className="rounded-full bg-[#d0e8ea] px-2.5 py-0.5 text-[11px] font-bold text-[#2b676e]">Lead</span>
                          ) : (
                            <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[11px] font-bold text-[#6b7280]">Teacher</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Subjects */}
          {teacher.subjects.length > 0 && (
            <div className={CARD}>
              <CardHeader title="Subjects" />
              <div className="p-5">
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[400px]">
                    <thead>
                      <tr className="bg-[#fafafa]">
                        <th className="rounded-l-xl px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Subject</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Code</th>
                        <th className="rounded-r-xl px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Class</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f8fafc]">
                      {teacher.subjects.map((s) => (
                        <tr key={s.id} className="hover:bg-[#fafafa]">
                          <td className="px-4 py-3 text-sm font-medium text-[#111827]">{s.name}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[11px] font-mono font-bold text-[#6b7280]">{s.code}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#6b7280]">{s.class.name} – {s.class.section}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap gap-2 md:hidden">
                  {teacher.subjects.map((s) => (
                    <div key={s.id} className="rounded-xl border border-[#f1f5f9] px-3 py-2">
                      <p className="text-sm font-semibold text-[#111827]">{s.name}</p>
                      <p className="text-xs text-[#9ca3af]">{s.code} · {s.class.name} {s.class.section}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ══ RIGHT: Tabs ═══════════════════════════════════════════════════ */}
        <div>
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)]">
            {/* Tab nav */}
            <div className="flex border-b border-[#f1f5f9]">
              {(['classes', 'subjects', 'security'] as const).map((tab) => {
                const icons = { classes: Layers, subjects: BookOpen, security: Shield };
                const labels = { classes: 'Classes', subjects: 'Access', security: 'Security' };
                const Icon = icons[tab];
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3.5 text-xs font-semibold transition ${
                      activeTab === tab
                        ? 'border-b-2 border-[#2b676e] text-[#2b676e] -mb-px'
                        : 'border-b-2 border-transparent text-[#9ca3af] hover:text-[#374151]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* ── Tab: Assign Classes ──────────────────────────────────── */}
            {activeTab === 'classes' && (
              <div className="p-5 space-y-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                  Select Classes
                </p>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {allClasses.map((c) => {
                    const checked = selectedClassIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                          checked
                            ? 'border-[#2b676e] bg-[#eaf4f5]'
                            : 'border-[#f1f5f9] hover:border-[#d0e8ea]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleClass(c.id)}
                          className="h-4 w-4 rounded accent-[#2b676e]"
                        />
                        <span className="text-sm font-medium text-[#111827]">
                          {c.name} – {c.section}
                        </span>
                        <span className="ml-auto text-xs text-[#9ca3af]">{c.academicYear}</span>
                      </label>
                    );
                  })}
                </div>
                <button
                  onClick={saveClasses}
                  disabled={classSaving}
                  className="flex w-full items-center justify-center gap-1.5 bg-[#2b676e] text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-[0_4px_12px_rgba(43,103,110,0.3)] hover:bg-[#1a5058] transition disabled:opacity-60"
                >
                  {classSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Classes
                </button>
                {classMsg && (
                  <p className={`text-sm font-medium ${classMsg.toLowerCase().includes('success') ? 'text-[#2b676e]' : 'text-[#b91c1c]'}`}>
                    {classMsg}
                  </p>
                )}
              </div>
            )}

            {/* ── Tab: Access Controls ─────────────────────────────────── */}
            {activeTab === 'subjects' && (
              <div className="p-5 space-y-3">
                {teacher.accessControls.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <Briefcase className="h-10 w-10 text-[#d1d5db]" />
                    <p className="text-sm text-[#9ca3af]">No access controls configured.</p>
                  </div>
                ) : (
                  teacher.accessControls.map((ac) => (
                    <div key={ac.module} className="flex items-center justify-between rounded-xl border border-[#f1f5f9] px-4 py-3">
                      <span className="text-sm font-medium text-[#374151] capitalize">{ac.module.replace(/_/g, ' ')}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ac.enabled ? 'bg-[#d0e8ea] text-[#2b676e]' : 'bg-[#f1f5f9] text-[#9ca3af]'}`}>
                        {ac.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Tab: Security ────────────────────────────────────────── */}
            {activeTab === 'security' && (
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-1">
                    Account Status
                  </p>
                  <div className={`rounded-xl border px-4 py-3 ${teacher.user.isActive ? 'border-[#d0e8ea] bg-[#eaf4f5]' : 'border-[#fee2e2] bg-[#fff5f5]'}`}>
                    <p className={`text-sm font-bold ${teacher.user.isActive ? 'text-[#2b676e]' : 'text-[#b91c1c]'}`}>
                      {teacher.user.isActive ? 'Active — Can log in' : 'Inactive — Login disabled'}
                    </p>
                  </div>
                </div>
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
                      className="h-10 w-full rounded-xl bg-[#f3f4f5] border-none pl-3 pr-10 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#2b676e]/30"
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
                    if (newPassword.length < 6) { setPwdMsg('Password must be at least 6 characters.'); return; }
                    setPwdMsg('');
                    setShowPwdConfirm(true);
                  }}
                  disabled={pwdSaving}
                  className="flex w-full items-center justify-center gap-1.5 bg-[#2b676e] text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-[0_4px_12px_rgba(43,103,110,0.3)] hover:bg-[#1a5058] transition disabled:opacity-60"
                >
                  {pwdSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                  Update Password
                </button>
                {pwdMsg && (
                  <p className={`text-sm font-medium ${pwdMsg.toLowerCase().includes('success') ? 'text-[#2b676e]' : 'text-[#b91c1c]'}`}>
                    {pwdMsg}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Compensation card */}
          {teacher.compensation && (
            <div className={`${CARD} mt-5 p-5`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-3">Compensation</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6b7280]">Base Salary</span>
                  <span className="text-sm font-semibold text-[#111827]">{fmtCurrency(teacher.compensation.baseSalary)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6b7280]">Bonus</span>
                  <span className="text-sm font-semibold text-[#15803d]">+{fmtCurrency(teacher.compensation.bonus)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6b7280]">Deduction</span>
                  <span className="text-sm font-semibold text-[#b91c1c]">-{fmtCurrency(teacher.compensation.deduction)}</span>
                </div>
                <div className="border-t border-[#f1f5f9] pt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-[#111827]">Net Salary</span>
                  <span className="text-sm font-bold text-[#2b676e]">
                    {fmtCurrency(teacher.compensation.baseSalary + teacher.compensation.bonus - teacher.compensation.deduction)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Access Controls summary if in subjects tab already shown inline */}
          <div className={`${CARD} mt-5`}>
            <CardHeader title="Quick Links" />
            <div className="p-5 flex flex-col gap-3">
              <Link
                href={`/admin/teachers`}
                className="h-11 flex items-center justify-center gap-2 rounded-xl bg-[#2b676e] text-white text-sm font-semibold hover:bg-[#1a5058] transition"
              >
                <Users className="h-4 w-4" />
                All Teachers
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── PASSWORD CONFIRM MODAL ──────────────────────────────────────────── */}
      {showPwdConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fef3c7]">
                <Lock className="h-6 w-6 text-[#d97706]" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[#111827]">Update Password?</h3>
              <p className="mt-2 text-sm text-[#6b7280]">
                You are about to update the password for{' '}
                <strong className="text-[#111827]">{teacher.user.fullName}</strong>. This cannot be undone.
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
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#2b676e] text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-[0_4px_12px_rgba(43,103,110,0.3)] hover:bg-[#1a5058] transition"
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
