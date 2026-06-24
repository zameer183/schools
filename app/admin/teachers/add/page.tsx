'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Phone, GraduationCap, Briefcase, Lock, ShieldCheck,
  ArrowLeft, Check, AlertCircle, ChevronDown, Mail, MapPin,
  Hash, Calendar, Users, Building2, DollarSign, Banknote,
  BookOpen, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui';

// ── Types ────────────────────────────────────────────────────────────────────

type ClassItem = { id: string; name: string; section: string };

type FormState = {
  fullName: string; fatherName: string; dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | ''; cnicNo: string; startDate: string;
  whatsappCode: string; whatsappNumber: string;
  mobileNumber: string; sameAsWhatsApp: boolean;
  email: string; permanentAddress: string; currentAddress: string;
  emergencyName: string; emergencyPhone: string;
  qualification: string; specialization: string;
  institutionName: string; yearOfPassing: string;
  experience: string; previousWorkplace: string;
  position: string; classId: string;
  salary: string; salaryType: string;
  paymentMethod: string; bankAccount: string;
  password: string; confirmPassword: string;
  role: 'TEACHER' | 'ADMIN';
  isActive: boolean; notes: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'personal',      label: 'Personal',      icon: User },
  { id: 'contact',       label: 'Contact',        icon: Phone },
  { id: 'qualification', label: 'Qualification',  icon: GraduationCap },
  { id: 'position',      label: 'Position',       icon: Briefcase },
  { id: 'credentials',   label: 'Credentials',    icon: Lock },
  { id: 'status',        label: 'Status',         icon: ShieldCheck },
] as const;

const COUNTRY_CODES = [
  { code: '+92', label: 'PK 🇵🇰' }, { code: '+91', label: 'IN 🇮🇳' },
  { code: '+971', label: 'AE 🇦🇪' }, { code: '+1', label: 'US 🇺🇸' },
  { code: '+44', label: 'GB 🇬🇧' }, { code: '+966', label: 'SA 🇸🇦' },
];
const SALARY_TYPES   = ['Monthly', 'Weekly', 'Hourly', 'Per Class'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'EasyPaisa', 'JazzCash'];

const EMPTY: FormState = {
  fullName: '', fatherName: '', dateOfBirth: '', gender: '', cnicNo: '',
  startDate: new Date().toISOString().slice(0, 10),
  whatsappCode: '+92', whatsappNumber: '', mobileNumber: '',
  sameAsWhatsApp: false, email: '',
  permanentAddress: '', currentAddress: '',
  emergencyName: '', emergencyPhone: '',
  qualification: '', specialization: '',
  institutionName: '', yearOfPassing: '', experience: '', previousWorkplace: '',
  position: '', classId: '', salary: '', salaryType: 'Monthly',
  paymentMethod: 'Cash', bankAccount: '',
  password: '', confirmPassword: '', role: 'TEACHER',
  isActive: true, notes: '',
};

function genCode(name: string) {
  const initials = name.trim().toUpperCase().split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 4) || 'STAFF';
  return `EMP-${initials}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// ── Shared style helpers ─────────────────────────────────────────────────────

const LBL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#475569]';

const inp = (err?: string) =>
  `h-12 w-full rounded-xl border border-[#E5E7EB] px-4 text-sm text-[#1a1c1c] placeholder:text-[#9CA3AF] outline-none transition-all bg-white ${
    err
      ? 'ring-2 ring-[#ef4444]/30 focus:ring-[#ef4444]/50'
      : 'focus:ring-2 focus:ring-[#0F4F4A]/25'
  }`;

const sel = `h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#1a1c1c] outline-none transition-all focus:ring-2 focus:ring-[#0F4F4A]/25 [&_option]:bg-white`;

const textarea = `w-full resize-none rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#1a1c1c] placeholder:text-[#9CA3AF] outline-none transition-all focus:ring-2 focus:ring-[#0F4F4A]/25`;

// ── Sub-components ───────────────────────────────────────────────────────────

