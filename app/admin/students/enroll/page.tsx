'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight,
  User, Users, Calendar, CreditCard,
  Phone, MapPin, Hash, School, Search,
  BadgeCheck, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui';

const SESSION_EXPIRED_MESSAGE = 'Session expire ho gayi hai. Please admin login dubara karein.';

function redirectToAdminLogin() {
  if (typeof window === 'undefined') return;
  window.setTimeout(() => {
    window.location.href = '/login/admin';
  }, 700);
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;
type ClassItem = { id: string; name: string; section: string };

type Form1 = {
  studentName: string;
  fatherName: string;
  dateOfBirth: string;
  aadharNo: string;
  gender: 'MALE' | 'FEMALE' | '';
};

type Form2 = {
  whatsappCode: string;
  whatsappNumber: string;
  mobileNumber: string;
  email: string;
  address: string;
};

type Form3 = {
  schoolName: string;
  rollNumber: string;
  classId: string;
  additionalClassIds: string[];
  joinDate: string;
};

type Form4 = {
  feeCategory: string;
  feeType: string;
  feeTitle: string;
  feeAmount: string;
  feeDiscount: string;
  feeDueDate: string;
  partialFeeSupported: boolean;
  collectOnMonthStart: boolean;
};

type Errors = Record<string, string>;

// ─── Constants ───────────────────────────────────────────────────────────────

const COUNTRY_CODES = [
  { code: '+92', label: 'PK' },
  { code: '+880', label: 'BD' },
  { code: '+91', label: 'IN' },
  { code: '+971', label: 'AE' },
  { code: '+1',  label: 'US/CA' },
  { code: '+44', label: 'GB' },
  { code: '+966', label: 'SA' },
  { code: '+20', label: 'EG' },
  { code: '+974', label: 'QA' },
  { code: '+965', label: 'KW' },
  { code: '+968', label: 'OM' },
  { code: '+973', label: 'BH' },
  { code: '+60', label: 'MY' },
  { code: '+62', label: 'ID' },
  { code: '+94', label: 'LK' },
  { code: '+977', label: 'NP' },
  { code: '+93', label: 'AF' },
];

const FEE_CATEGORIES = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'One-time', 'Admission', 'Exam'];
const FEE_TYPES      = ['Tuition Fee', 'Transport Fee', 'Exam Fee', 'Activity Fee', 'Library Fee', 'Hostel Fee', 'Other'];

