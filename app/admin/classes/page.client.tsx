'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  BookOpen, Users, GraduationCap, BarChart3,
  Search, Plus, X, MoreVertical, Pencil, Trash2, Eye,
  Grid3X3, List, AlertCircle, CheckCircle2, MapPin,
  UserPlus, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { KpiCard, Button } from '@/components/ui';

// ── Types ─────────────────────────────────────────────────────────────────────
export type TeacherOption = { id: string; user: { fullName: string } };
export type ClassItem = {
  id: string;
  name: string;
  section: string;
  roomNo?: string | null;
  academicYear: string;
  teacherLinks?: { teacherId: string; teacher: { user: { fullName: string } } }[];
  _count?: { students: number };
};

type FormState = {
  id?: string;
  name: string;
  section: string;
  roomNo: string;
  academicYear: string;
  classTeacherId: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const TEAL = '#0F766E';
const CURRENT_YEAR = '2026-27';
const INPUT_CLS =
  'h-11 w-full rounded-xl bg-[#F1F5F9] border-none px-3 text-sm text-[#0F172A] placeholder-[#94A3B8] outline-none focus:ring-2 focus:ring-[#0F766E]/20 transition-shadow';
const LABEL_CLS = 'mb-1.5 block text-xs font-semibold text-[#64748B]';
const CARD_CLS =
  'rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]';
const INITIAL_FORM: FormState = {
  name: '', section: '', roomNo: '', academicYear: CURRENT_YEAR, classTeacherId: '',
};
const TEACHER_COLORS = ['#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626', '#2563EB'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function studentBadge(n: number) {
  if (n === 0) return 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]';
  if (n < 6) return 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]';
  return 'bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4]';
}
function teacherColor(name: string) {
  return TEACHER_COLORS[name.charCodeAt(0) % TEACHER_COLORS.length];
}
function nameInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let _seq = 0;
type Toast = { id: number; message: string; type: 'success' | 'error' };