function FField({
  label, error, icon: Icon, children, className = '', required,
}: {
  label: string; error?: string; icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode; className?: string; required?: boolean;
}) {
  return (
    <div className={className}>
      <label className={LBL}>
        {label}
        {required && <span className="ml-0.5 text-[#ef4444]">*</span>}
      </label>
      {Icon ? (
        <div className="relative">
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
          <div className="[&_input]:pl-10 [&_textarea]:pl-10">{children}</div>
        </div>
      ) : children}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-[#ef4444]">
          <AlertCircle className="h-3 w-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

function Card({ id, icon: Icon, title, subtitle, children }: {
  id: string; icon: React.ComponentType<{ className?: string }>;
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-[88px] rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-4 border-b border-[#E5E7EB] pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1F5A5C]">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-[#1a1c1c]">{title}</h3>
          <p className="text-xs text-[#6f7979]">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function GenderBtn({ value, onChange, error }: {
  value: 'MALE' | 'FEMALE' | ''; onChange: (v: 'MALE' | 'FEMALE') => void; error?: string;
}) {
  return (
    <div>
      <label className={LBL}>Gender</label>
      <div className="grid grid-cols-2 gap-3">
        {(['MALE', 'FEMALE'] as const).map((g) => (
          <button key={g} type="button" onClick={() => onChange(g)}
            className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-all ${
              value === g
                ? 'border-[#0F4F4A] bg-[#0F4F4A]/10 text-[#0F4F4A]'
                : 'border-[#e2e8f0] bg-[#f1f5f9] text-[#6b7280] hover:border-[#0F4F4A]/40 hover:text-[#0F4F4A]'
            }`}
          >
            <span className="text-base">{g === 'MALE' ? '♂' : '♀'}</span>
            {g === 'MALE' ? 'Male' : 'Female'}
          </button>
        ))}
      </div>
      {error && <p className="mt-1.5 flex items-center gap-1 text-xs text-[#ef4444]"><AlertCircle className="h-3 w-3" />{error}</p>}
    </div>
  );
}

function PrimaryToggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} aria-pressed={checked}
      className={`relative inline-flex h-7 w-14 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
        checked ? 'bg-[#0F4F4A]' : 'bg-[#e2e8f0]'
      }`}
    >
      <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition duration-200 ${
        checked ? 'translate-x-7' : 'translate-x-0'
      }`} />
    </button>
  );
}

function ClassPicker({ classes, value, onChange, loading, error }: {
  classes: ClassItem[]; value: string; onChange: (id: string) => void;
  loading: boolean; error?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = classes.find(c => c.id === value);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className={`flex h-12 w-full items-center justify-between rounded-xl border-none px-4 text-sm transition-all bg-[#f1f5f9] ${
          error ? 'ring-2 ring-[#ef4444]/30' : open ? 'ring-2 ring-[#0F4F4A]/25 bg-white' : ''
        }`}
      >
        <span className={selected ? 'text-[#0f172a]' : 'text-[#94a3b8]'}>
          {loading ? 'Loading…' : selected ? `${selected.name} – ${selected.section}` : 'Select class…'}
        </span>
        <ChevronDown className={`h-4 w-4 text-[#94a3b8] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[52px] z-20 max-h-52 overflow-y-auto rounded-xl border border-[#e2e8f0] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
          <button type="button" onClick={() => { onChange(''); setOpen(false); }}
            className="w-full px-4 py-3 text-left text-sm text-[#6b7280] transition hover:bg-[#0F4F4A]/5 hover:text-[#0f172a]"
          >
            None / Unassigned
          </button>
          {classes.length === 0 && !loading && (
            <p className="px-4 py-3 text-xs text-[#94a3b8]">No classes found</p>
          )}
          {classes.map(c => (
            <button key={c.id} type="button" onClick={() => { onChange(c.id); setOpen(false); }}
              className={`w-full px-4 py-3 text-left text-sm transition hover:bg-[#0F4F4A]/5 ${
                value === c.id ? 'font-semibold text-[#0F4F4A]' : 'text-[#374151]'
              }`}
            >
              {c.name} – {c.section}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-1.5 flex items-center gap-1 text-xs text-[#ef4444]"><AlertCircle className="h-3 w-3" />{error}</p>}
    </div>
  );
}

function UploadBox({ label }: { label: string }) {
  return (
    <div>
      <label className={LBL}>{label} <span className="text-[#94a3b8]">(optional)</span></label>
      <label className="flex h-14 w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 transition hover:border-[#0F4F4A]/40 hover:bg-[#0F4F4A]/5">
        <Upload className="h-5 w-5 shrink-0 text-[#94a3b8]" />
        <span className="text-sm text-[#94a3b8]">Click to upload</span>
        <input type="file" className="hidden" />
      </label>
    </div>
  );
}

function PwdStrength({ pwd }: { pwd: string }) {
  if (!pwd) return null;
  const score = pwd.length < 4 ? 1 : pwd.length < 7 ? 2 : pwd.length < 10 ? 3 : 4;
  const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full transition-colors"
            style={{ backgroundColor: i <= score ? colors[score] : '#263050' }} />
        ))}
      </div>
      <span className="text-[11px] text-[#7a8599]" style={{ color: colors[score] }}>{labels[score]}</span>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function AddTeacherPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('personal');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const navRef = useRef<HTMLDivElement>(null);

  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value as never }));

  // Load classes
  useEffect(() => {
    fetch('/api/classes', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then(d => setClasses(Array.isArray(d) ? d : []))
      .finally(() => setClassesLoading(false));
  }, []);

  // "Same as WhatsApp" sync
  useEffect(() => {
    if (form.sameAsWhatsApp) {
      setForm(p => ({ ...p, mobileNumber: p.whatsappCode + p.whatsappNumber }));
    }
  }, [form.sameAsWhatsApp, form.whatsappCode, form.whatsappNumber]);

  // Intersection Observer — highlight active section in nav
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: '-5% 0px -65% 0px', threshold: 0 }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Keep active tab visible in horizontal nav
  useEffect(() => {
    const btn = navRef.current?.querySelector(`[data-sec="${activeSection}"]`) as HTMLElement | null;
    btn?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activeSection]);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim())       errs.fullName       = 'Full name is required';
    if (!form.startDate)             errs.startDate      = 'Start date is required';
    if (!form.whatsappNumber.trim()) errs.whatsappNumber = 'WhatsApp number is required';
    if (!form.mobileNumber.trim())   errs.mobileNumber   = 'Mobile number is required';
    if (!form.email.trim())          errs.email          = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format';
    if (!form.password)              errs.password       = 'Password is required';
    else if (form.password.length < 6) errs.password     = 'Minimum 6 characters';
    if (!form.confirmPassword)       errs.confirmPassword = 'Please confirm password';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';

    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      const sectionMap: Record<string, string> = {
        fullName: 'personal', startDate: 'personal',
        whatsappNumber: 'contact', mobileNumber: 'contact', email: 'contact',
        password: 'credentials', confirmPassword: 'credentials',
      };
      scrollTo(sectionMap[Object.keys(errs)[0]] ?? 'personal');
      return false;
    }
    return true;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName:      form.fullName,
          email:         form.email,
          password:      form.password,
          employeeCode:  genCode(form.fullName),
          phone:         form.mobileNumber || null,
          qualification: form.qualification || null,
          specialization: form.specialization || null,
          joiningDate:   form.startDate || null,
          isActive:      form.isActive,
          baseSalary:    form.salary ? Number(form.salary) : null,
          classId:       form.classId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'Failed to create teacher');
      setSuccess(true);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to create teacher');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="-mx-4 -mt-4 flex min-h-screen items-center justify-center bg-[#F5F1E8] p-4 sm:-mx-6 sm:-mt-6 sm:p-8">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#dcfce7] ring-8 ring-[#0F4F4A]/5">
            <Check className="h-9 w-9 text-[#15803d]" strokeWidth={2.5} />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#0F4F4A]">Staff Added</p>
          <h2 className="mt-2 text-2xl font-bold text-[#111827]">{form.fullName}</h2>
          <p className="mt-1 text-sm text-[#6b7280]">Account created successfully.</p>

          <div className="mt-6 space-y-2 rounded-2xl border border-[#e5e7eb] bg-white p-5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6b7280]">Email</span>
              <span className="font-mono text-[#111827]">{form.email}</span>
            </div>
            <div className="h-px bg-[#e5e7eb]" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6b7280]">Password</span>
              <span className="font-mono text-[#111827]">{form.password}</span>
            </div>
            <p className="pt-1 text-[11px] text-[#94a3b8]">Share credentials securely. Advise staff to change password on first login.</p>
          </div>

          <div className="mt-5 flex gap-3">
            <Button
              variant="secondary"
              onClick={() => { setForm(EMPTY); setErrors({}); setSuccess(false); }}
              className="flex-1"
              size="md"
            >
              Add Another
            </Button>
            <Button
              onClick={() => router.push('/admin/teachers')}
              className="flex-1"
              size="md"
            >
              View Staff
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="-mx-4 -mt-4 min-h-screen bg-[#F5F1E8] sm:-mx-6 sm:-mt-6">

      {/* ── TOP BAR + SECTION NAV ── */}
      <div className="sticky top-0 z-30 border-b border-[#e5e7eb] bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">

          {/* Title row */}
          <div className="flex h-14 items-center gap-3">
            <button
              onClick={() => router.push('/admin/teachers')}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#e2e8f0] text-[#6b7280] transition hover:border-[#0F4F4A]/50 hover:text-[#0F4F4A]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold text-[#111827]">Add Staff / Teacher</h1>
              <p className="text-[11px] text-[#6b7280]">Fill all sections · save at bottom</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
              form.isActive ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#b91c1c]'
            }`}>
              {form.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Section tabs */}
          <div ref={navRef} className="flex gap-1.5 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                data-sec={id}
                type="button"
                onClick={() => scrollTo(id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeSection === id
                    ? 'bg-[#0F4F4A] text-white shadow-[0_0_12px_rgba(15,79,74,0.35)]'
                    : 'bg-[#f1f5f9] text-[#6b7280] hover:text-[#0F4F4A] border border-[#e2e8f0]'
                }`}
              >
                <Icon className="h-3 w-3" />{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTIONS ── */}
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-32 sm:px-6 sm:py-5 bg-[#F5F1E8]">

        {/* ─── 1. Personal ───────────────────────────────────────────────── */}
        <Card id="personal" icon={User} title="Personal Details" subtitle="Basic identity information">
          <div className="grid gap-4 sm:grid-cols-2">
            <FField label="Full Name" error={errors.fullName} icon={User} required className="sm:col-span-2">
              <input value={form.fullName} onChange={set('fullName')} placeholder="Full name" className={inp(errors.fullName)} />
            </FField>
            <FField label="Father's Name" icon={Users}>
              <input value={form.fatherName} onChange={set('fatherName')} placeholder="Father's full name" className={inp()} />
            </FField>
            <FField label="Date of Birth" icon={Calendar}>
              <input value={form.dateOfBirth} onChange={set('dateOfBirth')} type="date" className={inp()} />
            </FField>
            <FField label="CNIC / ID Number" icon={Hash}>
              <input value={form.cnicNo} onChange={set('cnicNo')} placeholder="XXXXX-XXXXXXX-X" maxLength={15} className={inp()} />
            </FField>
            <FField label="Start Date" error={errors.startDate} icon={Calendar} required>
              <input value={form.startDate} onChange={set('startDate')} type="date" className={inp(errors.startDate)} />
            </FField>
          </div>
          <GenderBtn value={form.gender} onChange={g => setForm(p => ({ ...p, gender: g }))} />
          <UploadBox label="Profile Photo" />
        </Card>

        {/* ─── 2. Contact ────────────────────────────────────────────────── */}
        <Card id="contact" icon={Phone} title="Contact Information" subtitle="Phone, email and address details">
          {/* WhatsApp */}
          <div>
            <label className={LBL}>WhatsApp Number <span className="text-[#ef4444]">*</span></label>
            <div className="flex gap-2">
              <select value={form.whatsappCode} onChange={set('whatsappCode')}
                className="h-12 rounded-xl border border-[#263050] bg-[#1b2236] px-2 text-sm text-white outline-none focus:border-[#ff9500]/50 [&_option]:bg-[#1b2236]"
              >
                {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
              <input
                value={form.whatsappNumber}
                onChange={e => setForm(p => ({ ...p, whatsappNumber: e.target.value }))}
                type="tel" placeholder="3xx xxxxxxx"
                className={`flex-1 ${inp(errors.whatsappNumber)}`}
              />
            </div>
            {errors.whatsappNumber && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-[#ef4444]">
                <AlertCircle className="h-3 w-3" />{errors.whatsappNumber}
              </p>
            )}
          </div>

          {/* Mobile */}
          <div>
            <FField label="Mobile Number" error={errors.mobileNumber} icon={Phone} required>
              <input
                value={form.mobileNumber}
                onChange={e => setForm(p => ({ ...p, mobileNumber: e.target.value, sameAsWhatsApp: false }))}
                type="tel" placeholder="+92 3xx xxxxxxx"
                readOnly={form.sameAsWhatsApp}
                className={inp(errors.mobileNumber)}
              />
            </FField>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-[#7a8599] select-none">
              <input
                type="checkbox"
                checked={form.sameAsWhatsApp}
                onChange={e => setForm(p => ({ ...p, sameAsWhatsApp: e.target.checked }))}
                className="h-4 w-4 rounded accent-[#ff9500]"
              />
              Same as WhatsApp number
            </label>
          </div>

          <FField label="Email Address" error={errors.email} icon={Mail} required>
            <input value={form.email} onChange={set('email')} type="email" placeholder="teacher@school.com" className={inp(errors.email)} />
          </FField>

          <FField label="Permanent Address" icon={MapPin}>
            <textarea
              value={form.permanentAddress}
              onChange={e => setForm(p => ({ ...p, permanentAddress: e.target.value }))}
              rows={2} placeholder="Permanent home address"
              className={`${textarea} pl-10`}
            />
          </FField>

          <FField label="Current Address" icon={MapPin}>
            <textarea
              value={form.currentAddress}
              onChange={e => setForm(p => ({ ...p, currentAddress: e.target.value }))}
              rows={2} placeholder="Current residential address (if different)"
              className={`${textarea} pl-10`}
            />
          </FField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FField label="Emergency Contact Name" icon={User}>
              <input value={form.emergencyName} onChange={set('emergencyName')} placeholder="Contact person" className={inp()} />
            </FField>
            <FField label="Emergency Contact Number" icon={Phone}>
              <input value={form.emergencyPhone} onChange={set('emergencyPhone')} type="tel" placeholder="+92 3xx xxxxxxx" className={inp()} />
            </FField>
          </div>
        </Card>

        {/* ─── 3. Qualification ──────────────────────────────────────────── */}
        <Card id="qualification" icon={GraduationCap} title="Qualification & Experience" subtitle="Academic background and work history">
          <div className="grid gap-4 sm:grid-cols-2">
            <FField label="Highest Qualification" icon={GraduationCap}>
              <input value={form.qualification} onChange={set('qualification')} placeholder="e.g. M.Ed, B.Ed, MSc" className={inp()} />
            </FField>
            <FField label="Specialization / Subject" icon={BookOpen}>
              <input value={form.specialization} onChange={set('specialization')} placeholder="e.g. Mathematics, English" className={inp()} />
            </FField>
            <FField label="Institution Name" icon={Building2}>
              <input value={form.institutionName} onChange={set('institutionName')} placeholder="University or college" className={inp()} />
            </FField>
            <FField label="Year of Passing" icon={Calendar}>
              <input value={form.yearOfPassing} onChange={set('yearOfPassing')} type="number" placeholder="e.g. 2018" min={1980} max={2030} className={inp()} />
            </FField>
            <FField label="Experience (Years)" icon={Briefcase}>
              <input value={form.experience} onChange={set('experience')} type="number" placeholder="e.g. 5" min={0} className={inp()} />
            </FField>
            <FField label="Previous Workplace" icon={Building2}>
              <input value={form.previousWorkplace} onChange={set('previousWorkplace')} placeholder="Optional" className={inp()} />
            </FField>
          </div>
          <UploadBox label="Upload Certificates" />
        </Card>

        {/* ─── 4. Position & Salary ──────────────────────────────────────── */}
        <Card id="position" icon={Briefcase} title="Position & Salary" subtitle="Role, assignment and compensation">
          <FField label="Position / Designation" icon={Briefcase}>
            <input value={form.position} onChange={set('position')} placeholder="e.g. Senior Teacher, Class Coordinator" className={inp()} />
          </FField>

          <div>
            <label className={LBL}>Department / Class Assigned</label>
            <ClassPicker
              classes={classes} value={form.classId}
              onChange={id => setForm(p => ({ ...p, classId: id }))}
              loading={classesLoading} error={errors.classId}
            />
          </div>

          <FField label="Subjects Taught" icon={BookOpen}>
            <input
              value={form.specialization} onChange={set('specialization')}
              placeholder="e.g. Math, Physics, English (comma-separated)"
              className={inp()}
            />
          </FField>

          {/* Salary amount — highlighted */}
          <div>
            <label className={LBL}>Salary Amount</label>
            <div className="relative">
              <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0F4F4A]" />
              <input
                value={form.salary} onChange={set('salary')}
                type="number" min={0} placeholder="0.00"
                className="h-12 w-full rounded-xl border-none bg-[#f0fdf4] pl-10 pr-4 text-base font-bold text-[#15803d] outline-none transition-all placeholder:text-[#94a3b8] ring-2 ring-[#0F4F4A]/20 focus:ring-[#0F4F4A]/40 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LBL}>Salary Type</label>
              <select value={form.salaryType} onChange={set('salaryType')} className={sel}>
                {SALARY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={LBL}>Payment Method</label>
              <select value={form.paymentMethod} onChange={set('paymentMethod')} className={sel}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {form.paymentMethod !== 'Cash' && (
            <FField
              label={form.paymentMethod === 'Bank Transfer' ? 'Bank Account Number' : 'Wallet Number'}
              icon={Banknote}
            >
              <input
                value={form.bankAccount} onChange={set('bankAccount')}
                placeholder={form.paymentMethod === 'Bank Transfer' ? 'IBAN or account number' : 'Mobile wallet number'}
                className={inp()}
              />
            </FField>
          )}
        </Card>

        {/* ─── 5. Login Credentials ──────────────────────────────────────── */}
        <Card id="credentials" icon={Lock} title="Login Credentials" subtitle="Staff portal account access">
          <div>
            <FField label="Login Email" error={errors.email} icon={Mail} required>
              <input value={form.email} onChange={set('email')} type="email" placeholder="teacher@school.com" className={inp(errors.email)} />
            </FField>
            <p className="-mt-1 text-xs text-[#3d4a63]">This email is used as the login username.</p>
          </div>

          {/* Password */}
          <div>
            <label className={LBL}>Password <span className="text-[#ef4444]">*</span></label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3d4a63]" />
              <input
                value={form.password} onChange={set('password')}
                type={showPwd ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                className={`${inp(errors.password)} pl-10 pr-16`}
              />
              <button type="button" onClick={() => setShowPwd(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-[#7a8599] transition hover:text-[#ff9500]"
              >
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 flex items-center gap-1 text-xs text-[#ef4444]"><AlertCircle className="h-3 w-3" />{errors.password}</p>}
            <PwdStrength pwd={form.password} />
          </div>

          {/* Confirm password */}
          <div>
            <label className={LBL}>Confirm Password <span className="text-[#ef4444]">*</span></label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3d4a63]" />
              <input
                value={form.confirmPassword} onChange={set('confirmPassword')}
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat password"
                autoComplete="new-password"
                className={`${inp(errors.confirmPassword)} pl-10 pr-16`}
              />
              <button type="button" onClick={() => setShowConfirm(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-[#7a8599] transition hover:text-[#ff9500]"
              >
                {showConfirm ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.confirmPassword
              ? <p className="mt-1.5 flex items-center gap-1 text-xs text-[#ef4444]"><AlertCircle className="h-3 w-3" />{errors.confirmPassword}</p>
              : form.confirmPassword && form.password === form.confirmPassword
                ? <p className="mt-1.5 flex items-center gap-1 text-xs text-[#22c55e]"><Check className="h-3 w-3" />Passwords match</p>
                : null
            }
          </div>

          <div>
            <label className={LBL}>Role / Access Level</label>
            <select value={form.role} onChange={set('role')} className={sel}>
              <option value="TEACHER">Teacher</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </Card>

        {/* ─── 6. Status & Notes ─────────────────────────────────────────── */}
        <Card id="status" icon={ShieldCheck} title="Status & Notes" subtitle="Account status and additional remarks">
          <div className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-4">
            <div>
              <p className="font-semibold text-[#111827]">Account Status</p>
              <p className="text-xs text-[#6b7280]">
                {form.isActive ? 'Active — staff can log in' : 'Inactive — login blocked'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold ${form.isActive ? 'text-[#15803d]' : 'text-[#b91c1c]'}`}>
                {form.isActive ? 'Active' : 'Inactive'}
              </span>
              <PrimaryToggle checked={form.isActive} onChange={() => setForm(p => ({ ...p, isActive: !p.isActive }))} />
            </div>
          </div>

          <div>
            <label className={LBL}>Notes / Remarks</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={4}
              placeholder="Any additional notes about this staff member…"
              className={textarea}
            />
          </div>
        </Card>

        {/* API error */}
        {apiError && (
          <div className="flex items-start gap-2 rounded-xl border border-[#fee2e2] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {apiError}
          </div>
        )}
      </div>

      {/* ── STICKY SAVE BUTTON ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e5e7eb] bg-white/95 p-4 backdrop-blur-md">
        <div className="mx-auto max-w-2xl">
          <Button type="button" fullWidth onClick={() => void handleSubmit()} disabled={loading} size="lg">
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving Staff Member…
              </>
            ) : (
              <>
                <Check size={16} />
                Save Staff Member
              </>
            )}
          </Button>
        </div>
      </div>

    </div>
  );
}