const STEPS = [
  { num: 1 as Step, label: 'Student',   icon: User },
  { num: 2 as Step, label: 'Contact',   icon: Phone },
  { num: 3 as Step, label: 'Institute', icon: School },
  { num: 4 as Step, label: 'Fee',       icon: CreditCard },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputCls = (err?: string) =>
  `h-11 w-full rounded-xl border-none px-4 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition-all
  ${err
    ? 'bg-[#fef2f2] ring-2 ring-[#ef4444]/30 focus:ring-[#ef4444]/50'
    : 'bg-[#f1f5f9] focus:ring-2 focus:ring-[#0F4F4A]/25 focus:bg-white'
  }`;

const labelCls = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#475569]';

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-[#0F4F4A]' : 'bg-[#e2e8f0]'
      }`}
      aria-pressed={checked}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  );
}

// ─── Field with icon ─────────────────────────────────────────────────────────

function Field({
  label, error, icon: Icon, children, className = ''
}: {
  label: string;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {Icon ? (
        <div className="relative">
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
          <div className="[&_input]:pl-9 [&_select]:pl-9 [&_textarea]:pl-9">{children}</div>
        </div>
      ) : children}
      {error ? <p className="mt-1.5 flex items-center gap-1 text-xs text-[#ef4444]"><span>⚠</span>{error}</p> : null}
    </div>
  );
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepBar({ step }: { step: Step }) {
  return (
    <div className="mb-8">
      {/* Steps row */}
      <div className="relative flex items-center justify-between">
        {/* Connecting line */}
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-[#e2e8f0]" />
        <div
          className="absolute left-0 top-5 h-0.5 bg-gradient-to-r from-[#0F4F4A] to-[#10B981] transition-all duration-500"
          style={{ width: `${((step - 1) / 3) * 100}%` }}
        />

        {STEPS.map(({ num, label, icon: Icon }) => {
          const done    = step > num;
          const current = step === num;
          return (
            <div key={num} className="relative z-10 flex flex-col items-center gap-1.5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                done
                  ? 'border-[#0F4F4A] bg-[#0F4F4A] text-white shadow-[0_0_0_4px_rgba(22,163,74,0.12)]'
                  : current
                    ? 'border-[#0F4F4A] bg-white text-[#0F4F4A] shadow-[0_0_0_4px_rgba(22,163,74,0.12)]'
                    : 'border-[#e2e8f0] bg-white text-[#94a3b8]'
              }`}>
                {done
                  ? <Check className="h-4 w-4 stroke-[2.5]" />
                  : <Icon className="h-4 w-4" />
                }
              </div>
              <span className={`text-[11px] font-semibold ${current ? 'text-[#0F4F4A]' : done ? 'text-[#475569]' : 'text-[#94a3b8]'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-6 h-1.5 rounded-full bg-[#e2e8f0]">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-[#0F4F4A] to-[#10B981] transition-all duration-500"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>
      <div className="mt-2 text-right text-xs text-[#94a3b8]">Step {step} of 4</div>
    </div>
  );
}

// ─── Searchable Class Dropdown ────────────────────────────────────────────────

function ClassDropdown({
  classes, value, onChange, error, loading
}: {
  classes: ClassItem[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query) return classes;
    const q = query.toLowerCase();
    return classes.filter(c => `${c.name} ${c.section}`.toLowerCase().includes(q));
  }, [classes, query]);

  const selected = classes.find(c => c.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex h-11 w-full items-center justify-between rounded-xl border-none px-4 text-sm transition-all ${
          error
            ? 'bg-[#fef2f2] ring-2 ring-[#ef4444]/30'
            : open
              ? 'bg-white ring-2 ring-[#0F4F4A]/25'
              : 'bg-[#f1f5f9] hover:bg-[#e8edf5]'
        }`}
      >
        <span className={selected ? 'text-[#0f172a]' : 'text-[#94a3b8]'}>
          {loading ? 'Loading classes…' : selected ? `${selected.name} – ${selected.section}` : 'Select class'}
        </span>
        <ChevronDown className={`h-4 w-4 text-[#94a3b8] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-12 z-20 rounded-xl border border-[#e2e8f0] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
          <div className="border-b border-[#f1f5f9] p-2">
            <div className="flex items-center gap-2 rounded-lg bg-[#f1f5f9] px-3 py-2">
              <Search className="h-3.5 w-3.5 text-[#94a3b8]" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search class…"
                className="w-full bg-transparent text-xs text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-xs text-[#94a3b8]">No classes found</p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(c.id); setOpen(false); setQuery(''); }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#f0fdf4] ${
                    value === c.id ? 'font-semibold text-[#0F4F4A] bg-[#f0fdf4]' : 'text-[#374151]'
                  }`}
                >
                  {c.name} – {c.section}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {error ? <p className="mt-1.5 flex items-center gap-1 text-xs text-[#ef4444]"><span>⚠</span>{error}</p> : null}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EnrollStudentPage() {
  const router = useRouter();
  const [step, setStep]       = useState<Step>(1);
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [errors, setErrors]   = useState<Errors>({});
  const [result, setResult]   = useState<{ admissionNo: string; email: string; studentName: string } | null>(null);
  const [apiError, setApiError] = useState('');

  const [form1, setForm1] = useState<Form1>({
    studentName: '', fatherName: '', dateOfBirth: '', aadharNo: '', gender: ''
  });
  const [form2, setForm2] = useState<Form2>({
    whatsappCode: '+92', whatsappNumber: '', mobileNumber: '', email: '', address: ''
  });
  const [form3, setForm3] = useState<Form3>({
    schoolName: '', rollNumber: '', classId: '', additionalClassIds: [], joinDate: new Date().toISOString().slice(0, 10)
  });
  const [form4, setForm4] = useState<Form4>({
    feeCategory: '', feeType: '', feeTitle: 'Monthly Tuition Fee',
    feeAmount: '', feeDiscount: '0',
    feeDueDate: (() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); })(),
    partialFeeSupported: false, collectOnMonthStart: false
  });

  useEffect(() => {
    fetch('/api/classes', { cache: 'no-store', credentials: 'same-origin' })
      .then(r => {
        if (r.status === 401) {
          setApiError(SESSION_EXPIRED_MESSAGE);
          redirectToAdminLogin();
          return [];
        }
        return r.ok ? r.json() : [];
      })
      .then(d => setClasses(Array.isArray(d) ? d : []))
      .finally(() => setClassesLoading(false));
  }, []);

  // ── Transition helper ──────────────────────────────────────────────────────
  const goStep = (next: Step) => {
    setVisible(false);
    setTimeout(() => { setStep(next); setErrors({}); setVisible(true); }, 160);
  };

  // ── Per-step validation ────────────────────────────────────────────────────
  const validateStep = (): boolean => {
    const errs: Errors = {};

    if (step === 1) {
      if (!form1.studentName.trim()) errs.studentName = 'Student name is required';
      if (!form1.gender)             errs.gender      = 'Please select gender';
    }

    if (step === 2) {
      if (!form2.whatsappNumber.trim()) errs.whatsappNumber = 'WhatsApp number is required';
      if (!form2.mobileNumber.trim())   errs.mobileNumber   = 'Mobile number is required';
      if (form2.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form2.email))
        errs.email = 'Enter a valid email address';
    }

    if (step === 3) {
      if (!form3.schoolName.trim()) errs.schoolName = 'School name is required';
      if (!form3.classId)           errs.classId    = 'Please select a class';
      if (!form3.joinDate)          errs.joinDate   = 'Join date is required';
    }

    if (step === 4) {
      if (form4.feeAmount.trim() && (!Number.isFinite(Number(form4.feeAmount)) || Number(form4.feeAmount) < 0))
        errs.feeAmount = 'Fee amount can be 0 or greater';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => { if (validateStep()) goStep((step + 1) as Step); };
  const handleBack = () => goStep((step - 1) as Step);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    setApiError('');
    try {
      const res = await fetch('/api/admin/enroll', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName:    form1.studentName,
          fatherName:  form1.fatherName,
          dateOfBirth: form1.dateOfBirth || null,
          aadharNo:    form1.aadharNo || null,
          gender:      form1.gender || null,
          whatsApp:    form2.whatsappCode + form2.whatsappNumber,
          phone:       form2.mobileNumber,
          email:       form2.email || null,
          currentAddress: form2.address || null,
          schoolName:  form3.schoolName,
          rollNumber:  form3.rollNumber || null,
          classId:     form3.classId,
          additionalClassIds: form3.additionalClassIds.filter(Boolean),
          joinDate:    form3.joinDate,
          feeCategory: form4.feeCategory,
          feeType:     form4.feeType,
          feeTitle:    form4.feeTitle,
          feeAmount:   form4.feeAmount,
          feeDiscount: form4.feeDiscount,
          feeDueDate:  form4.feeDueDate,
          partialFeeSupported:  form4.partialFeeSupported,
          collectOnMonthStart:  form4.collectOnMonthStart,
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setApiError(SESSION_EXPIRED_MESSAGE);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Enrollment failed');
      setResult({ admissionNo: data.admissionNo, email: data.email, studentName: data.studentName });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Input helper ───────────────────────────────────────────────────────────
  const inp1 = (key: keyof Form1) => ({
    value: form1[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm1(p => ({ ...p, [key]: e.target.value })),
  });
  const inp2 = (key: keyof Form2) => ({
    value: form2[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm2(p => ({ ...p, [key]: e.target.value })),
  });
  const inp3 = (key: keyof Form3) => ({
    value: form3[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm3(p => ({ ...p, [key]: e.target.value })),
  });
  // ── Success Screen ─────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="mx-auto max-w-lg py-4">
        <div className="rounded-2xl bg-white p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)]">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#f0fdf4] shadow-[0_0_0_8px_rgba(22,163,74,0.08)]">
            <Check className="h-9 w-9 stroke-[2.5] text-[#0F4F4A]" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0F4F4A]">Enrollment Successful</p>
          <h2 className="font-headline mt-2 text-2xl font-bold text-[#0f172a]">{result.studentName}</h2>
          <p className="mt-1 text-sm text-[#64748b]">Student has been enrolled and account created.</p>

          <div className="mt-6 space-y-3">
            <div className="rounded-xl bg-[#f8fafc] p-4 text-left">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Admission Number</p>
              <p className="font-mono text-xl font-bold text-[#0f172a]">{result.admissionNo}</p>
            </div>
            <div className="rounded-xl bg-[#f8fafc] p-4 text-left">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Login Credentials</p>
              <p className="text-sm text-[#374151]"><span className="font-semibold">Email:</span> {result.email}</p>
              <p className="mt-0.5 text-sm text-[#374151]"><span className="font-semibold">Password:</span> Pass@123</p>
              <p className="mt-2 text-xs text-[#94a3b8]">Student should change password on first login.</p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => { setResult(null); setStep(1); setForm1({ studentName:'', fatherName:'', dateOfBirth:'', aadharNo:'', gender:'' }); setForm2({ whatsappCode:'+92', whatsappNumber:'', mobileNumber:'', email:'', address:'' }); setForm3({ schoolName:'', rollNumber:'', classId:'', additionalClassIds: [], joinDate: new Date().toISOString().slice(0,10) }); setForm4({ feeCategory:'', feeType:'', feeTitle:'Monthly Tuition Fee', feeAmount:'', feeDiscount:'0', feeDueDate: new Date().toISOString().slice(0,10), partialFeeSupported:false, collectOnMonthStart:false }); }}
              className="flex-1 rounded-xl border border-[#e2e8f0] py-2.5 text-sm font-semibold text-[#374151] transition hover:bg-[#f8fafc]"
            >
              Enroll Another
            </button>
            <button
              onClick={() => router.push('/admin/students')}
              className="flex-1 rounded-xl bg-gradient-to-br from-[#0F4F4A] to-[#0D6B5E] py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(22,163,74,0.3)] transition hover:shadow-[0_6px_16px_rgba(22,163,74,0.4)] hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to Students
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl py-4">
      {/* Back link */}
      <button
        onClick={() => router.push('/admin/students')}
        className="mb-5 flex items-center gap-1.5 text-sm font-medium text-[#64748b] transition hover:text-[#0f172a]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Students
      </button>

      {/* Card */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)] sm:p-8">

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0F4F4A]">Student Enrollment</p>
          <h1 className="font-headline mt-1 text-2xl font-bold text-[#0f172a] sm:text-3xl">Add New Student</h1>
        </div>

        {/* Step bar */}
        <StepBar step={step} />

        {/* Step content with fade transition */}
        <div className={`transition-opacity duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}>

          {/* ── STEP 1: Student Information ────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <p className="font-headline text-lg font-bold text-[#0f172a]">Student Information</p>
                <p className="mt-0.5 text-sm text-[#64748b]">Basic identity details of the student.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Student Name *" error={errors.studentName} icon={User}>
                  <input {...inp1('studentName')} placeholder="Full name" className={inputCls(errors.studentName)} />
                </Field>

                <Field label="Father Name" error={errors.fatherName} icon={Users}>
                  <input {...inp1('fatherName')} placeholder="Father's full name" className={inputCls(errors.fatherName)} />
                </Field>

                <Field label="Date of Birth" icon={Calendar}>
                  <input {...inp1('dateOfBirth')} type="date" className={inputCls()} />
                </Field>

                <Field label="Aadhar Number" icon={Hash}>
                  <input {...inp1('aadharNo')} placeholder="XXXX XXXX XXXX" maxLength={14} className={inputCls()} />
                </Field>
              </div>

              {/* Gender */}
              <div>
                <label className={labelCls}>Gender *</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['MALE', 'FEMALE'] as const).map(g => (
                    <label
                      key={g}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 transition-all ${
                        form1.gender === g
                          ? 'border-[#0F4F4A] bg-[#f0fdf4]'
                          : 'border-[#e2e8f0] bg-white hover:border-[#bbf7d0] hover:bg-[#f0fdf4]/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={form1.gender === g}
                        onChange={() => setForm1(p => ({ ...p, gender: g }))}
                        className="hidden"
                      />
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                        form1.gender === g ? 'border-[#0F4F4A] bg-[#0F4F4A]' : 'border-[#cbd5e1]'
                      }`}>
                        {form1.gender === g && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                      <span className={`text-sm font-semibold ${form1.gender === g ? 'text-[#0D6B5E]' : 'text-[#374151]'}`}>
                        {g === 'MALE' ? '♂ Male' : '♀ Female'}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.gender && <p className="mt-1.5 flex items-center gap-1 text-xs text-[#ef4444]"><span>⚠</span>{errors.gender}</p>}
              </div>
            </div>
          )}

          {/* ── STEP 2: Contact Information ────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <p className="font-headline text-lg font-bold text-[#0f172a]">Contact Information</p>
                <p className="mt-0.5 text-sm text-[#64748b]">How to reach the student or guardian.</p>
              </div>

              {/* WhatsApp */}
              <div>
                <label className={labelCls}>WhatsApp Number *</label>
                <div className="flex gap-2">
                  <select
                    value={form2.whatsappCode}
                    onChange={e => setForm2(p => ({ ...p, whatsappCode: e.target.value }))}
                    className="h-11 rounded-xl border-none bg-[#f1f5f9] px-2 text-sm text-[#0f172a] outline-none focus:ring-2 focus:ring-[#0F4F4A]/25 focus:bg-white"
                  >
                    {COUNTRY_CODES.map(c => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <div className="flex-1">
                    <input
                      value={form2.whatsappNumber}
                      onChange={e => setForm2(p => ({ ...p, whatsappNumber: e.target.value }))}
                      type="tel"
                      placeholder="3xx xxxxxxx"
                      className={inputCls(errors.whatsappNumber)}
                    />
                  </div>
                </div>
                {errors.whatsappNumber && <p className="mt-1.5 flex items-center gap-1 text-xs text-[#ef4444]"><span>⚠</span>{errors.whatsappNumber}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Mobile Number *" error={errors.mobileNumber} icon={Phone}>
                  <input {...inp2('mobileNumber')} type="tel" placeholder="+92 3xx xxxxxxx" className={inputCls(errors.mobileNumber)} />
                </Field>

                <Field label="Email Address" error={errors.email} icon={BadgeCheck}>
                  <input
                    value={form2.email}
                    onChange={e => setForm2(p => ({ ...p, email: e.target.value }))}
                    type="email"
                    placeholder="optional — auto-generated if blank"
                    className={inputCls(errors.email)}
                  />
                </Field>
              </div>

              <Field label="Address" icon={MapPin}>
                <textarea
                  value={form2.address}
                  onChange={e => setForm2(p => ({ ...p, address: e.target.value }))}
                  rows={3}
                  placeholder="Home / residential address (optional)"
                  className={`w-full rounded-xl border-none bg-[#f1f5f9] px-4 py-3 pl-9 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#0F4F4A]/25 resize-none`}
                />
              </Field>
            </div>
          )}

          {/* ── STEP 3: Institute Information ──────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <p className="font-headline text-lg font-bold text-[#0f172a]">Institute Information</p>
                <p className="mt-0.5 text-sm text-[#64748b]">Academic and enrollment details.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="School / Institute Name *" error={errors.schoolName} icon={School} className="sm:col-span-2">
                  <input {...inp3('schoolName')} placeholder="e.g. Al-Noor Institute" className={inputCls(errors.schoolName)} />
                </Field>

                <Field label="Roll Number" icon={Hash}>
                  <input {...inp3('rollNumber')} placeholder="Optional" className={inputCls()} />
                </Field>

                <Field label="Join Date *" error={errors.joinDate} icon={Calendar}>
                  <input {...inp3('joinDate')} type="date" className={inputCls(errors.joinDate)} />
                </Field>
              </div>

              <div>
                <label className={labelCls}>Class / Standard *</label>
                <ClassDropdown
                  classes={classes}
                  value={form3.classId}
                  onChange={id => setForm3(p => ({ ...p, classId: id, additionalClassIds: p.additionalClassIds.filter(extraId => extraId !== id) }))}
                  error={errors.classId}
                  loading={classesLoading}
                />
              </div>

              <div className="space-y-3">
                {form3.additionalClassIds.map((classId, index) => (
                  <div key={index}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className={labelCls}>Additional Class {index + 1}</label>
                      <button
                        type="button"
                        onClick={() => setForm3(p => ({ ...p, additionalClassIds: p.additionalClassIds.filter((_, i) => i !== index) }))}
                        className="text-xs font-semibold text-[#ef4444] hover:text-[#b91c1c]"
                      >
                        Remove
                      </button>
                    </div>
                    <ClassDropdown
                      classes={classes.filter(c => c.id !== form3.classId && !form3.additionalClassIds.some((id, i) => id === c.id && i !== index))}
                      value={classId}
                      onChange={id => setForm3(p => ({
                        ...p,
                        additionalClassIds: p.additionalClassIds.map((value, i) => i === index ? id : value)
                      }))}
                      loading={classesLoading}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setForm3(p => ({ ...p, additionalClassIds: [...p.additionalClassIds, ''] }))}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#ecfdf5] px-4 text-sm font-semibold text-[#0f766e] transition hover:bg-[#d1fae5]"
                >
                  + Add another class
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Fee Configuration ──────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <p className="font-headline text-lg font-bold text-[#0f172a]">Fee Configuration</p>
                <p className="mt-0.5 text-sm text-[#64748b]">Fee is optional. Use 0 for free students.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Fee Category */}
                <div>
                  <label className={labelCls}>Fee Category</label>
                  <select
                    value={form4.feeCategory}
                    onChange={e => setForm4(p => ({ ...p, feeCategory: e.target.value }))}
                    className={`h-11 w-full rounded-xl border-none px-4 text-sm outline-none transition-all ${
                      errors.feeCategory
                        ? 'bg-[#fef2f2] ring-2 ring-[#ef4444]/30'
                        : 'bg-[#f1f5f9] focus:ring-2 focus:ring-[#0F4F4A]/25 focus:bg-white'
                    }`}
                  >
                    <option value="">Select category</option>
                    {FEE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.feeCategory && <p className="mt-1.5 flex items-center gap-1 text-xs text-[#ef4444]"><span>⚠</span>{errors.feeCategory}</p>}
                </div>

                {/* Fee Type */}
                <div>
                  <label className={labelCls}>Fee Type</label>
                  <select
                    value={form4.feeType}
                    onChange={e => setForm4(p => ({ ...p, feeType: e.target.value }))}
                    className={`h-11 w-full rounded-xl border-none px-4 text-sm outline-none transition-all ${
                      errors.feeType
                        ? 'bg-[#fef2f2] ring-2 ring-[#ef4444]/30'
                        : 'bg-[#f1f5f9] focus:ring-2 focus:ring-[#0F4F4A]/25 focus:bg-white'
                    }`}
                  >
                    <option value="">Select type</option>
                    {FEE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.feeType && <p className="mt-1.5 flex items-center gap-1 text-xs text-[#ef4444]"><span>⚠</span>{errors.feeType}</p>}
                </div>

                {/* Fee Title */}
                <Field label="Fee Title" className="sm:col-span-2">
                  <input
                    value={form4.feeTitle}
                    onChange={e => setForm4(p => ({ ...p, feeTitle: e.target.value }))}
                    placeholder="e.g. Monthly Tuition Fee – April"
                    className={inputCls()}
                  />
                </Field>

                {/* Fee Amount — highlighted */}
                <div className="sm:col-span-2">
                  <label className={labelCls}>Fee Amount *</label>
                  <div className="relative">
                    <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0F4F4A]" />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form4.feeAmount}
                      onChange={e => setForm4(p => ({ ...p, feeAmount: e.target.value }))}
                      placeholder="0.00"
                      className={`h-12 w-full rounded-xl border-none pl-9 pr-4 text-base font-semibold outline-none transition-all ${
                        errors.feeAmount
                          ? 'bg-[#fef2f2] ring-2 ring-[#ef4444]/30 text-[#ef4444]'
                          : 'bg-[#f0fdf4] ring-2 ring-[#0F4F4A]/20 text-[#0D6B5E] focus:ring-[#0F4F4A]/40 focus:bg-white'
                      }`}
                    />
                  </div>
                  {errors.feeAmount && <p className="mt-1.5 flex items-center gap-1 text-xs text-[#ef4444]"><span>⚠</span>{errors.feeAmount}</p>}
                </div>

                {/* Discount + Due Date */}
                <Field label="Discount (optional)" icon={DollarSign}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form4.feeDiscount}
                    onChange={e => setForm4(p => ({ ...p, feeDiscount: e.target.value }))}
                    placeholder="0.00"
                    className={inputCls()}
                  />
                </Field>

                <div>
                  <label className={labelCls}>Due Date *</label>
                  <input
                    type="date"
                    value={form4.feeDueDate}
                    onChange={e => setForm4(p => ({ ...p, feeDueDate: e.target.value }))}
                    className={inputCls(errors.feeDueDate)}
                  />
                  {errors.feeDueDate && <p className="mt-1.5 flex items-center gap-1 text-xs text-[#ef4444]"><span>⚠</span>{errors.feeDueDate}</p>}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 rounded-xl bg-[#f8fafc] p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#64748b]">Payment Options</p>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">Partial Fee Supported</p>
                    <p className="text-xs text-[#94a3b8]">Allow student to pay fee in installments</p>
                  </div>
                  <Toggle
                    checked={form4.partialFeeSupported}
                    onChange={() => setForm4(p => ({ ...p, partialFeeSupported: !p.partialFeeSupported }))}
                  />
                </div>

                <div className="h-px bg-[#e2e8f0]" />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">Collect Fee On Month Start</p>
                    <p className="text-xs text-[#94a3b8]">Auto-generate fee record on 1st of each month</p>
                  </div>
                  <Toggle
                    checked={form4.collectOnMonthStart}
                    onChange={() => setForm4(p => ({ ...p, collectOnMonthStart: !p.collectOnMonthStart }))}
                  />
                </div>
              </div>
            </div>
          )}

        </div>{/* end transition wrapper */}

        {/* API error */}
        {apiError && (
          <div className="mt-4 rounded-xl bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#ef4444]">
            ⚠ {apiError}
          </div>
        )}

        {/* Navigation */}
        <div className={`mt-8 flex gap-3 ${step === 1 ? 'justify-end' : 'justify-between'}`}>
          {step > 1 && (
            <Button type="button" variant="secondary" onClick={handleBack}>
              <ChevronLeft size={16} />
              Back
            </Button>
          )}

          {step < 4 ? (
            <Button type="button" onClick={handleNext}>
              Next
              <ChevronRight size={16} />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Enrolling…
                </>
              ) : (
                <>
                  <Check size={16} />
                  Save Student
                </>
              )}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