function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-4 z-[100] flex max-w-xs w-full flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium border ${
            t.type === 'success'
              ? 'bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]'
              : 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
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

// ── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteModal({
  klass, onCancel, onConfirm, loading,
}: { klass: ClassItem; onCancel: () => void; onConfirm: () => void; loading: boolean }) {
  const students = klass._count?.students ?? 0;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div className={`w-full max-w-sm ${CARD_CLS} p-6`} onClick={e => e.stopPropagation()}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF2F2]">
          <Trash2 size={22} className="text-[#B91C1C]" />
        </div>
        <h3 className="mb-1 text-center text-lg font-bold text-[#0F172A]">Delete Class?</h3>
        <p className="mb-3 text-center text-sm text-[#64748B]">
          <span className="font-semibold text-[#0F172A]" dir="auto">{klass.name} – {klass.section}</span> will be permanently removed.
        </p>
        {students > 0 && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-3 py-2.5 text-xs text-[#B45309]">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            {students} student{students !== 1 ? 's' : ''} will be detached from this class.
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-[#EF4444] py-2.5 text-sm font-bold text-white hover:bg-[#DC2626] disabled:opacity-60 transition-colors"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Action Menu ───────────────────────────────────────────────────────────────
function ActionMenu({
  classId, onEdit, onDelete,
}: { classId: string; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
          <Link
            href={`/admin/classes/${classId}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-[#0F766E] hover:bg-[#F0FDFA] transition-colors"
          >
            <Eye size={13} /> View Details
          </Link>
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-[#334155] hover:bg-[#F8FAFC] transition-colors"
          >
            <Pencil size={13} /> Edit
          </button>
          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Add / Edit Drawer ─────────────────────────────────────────────────────────
function Drawer({
  open, editing, form, setForm, teachers, saving, error, onClose, onSave,
}: {
  open: boolean; editing: boolean; form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  teachers: TeacherOption[]; saving: boolean; error: string;
  onClose: () => void; onSave: (e: React.FormEvent) => Promise<void>;
}) {
  const ff = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white border-l border-[#E2E8F0] shadow-2xl transition-transform duration-300 sm:w-[440px] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>
              {editing ? 'Edit Class' : 'New Class'}
            </p>
            <h2 className="text-lg font-bold text-[#0F172A]">
              {editing ? 'Update Details' : 'Create a Class'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSave} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-4 p-5">

            <div>
              <label className={LABEL_CLS}>Class Name *</label>
              <input
                value={form.name}
                onChange={ff('name')}
                placeholder="e.g. Grade 5 Quran / الصف الخامس"
                required
                dir="auto"
                className={INPUT_CLS}
              />
              <p className="mt-1 text-[10px] text-[#94A3B8]">Supports English and Arabic text</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Section *</label>
                <input
                  value={form.section}
                  onChange={ff('section')}
                  placeholder="A / أ"
                  required
                  dir="auto"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Academic Year *</label>
                <input
                  value={form.academicYear}
                  onChange={ff('academicYear')}
                  placeholder="2026-27"
                  required
                  className={INPUT_CLS}
                />
              </div>
            </div>

            <div>
              <label className={LABEL_CLS}>Room Number</label>
              <input
                value={form.roomNo}
                onChange={ff('roomNo')}
                placeholder="e.g. R-101 / غرفة ١٠١"
                dir="auto"
                className={INPUT_CLS}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Class Teacher</label>
              <select
                value={form.classTeacherId}
                onChange={ff('classTeacherId')}
                className={`${INPUT_CLS} cursor-pointer`}
              >
                <option value="">Select teacher (optional)</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.user.fullName}</option>
                ))}
              </select>
              {!form.classTeacherId && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[#B45309]">
                  <AlertCircle size={11} className="shrink-0" /> No teacher — can assign later
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-sm text-[#B91C1C]">
                <AlertCircle size={14} className="shrink-0" /> {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex shrink-0 gap-3 border-t border-[#E2E8F0] p-5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: TEAL }}
            >
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── Grid Card ─────────────────────────────────────────────────────────────────
function ClassCard({
  klass, onEdit, onDelete,
}: { klass: ClassItem; onEdit: () => void; onDelete: () => void }) {
  const teacher = klass.teacherLinks?.[0]?.teacher.user.fullName;
  const students = klass._count?.students ?? 0;
  const tColor = teacher ? teacherColor(teacher) : undefined;

  return (
    <div className={`${CARD_CLS} flex flex-col gap-4 p-5 hover:shadow-md transition-shadow`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: TEAL }}
          >
            <BookOpen size={18} />
          </div>
          <div className="min-w-0">
            <Link
              href={`/admin/classes/${klass.id}`}
              className="block truncate font-bold text-[#0F172A] hover:text-[#0F766E] transition-colors leading-tight"
              dir="auto"
            >
              {klass.name}
            </Link>
            <p className="mt-0.5 text-xs text-[#94A3B8]">
              Section {klass.section} · {klass.academicYear}
            </p>
          </div>
        </div>
        <ActionMenu classId={klass.id} onEdit={onEdit} onDelete={onDelete} />
      </div>

      {/* Teacher */}
      {teacher ? (
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: tColor }}
          >
            {nameInitials(teacher)}
          </div>
          <span className="text-sm text-[#334155] truncate" dir="auto">{teacher}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FEF2F2]">
            <UserPlus size={13} className="text-[#B91C1C]" />
          </div>
          <span className="text-xs font-medium text-[#B91C1C]">No teacher assigned</span>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-[#F1F5F9] pt-3">
        <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
          <MapPin size={12} />
          <span dir="auto">{klass.roomNo || 'No room'}</span>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${studentBadge(students)}`}>
          {students} student{students !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className={`${CARD_CLS} animate-pulse p-5`}>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-[#F1F5F9]" />
        <div className="flex-1">
          <div className="mb-1.5 h-4 w-28 rounded bg-[#F1F5F9]" />
          <div className="h-3 w-20 rounded bg-[#F1F5F9]" />
        </div>
      </div>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-full bg-[#F1F5F9]" />
        <div className="h-3 w-32 rounded bg-[#F1F5F9]" />
      </div>
      <div className="flex items-center justify-between border-t border-[#F1F5F9] pt-3">
        <div className="h-3 w-16 rounded bg-[#F1F5F9]" />
        <div className="h-5 w-20 rounded-full bg-[#F1F5F9]" />
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ isFiltered, onAdd }: { isFiltered: boolean; onAdd: () => void }) {
  return (
    <div className={`${CARD_CLS} flex flex-col items-center justify-center px-6 py-16 text-center`}>
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: '#F0FDFA' }}
      >
        <BookOpen size={28} style={{ color: TEAL }} />
      </div>
      <h3 className="mb-1 text-lg font-bold text-[#0F172A]">
        {isFiltered ? 'No classes matched' : 'No classes yet'}
      </h3>
      <p className="mb-6 max-w-xs text-sm text-[#64748B]">
        {isFiltered
          ? 'Try a different search term or clear the filter.'
          : 'Create your first class to get started with Manarah Institute.'}
      </p>
      {!isFiltered && (
        <button
          onClick={onAdd}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(15,118,110,0.28)] active:scale-[0.98] transition-all"
          style={{ backgroundColor: TEAL }}
        >
          <Plus size={15} /> Create First Class
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminClassesPageClient({
  initialClasses,
  initialTeachers,
}: {
  initialClasses: ClassItem[];
  initialTeachers: TeacherOption[];
}) {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>(initialClasses);
  const [teachers] = useState<TeacherOption[]>(initialTeachers);
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<ClassItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++_seq;
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  const removeToast = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/classes', { cache: 'no-store' });
      if (res.ok) setClasses(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(c =>
      `${c.name} ${c.section} ${c.academicYear} ${c.roomNo ?? ''} ${c.teacherLinks?.[0]?.teacher.user.fullName ?? ''}`
        .toLowerCase().includes(q)
    );
  }, [classes, search]);

  useEffect(() => { setPage(1); }, [search, view]);

  const PAGE_SIZE = view === 'grid' ? 9 : 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const stats = useMemo(() => {
    const total = classes.length;
    const totalStudents = classes.reduce((s, c) => s + (c._count?.students ?? 0), 0);
    const assigned = classes.filter(c => (c.teacherLinks?.length ?? 0) > 0).length;
    const avgSize = total > 0 ? totalStudents / total : 0;
    return { total, totalStudents, assigned, unassigned: total - assigned, avgSize };
  }, [classes]);

  const openAdd = () => {
    setEditing(false);
    setForm(INITIAL_FORM);
    setFormError('');
    setDrawerOpen(true);
  };

  const openEdit = (klass: ClassItem) => {
    setEditing(true);
    setForm({
      id: klass.id,
      name: klass.name,
      section: klass.section,
      roomNo: klass.roomNo ?? '',
      academicYear: klass.academicYear,
      classTeacherId: klass.teacherLinks?.[0]?.teacherId ?? '',
    });
    setFormError('');
    setDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/classes', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setFormError(data?.error ?? 'Unable to save class.'); return; }
      setDrawerOpen(false);
      await reload();
      addToast(editing ? `${form.name} updated.` : `${form.name} created.`, 'success');
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
      const res = await fetch(`/api/classes?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        addToast(data?.error ?? 'Unable to delete class.', 'error');
        return;
      }
      const label = `${deleteTarget.name} – ${deleteTarget.section}`;
      setDeleteTarget(null);
      await reload();
      addToast(`${label} deleted.`, 'success');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: TEAL }}>
            Class Management
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#0F172A] sm:text-3xl">
            Classes Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Manage classes, teachers, and enrolment for Manarah Institute.
          </p>
        </div>
        <Button onClick={openAdd} className="hidden sm:flex">
          <Plus size={16} /> Add Class
        </Button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard variant="primary" icon={<BookOpen size={20} />} label="Total Classes" value={stats.total} />
        <KpiCard variant="accent" icon={<Users size={20} />} label="Students Enrolled" value={stats.totalStudents} />
        <KpiCard variant="success" icon={<GraduationCap size={20} />} label="Teachers Assigned" value={`${stats.assigned}/${stats.total}`} />
        <KpiCard variant="primary" icon={<BarChart3 size={20} />} label="Avg Class Size" value={stats.avgSize.toFixed(1)} />
      </div>

      {/* ── Toolbar ── */}
      <div className={`${CARD_CLS} p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by class name, teacher, room…"
              className="h-10 w-full rounded-xl bg-[#F1F5F9] border-none pl-9 pr-8 text-sm text-[#0F172A] placeholder-[#94A3B8] outline-none focus:ring-2 focus:ring-[#0F766E]/20"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-[#F1F5F9] p-1">
            <button
              onClick={() => setView('grid')}
              className={`rounded-lg p-1.5 transition-colors ${view === 'grid' ? 'text-white shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}`}
              style={view === 'grid' ? { backgroundColor: TEAL } : {}}
            >
              <Grid3X3 size={15} />
            </button>
            <button
              onClick={() => setView('table')}
              className={`rounded-lg p-1.5 transition-colors ${view === 'table' ? 'text-white shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}`}
              style={view === 'table' ? { backgroundColor: TEAL } : {}}
            >
              <List size={15} />
            </button>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white sm:hidden"
            style={{ backgroundColor: TEAL }}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* ── Section Label ── */}
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-sm font-bold text-[#0F172A]">Class List</h2>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: '#F0FDFA', color: TEAL }}
        >
          {filtered.length} {filtered.length === 1 ? 'class' : 'classes'}
        </span>
      </div>

      {/* ── Content ── */}
      {loading ? (
        view === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className={`${CARD_CLS} animate-pulse p-8 text-center text-sm text-[#64748B]`}>
            Loading classes…
          </div>
        )
      ) : filtered.length === 0 ? (
        <EmptyState isFiltered={Boolean(search)} onAdd={openAdd} />
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map(klass => (
            <ClassCard
              key={klass.id}
              klass={klass}
              onEdit={() => openEdit(klass)}
              onDelete={() => setDeleteTarget(klass)}
            />
          ))}
        </div>
      ) : (
        <div className={`overflow-x-auto ${CARD_CLS}`}>
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-[#F1F5F9]">
                {['Class', 'Teacher', 'Room', 'Students', 'Year', ''].map(col => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((klass, idx) => {
                const teacher = klass.teacherLinks?.[0]?.teacher.user.fullName;
                const students = klass._count?.students ?? 0;
                const tColor = teacher ? teacherColor(teacher) : undefined;
                return (
                  <tr
                    key={klass.id}
                    className={`transition-colors hover:bg-[#F0FDFA] ${idx < paged.length - 1 ? 'border-b border-[#F8FAFC]' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/classes/${klass.id}`}
                        className="font-semibold text-[#0F172A] hover:text-[#0F766E] transition-colors"
                        dir="auto"
                      >
                        {klass.name} – {klass.section}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      {teacher ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: tColor }}
                          >
                            {nameInitials(teacher)}
                          </div>
                          <span className="text-[#334155]" dir="auto">{teacher}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-semibold text-[#B91C1C]">
                          <AlertCircle size={11} /> Not assigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {klass.roomNo ? (
                        <span className="inline-flex items-center gap-1 text-[#334155]" dir="auto">
                          <MapPin size={12} className="text-[#94A3B8]" /> {klass.roomNo}
                        </span>
                      ) : (
                        <span className="text-[#CBD5E1]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${studentBadge(students)}`}>
                        {students}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#64748B]">{klass.academicYear}</td>
                    <td className="px-4 py-4">
                      <ActionMenu
                        classId={klass.id}
                        onEdit={() => openEdit(klass)}
                        onDelete={() => setDeleteTarget(klass)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#64748B]">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg p-2 text-[#64748B] hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40"
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
                  <span key={`el-${i}`} className="px-1 text-xs text-[#94A3B8]">…</span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n as number)}
                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors ${
                      page === n ? 'text-white shadow-sm' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                    }`}
                    style={page === n ? { backgroundColor: TEAL } : {}}
                  >
                    {n}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg p-2 text-[#64748B] hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile FAB ── */}
      <button
        onClick={openAdd}
        className="fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_8px_20px_rgba(15,118,110,0.38)] active:scale-[0.96] transition-all sm:hidden"
        style={{ backgroundColor: TEAL }}
        aria-label="Add class"
      >
        <Plus size={22} />
      </button>

      {/* ── Overlays ── */}
      <Drawer
        open={drawerOpen}
        editing={editing}
        form={form}
        setForm={setForm}
        teachers={teachers}
        saving={saving}
        error={formError}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
      />
      {deleteTarget && (
        <DeleteModal
          klass={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
      <ToastContainer toasts={toasts} remove={removeToast} />
    </div>
  );
}
