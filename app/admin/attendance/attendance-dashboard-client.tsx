'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays, ChevronLeft, ChevronRight, Search, Check, X,
  AlertCircle, Clock, Users, UserCheck, UserX, UserMinus, RotateCcw,
  Sparkles, Loader2, Save, Filter, TrendingUp, BookOpen, GraduationCap,
  Calendar, CheckCheck, Briefcase, Info, CheckCircle2, Award
} from 'lucide-react';

export type TabKey = 'overview' | 'students' | 'teachers';
export type MarkStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type StatusFilter = 'ALL' | 'UNMARKED' | 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export type ClassOption = {
  id: string;
  name: string;
  section: string;
};

export type StudentRow = {
  id: string;
  fullName: string;
  admissionNo: string;
  classId: string;
  classLabel: string;
  status: string | null;
};

export type TeacherRow = {
  id: string;
  fullName: string;
  status: string | null;
};

export type TeacherMonthlySummaryRow = {
  teacherId: string;
  present: number;
  absent: number;
  late: number;
  total: number;
};

export type MonthDayStatus = {
  date: string;
  status: string;
  count: number;
};

export type AttendanceDetailRow = {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks: string | null;
  student: { admissionNo: string; user: { fullName: string } };
  class: { name: string; section: string };
};

export type StaffOverview = {
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  percentage: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function nameInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDateDisplay(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    const isToday =
      today.getFullYear() === y &&
      today.getMonth() === m - 1 &&
      today.getDate() === d;

    const formatted = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    return isToday ? `Today (${formatted})` : formatted;
  } catch {
    return dateStr;
  }
}

function getOffsetDate(dateStr: string, offsetDays: number): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d + offsetDays);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    return `${ny}-${nm}-${nd}`;
  } catch {
    return dateStr;
  }
}

function getTodayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function avatarTone(status: string | null) {
  if (status === 'PRESENT') return 'bg-[#ECFDF3] text-[#15803D] border border-[#BBF7D0]';
  if (status === 'ABSENT') return 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]';
  if (status === 'LATE') return 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]';
  if (status === 'EXCUSED') return 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]';
  return 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]';
}

function statusPillTone(status: string | null) {
  if (status === 'PRESENT') return 'bg-[#ECFDF3] text-[#15803D] border border-[#86EFAC]';
  if (status === 'ABSENT') return 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5]';
  if (status === 'LATE') return 'bg-[#FFFBEB] text-[#B45309] border border-[#FCD34D]';
  if (status === 'EXCUSED') return 'bg-[#EFF6FF] text-[#1E40AF] border border-[#93C5FD]';
  return 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]';
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({
  open,
  title,
  subtitle,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[90vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] px-5 py-4 sm:px-6">
          <div>
            <h3 className="text-lg font-bold text-[#0F172A] sm:text-xl">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-xs text-[#64748B]">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-74px)] overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AttendanceDashboardClient({
  initialTab,
  selectedDate,
  selectedClassId,
  classes,
  students,
  teachers,
  teacherMonthlySummary,
  overview,
  staffOverview,
  monthStatusByDay
}: {
  initialTab: 'overview' | 'students' | 'teachers';
  selectedDate: string;
  selectedClassId: string;
  classes: ClassOption[];
  students: StudentRow[];
  teachers: TeacherRow[];
  teacherMonthlySummary: TeacherMonthlySummaryRow[];
  overview: { present: number; absent: number; late: number; percentage: number };
  staffOverview?: StaffOverview;
  monthStatusByDay: MonthDayStatus[];
  page?: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Primary Persona: 'students' vs 'teachers'
  const [persona, setPersona] = useState<'students' | 'teachers'>(() => {
    return initialTab === 'teachers' ? 'teachers' : 'students';
  });

  // Sub-views
  // Students sub-view: 'calendar' (Monthly Heatmap & Insights) | 'marking' (Daily Register)
  const [studentView, setStudentView] = useState<'calendar' | 'marking'>(() => {
    return initialTab === 'students' ? 'marking' : 'calendar';
  });

  // Teachers sub-view: 'marking' (Daily Staff Marking) | 'summary' (Monthly Register)
  const [teacherView, setTeacherView] = useState<'marking' | 'summary'>('marking');

  // Attendance state maps
  const [studentStatusMap, setStudentStatusMap] = useState<Record<string, string | null>>(
    Object.fromEntries(students.map((item) => [item.id, item.status]))
  );
  const [teacherStatusMap, setTeacherStatusMap] = useState<Record<string, string | null>>(
    Object.fromEntries(teachers.map((item) => [item.id, item.status]))
  );

  // Dirty tracking
  const [dirtyStudents, setDirtyStudents] = useState<Record<string, MarkStatus>>({});
  const [dirtyTeachers, setDirtyTeachers] = useState<Record<string, MarkStatus>>({});
  const [savingStudents, setSavingStudents] = useState(false);
  const [savingTeachers, setSavingTeachers] = useState(false);
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Search & filter
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<StatusFilter>('ALL');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<StatusFilter>('ALL');

  // Day Inspector Modal (for Student Calendar)
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDayLoading, setSelectedDayLoading] = useState(false);
  const [selectedDayError, setSelectedDayError] = useState('');
  const [selectedDayRows, setSelectedDayRows] = useState<AttendanceDetailRow[]>([]);
  const [modalFilter, setModalFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>('ALL');

  // Sync state if props change
  useEffect(() => {
    setStudentStatusMap(Object.fromEntries(students.map((item) => [item.id, item.status])));
    setDirtyStudents({});
  }, [students]);

  useEffect(() => {
    setTeacherStatusMap(Object.fromEntries(teachers.map((item) => [item.id, item.status])));
    setDirtyTeachers({});
  }, [teachers]);

  const teacherMonthlySummaryMap = useMemo(
    () => new Map(teacherMonthlySummary.map((item) => [item.teacherId, item])),
    [teacherMonthlySummary]
  );

  const monthMap = useMemo(() => {
    const map = new Map<string, { present: number; absent: number; late: number; excused: number }>();
    for (const row of monthStatusByDay) {
      const current = map.get(row.date) ?? { present: 0, absent: 0, late: 0, excused: 0 };
      if (row.status === 'PRESENT') current.present += row.count;
      if (row.status === 'ABSENT') current.absent += row.count;
      if (row.status === 'LATE') current.late += row.count;
      if (row.status === 'EXCUSED') current.excused += row.count;
      map.set(row.date, current);
    }
    return map;
  }, [monthStatusByDay]);

  const studentsById = useMemo(() => new Map(students.map((item) => [item.id, item])), [students]);

  const studentChangedCount = Object.keys(dirtyStudents).length;
  const teacherChangedCount = Object.keys(dirtyTeachers).length;
  const todayDateStr = getTodayDateStr();
  const isSelectedToday = selectedDate === todayDateStr;

  // ── Navigation helpers ──
  function navigateTo(date: string, classId: string, targetPersona: 'students' | 'teachers' = persona, targetSubView?: string) {
    if (studentChangedCount > 0 || teacherChangedCount > 0) {
      const ok = window.confirm('آپ نے حاضری تبدیل کی ہے جو ابھی محفوظ نہیں ہوئی۔ کیا آپ بغیر محفوظ کیے آگے بڑھنا چاہتے ہیں؟ (You have unsaved changes)');
      if (!ok) return;
    }
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (targetPersona === 'students' && classId) params.set('classId', classId);

    // Keep backwards compatibility with ?tab=
    if (targetPersona === 'students') {
      const effectiveSub = targetSubView ?? studentView;
      params.set('tab', effectiveSub === 'marking' ? 'students' : 'overview');
    } else {
      params.set('tab', 'teachers');
    }

    startTransition(() => {
      router.push(`/admin/attendance?${params.toString()}`);
    });
  }

  function handleDateStep(offset: number) {
    const nextDate = getOffsetDate(selectedDate, offset);
    navigateTo(nextDate, selectedClassId, persona);
  }

  function handleJumpToday() {
    navigateTo(todayDateStr, selectedClassId, persona);
  }

  function handleClassChange(e: React.ChangeEvent<HTMLSelectElement>) {
    navigateTo(selectedDate, e.target.value, 'students', studentView);
  }

  function handlePersonaSwitch(nextPersona: 'students' | 'teachers') {
    if (nextPersona === persona) return;
    if (studentChangedCount > 0 || teacherChangedCount > 0) {
      const ok = window.confirm('You have unsaved changes. Discard and switch?');
      if (!ok) return;
    }
    setPersona(nextPersona);
    setFlash(null);
    navigateTo(selectedDate, selectedClassId, nextPersona);
  }

  // ── Student marking logic ──
  function markStudent(studentId: string, status: MarkStatus) {
    setStudentStatusMap((prev) => ({ ...prev, [studentId]: status }));
    setDirtyStudents((prev) => ({ ...prev, [studentId]: status }));
    setFlash(null);
  }

  function markAllStudents(status: MarkStatus) {
    const nextMap = { ...studentStatusMap };
    const nextDirty = { ...dirtyStudents };
    for (const item of filteredStudents) {
      nextMap[item.id] = status;
      nextDirty[item.id] = status;
    }
    setStudentStatusMap(nextMap);
    setDirtyStudents(nextDirty);
    setFlash(null);
  }

  function discardStudentChanges() {
    setStudentStatusMap(Object.fromEntries(students.map((item) => [item.id, item.status])));
    setDirtyStudents({});
    setFlash(null);
  }

  async function saveStudents() {
    if (!studentChangedCount) return;
    setSavingStudents(true);
    setFlash(null);
    try {
      const grouped = new Map<string, { studentId: string; status: MarkStatus }[]>();
      for (const [studentId, status] of Object.entries(dirtyStudents)) {
        const student = studentsById.get(studentId);
        if (!student || !student.classId) continue;
        const list = grouped.get(student.classId) ?? [];
        list.push({ studentId, status });
        grouped.set(student.classId, list);
      }

      for (const [classId, records] of grouped.entries()) {
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classId,
            date: selectedDate,
            records
          })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error?.formErrors?.[0] || data?.error || 'Unable to save student attendance');
        }
      }

      setDirtyStudents({});
      setFlash({ message: `کامیابی کے ساتھ ${studentChangedCount} طلباء کی حاضری محفوظ ہو گئی۔ (Saved successfully)`, type: 'success' });
      router.refresh();
    } catch (error) {
      setFlash({ message: error instanceof Error ? error.message : 'طلباء کی حاضری محفوظ کرنے میں مسئلہ پیش آیا۔', type: 'error' });
    } finally {
      setSavingStudents(false);
    }
  }

  // ── Teacher marking logic ──
  function markTeacher(teacherId: string, status: MarkStatus) {
    setTeacherStatusMap((prev) => ({ ...prev, [teacherId]: status }));
    setDirtyTeachers((prev) => ({ ...prev, [teacherId]: status }));
    setFlash(null);
  }

  function markAllTeachers(status: MarkStatus) {
    const nextMap = { ...teacherStatusMap };
    const nextDirty = { ...dirtyTeachers };
    for (const item of filteredTeachers) {
      nextMap[item.id] = status;
      nextDirty[item.id] = status;
    }
    setTeacherStatusMap(nextMap);
    setDirtyTeachers(nextDirty);
    setFlash(null);
  }

  function discardTeacherChanges() {
    setTeacherStatusMap(Object.fromEntries(teachers.map((item) => [item.id, item.status])));
    setDirtyTeachers({});
    setFlash(null);
  }

  async function saveTeachers() {
    if (!teacherChangedCount) return;
    setSavingTeachers(true);
    setFlash(null);
    try {
      const tasks = Object.entries(dirtyTeachers).map(async ([teacherId, status]) => {
        const res = await fetch('/api/staff-attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teacherId, date: selectedDate, status })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || 'Unable to save teacher attendance');
        }
      });

      await Promise.all(tasks);
      setDirtyTeachers({});
      setFlash({ message: `کامیابی کے ساتھ ${teacherChangedCount} اساتذہ کی حاضری محفوظ ہو گئی۔ (Saved successfully)`, type: 'success' });
      router.refresh();
    } catch (error) {
      setFlash({ message: error instanceof Error ? error.message : 'اساتذہ کی حاضری محفوظ نہیں ہو سکی۔', type: 'error' });
    } finally {
      setSavingTeachers(false);
    }
  }

  // ── Dynamic live tally ──
  const liveStudentStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    let unmarked = 0;

    for (const student of students) {
      const s = studentStatusMap[student.id];
      if (s === 'PRESENT') present++;
      else if (s === 'ABSENT') absent++;
      else if (s === 'LATE') late++;
      else if (s === 'EXCUSED') excused++;
      else unmarked++;
    }

    const markedTotal = present + absent + late + excused;
    const rate = markedTotal > 0 ? Math.round((present / markedTotal) * 100) : 0;
    return { total: students.length, present, absent, late, excused, unmarked, markedTotal, rate };
  }, [students, studentStatusMap]);

  const liveTeacherStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    let unmarked = 0;

    for (const teacher of teachers) {
      const s = teacherStatusMap[teacher.id];
      if (s === 'PRESENT') present++;
      else if (s === 'ABSENT') absent++;
      else if (s === 'LATE') late++;
      else if (s === 'EXCUSED') excused++;
      else unmarked++;
    }

    const markedTotal = present + absent + late + excused;
    const rate = markedTotal > 0 ? Math.round((present / markedTotal) * 100) : 0;
    return { total: teachers.length, present, absent, late, excused, unmarked, markedTotal, rate };
  }, [teachers, teacherStatusMap]);

  // ── Filtered Students List ──
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return students.filter((s) => {
      const current = studentStatusMap[s.id] ?? null;
      if (studentStatusFilter === 'UNMARKED' && current !== null) return false;
      if (studentStatusFilter !== 'ALL' && studentStatusFilter !== 'UNMARKED' && current !== studentStatusFilter) return false;

      if (!q) return true;
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q) ||
        s.classLabel.toLowerCase().includes(q)
      );
    });
  }, [students, studentStatusMap, studentSearch, studentStatusFilter]);

  // ── Filtered Teachers List ──
  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    return teachers.filter((t) => {
      const current = teacherStatusMap[t.id] ?? null;
      if (teacherStatusFilter === 'UNMARKED' && current !== null) return false;
      if (teacherStatusFilter !== 'ALL' && teacherStatusFilter !== 'UNMARKED' && current !== teacherStatusFilter) return false;

      if (!q) return true;
      return t.fullName.toLowerCase().includes(q);
    });
  }, [teachers, teacherStatusMap, teacherSearch, teacherStatusFilter]);

  // ── Day Inspector Modal Data Fetching ──
  useEffect(() => {
    if (!selectedDay) {
      setSelectedDayRows([]);
      setSelectedDayError('');
      setSelectedDayLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadDayDetails() {
      if (!selectedDay) return;
      setSelectedDayLoading(true);
      setSelectedDayError('');
      try {
        const params = new URLSearchParams({ limit: '500', date: selectedDay });
        if (selectedClassId) params.set('classId', selectedClassId);
        const res = await fetch(`/api/attendance?${params.toString()}`, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || 'Unable to load day details');
        }
        const data = (await res.json()) as AttendanceDetailRow[];
        if (cancelled) return;
        setSelectedDayRows(data);
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        setSelectedDayRows([]);
        setSelectedDayError(error instanceof Error ? error.message : 'Unable to load day details');
      } finally {
        if (!cancelled) setSelectedDayLoading(false);
      }
    }

    void loadDayDetails();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedDay, selectedClassId]);

  // Calendar calculations
  const [currentYear, currentMonth] = selectedDate.split('-').map(Number);
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayWeekday = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 = Sun
  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const selectedDayStats = selectedDay ? monthMap.get(selectedDay) ?? { present: 0, absent: 0, late: 0, excused: 0 } : null;
  const selectedDayTotal = selectedDayStats ? selectedDayStats.present + selectedDayStats.absent + selectedDayStats.late + selectedDayStats.excused : 0;
  const selectedDayRate = selectedDayTotal > 0 ? Math.round(((selectedDayStats?.present ?? 0) / selectedDayTotal) * 100) : 0;

  const modalFilteredRows = useMemo(() => {
    if (modalFilter === 'ALL') return selectedDayRows;
    return selectedDayRows.filter((r) => r.status === modalFilter);
  }, [selectedDayRows, modalFilter]);

  // Selected Class details
  const activeClassObj = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  return (
    <div className="space-y-5 pb-36 sm:pb-24">
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── TOP PRIMARY PERSONA SWITCHER: STUDENTS vs TEACHERS ───────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          
          {/* Dual Persona Switcher */}
          <div className="inline-flex rounded-2xl bg-[#F1F5F9] p-1.5 shadow-inner">
            {/* Student Attendance Tab */}
            <button
              type="button"
              onClick={() => handlePersonaSwitch('students')}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                persona === 'students'
                  ? 'bg-gradient-to-r from-[#1F5A5C] to-[#2D7578] text-white shadow-md'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/70'
              }`}
            >
              <Users className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <div className="flex flex-col items-start leading-tight">
                <span>Students Attendance</span>
                <span className="text-[10px] font-normal opacity-85">طلباء کی حاضری</span>
              </div>
              <span className={`ml-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                persona === 'students' ? 'bg-white/20 text-white' : 'bg-[#E2E8F0] text-[#475569]'
              }`}>
                {students.length}
              </span>
            </button>

            {/* Teachers & Staff Attendance Tab */}
            <button
              type="button"
              onClick={() => handlePersonaSwitch('teachers')}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                persona === 'teachers'
                  ? 'bg-gradient-to-r from-[#1F5A5C] to-[#2D7578] text-white shadow-md'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/70'
              }`}
            >
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <div className="flex flex-col items-start leading-tight">
                <span>Teachers & Staff</span>
                <span className="text-[10px] font-normal opacity-85">اساتذہ و عملہ کی حاضری</span>
              </div>
              <span className={`ml-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                persona === 'teachers' ? 'bg-white/20 text-white' : 'bg-[#E2E8F0] text-[#475569]'
              }`}>
                {teachers.length}
              </span>
            </button>
          </div>

          {/* Quick Date Stepper Control */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
              <button
                type="button"
                onClick={() => handleDateStep(-1)}
                className="flex h-10 w-9 items-center justify-center rounded-l-xl text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] active:bg-[#F1F5F9] transition-colors"
                title="Previous Day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <label className="relative flex h-10 cursor-pointer items-center gap-2 px-3 hover:bg-[#F8FAFC] transition-colors">
                <CalendarDays className="h-4 w-4 text-[#1F5A5C] shrink-0" />
                <span className="text-xs font-bold text-[#0F172A] whitespace-nowrap">
                  {formatDateDisplay(selectedDate)}
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && navigateTo(e.target.value, selectedClassId, persona)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                />
              </label>

              {!isSelectedToday && (
                <button
                  type="button"
                  onClick={handleJumpToday}
                  className="border-l border-[#E2E8F0] px-2.5 h-10 text-[11px] font-bold text-[#1F5A5C] hover:bg-[#F0FDFA] transition-colors"
                  title="Jump to today"
                >
                  Today
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDateStep(1)}
                className="flex h-10 w-9 items-center justify-center rounded-r-xl border-l border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] active:bg-[#F1F5F9] transition-colors"
                title="Next Day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Class Selector Dropdown - ONLY for Students! (Hidden for Teachers to avoid mixing confusion) */}
            {persona === 'students' ? (
              <div className="relative min-w-[180px] flex-1 sm:flex-initial">
                <select
                  value={selectedClassId}
                  onChange={handleClassChange}
                  className="h-10 w-full appearance-none rounded-xl border border-[#E2E8F0] bg-white pl-3.5 pr-8 text-xs font-bold text-[#0F172A] shadow-xs outline-none focus:ring-2 focus:ring-[#1F5A5C]/20 transition-all cursor-pointer"
                >
                  <option value="">All Student Classes ({classes.length})</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.section}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                  ▼
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#CCFBF1] bg-[#F0FDFA] px-3 py-2 text-xs font-bold text-[#0F766E]">
                <Briefcase className="h-3.5 w-3.5" />
                <span>All Faculty Members (مکمل اساتذہ)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status Toast ── */}
      {flash && (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
            flash.type === 'success'
              ? 'border-[#BBF7D0] bg-[#ECFDF3] text-[#15803D]'
              : 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
          }`}
        >
          <div className="flex items-center gap-2">
            {flash.type === 'success' ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{flash.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFlash(null)}
            className="rounded-lg p-1 opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── SECTION 1: STUDENTS ATTENDANCE ───────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {persona === 'students' && (
        <div className="space-y-4">
          {/* Sub-navigation pills for Students */}
          <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStudentView('calendar')}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  studentView === 'calendar'
                    ? 'bg-[#1F5A5C] text-white shadow-xs'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]'
                }`}
              >
                <CalendarDays className="h-4 w-4" />
                <span>Monthly Calendar (ماہانہ کیلنڈر)</span>
              </button>

              <button
                type="button"
                onClick={() => setStudentView('marking')}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  studentView === 'marking'
                    ? 'bg-[#1F5A5C] text-white shadow-xs'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]'
                }`}
              >
                <CheckCheck className="h-4 w-4" />
                <span>Daily Marking Register (روزانہ حاضری لگائیں)</span>
              </button>
            </div>

            {/* Scope Badge */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#64748B]">
              <span className="h-2 w-2 rounded-full bg-[#15803D]" />
              <span>{activeClassObj ? `${activeClassObj.name} - ${activeClassObj.section}` : 'All Classes'} ({students.length} Students)</span>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────────────── */}
          {/* ── SUB-VIEW: STUDENT MONTHLY CALENDAR ───────────────────────────── */}
          {/* ──────────────────────────────────────────────────────────────────── */}
          {studentView === 'calendar' && (
            <div className="space-y-4">
              {/* Informative Guidance Banner */}
              <div className="flex items-start gap-3 rounded-2xl border border-[#BBF7D0] bg-gradient-to-r from-[#F0FDF4] to-[#ECFDF3] p-3.5 sm:p-4 text-[#166534]">
                <Info className="h-5 w-5 shrink-0 text-[#15803D] mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <span className="font-bold">Student Monthly Attendance Calendar (طلباء کا ماہانہ ریکارڈ):</span>
                  <p className="mt-0.5 text-xs text-[#15803D]/90">
                    یہ کیلنڈر صرف اور صرف داخل شدہ طلباء کی حاضری ظاہر کر رہا ہے۔ اساتذہ کا ریکارڈ الگ سیکشن میں ہے۔ کسی بھی تاریخ پر کلک کر کے طلباء کی فہرست ملاحظہ کریں۔
                  </p>
                </div>
              </div>

              {/* Student KPI Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-[#BBF7D0] bg-gradient-to-br from-[#ECFDF3] to-[#F2FBF6] p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#15803D]">Students Present</span>
                    <UserCheck className="h-4 w-4 text-[#15803D]" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-[#0F172A] sm:text-3xl">{overview.present}</p>
                  <p className="mt-1 text-[11px] font-medium text-[#15803D]">حاضر طلباء</p>
                </div>

                <div className="rounded-2xl border border-[#FECACA] bg-gradient-to-br from-[#FEF2F2] to-[#FFF5F5] p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#B91C1C]">Students Absent</span>
                    <UserX className="h-4 w-4 text-[#B91C1C]" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-[#0F172A] sm:text-3xl">{overview.absent}</p>
                  <p className="mt-1 text-[11px] font-medium text-[#B91C1C]">غیر حاضر طلباء</p>
                </div>

                <div className="rounded-2xl border border-[#FDE68A] bg-gradient-to-br from-[#FFFBEB] to-[#FFFDF5] p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#B45309]">Late Arrivals</span>
                    <Clock className="h-4 w-4 text-[#B45309]" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-[#0F172A] sm:text-3xl">{overview.late}</p>
                  <p className="mt-1 text-[11px] font-medium text-[#B45309]">دیر سے آنے والے</p>
                </div>

                <div className="rounded-2xl border border-[#CCFBF1] bg-gradient-to-br from-[#F0FDFA] to-[#F5FEFD] p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F766E]">Student Rate</span>
                    <TrendingUp className="h-4 w-4 text-[#0F766E]" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-[#0F172A] sm:text-3xl">{overview.percentage}%</p>
                  <p className="mt-1 text-[11px] font-medium text-[#0F766E]">طلباء کی حاضری کی شرح</p>
                </div>
              </div>

              {/* Monthly Calendar Heatmap */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F5A5C]/10 text-[#1F5A5C]">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#0F172A] sm:text-lg">
                        {monthName} Student Attendance Calendar
                      </h3>
                      <p className="text-xs text-[#64748B]">
                        {activeClassObj ? `Class: ${activeClassObj.name} - ${activeClassObj.section}` : 'Scope: All Registered Classes'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-[#64748B]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#15803D]" />
                      <span>90%+ Present</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#D97706]" />
                      <span>70-89%</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#DC2626]" />
                      <span>&lt;70%</span>
                    </span>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] pb-1">
                      {d}
                    </div>
                  ))}

                  {/* Leading Empty Cells */}
                  {Array.from({ length: firstDayWeekday }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[58px] sm:min-h-[76px] rounded-xl bg-transparent" />
                  ))}

                  {/* Month Days */}
                  {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const stats = monthMap.get(dateStr) ?? { present: 0, absent: 0, late: 0, excused: 0 };
                    const totalMarked = stats.present + stats.absent + stats.late + stats.excused;
                    const isSelected = selectedDay === dateStr || (!selectedDay && selectedDate === dateStr);

                    let cellTone = 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9] border border-[#F1F5F9]';
                    let indicatorDot = null;

                    if (totalMarked > 0) {
                      const rate = Math.round((stats.present / totalMarked) * 100);
                      if (rate >= 90) {
                        cellTone = 'bg-[#ECFDF3] text-[#15803D] hover:bg-[#DCFCE7] border border-[#BBF7D0]';
                        indicatorDot = 'bg-[#15803D]';
                      } else if (rate >= 70) {
                        cellTone = 'bg-[#FFFBEB] text-[#B45309] hover:bg-[#FEF3C7] border border-[#FDE68A]';
                        indicatorDot = 'bg-[#D97706]';
                      } else {
                        cellTone = 'bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2] border border-[#FECACA]';
                        indicatorDot = 'bg-[#DC2626]';
                      }
                    }

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => setSelectedDay(dateStr)}
                        className={`min-h-[58px] sm:min-h-[76px] rounded-xl p-1.5 sm:p-2 text-left transition-all relative flex flex-col justify-between ${cellTone} ${
                          isSelected ? 'ring-2 ring-[#1F5A5C] ring-offset-2' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-bold">{day}</span>
                          {indicatorDot && (
                            <span className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${indicatorDot}`} />
                          )}
                        </div>

                        {totalMarked > 0 ? (
                          <div className="mt-1 text-[10px] sm:text-[11px] font-bold leading-tight truncate">
                            <span className="text-[#15803D]">{stats.present}P</span>
                            {stats.absent > 0 && <span className="ml-1 text-[#B91C1C]">{stats.absent}A</span>}
                            {stats.late > 0 && <span className="ml-1 text-[#B45309]">{stats.late}L</span>}
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#94A3B8]">—</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────── */}
          {/* ── SUB-VIEW: STUDENT DAILY MARKING REGISTER ─────────────────────── */}
          {/* ──────────────────────────────────────────────────────────────────── */}
          {studentView === 'marking' && (
            <div className="space-y-4">
              {/* Live Progress & Tally Bar */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#0F172A]">Student Daily Attendance Register</h3>
                      <span className="rounded-full bg-[#ECFDF3] px-2.5 py-0.5 text-xs font-bold text-[#15803D]">
                        {liveStudentStats.rate}% Present
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#64748B]">
                      {liveStudentStats.markedTotal} of {liveStudentStats.total} students marked for {formatDateDisplay(selectedDate)}
                    </p>
                  </div>

                  {/* Bulk Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => markAllStudents('PRESENT')}
                      disabled={!students.length}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#1F5A5C] to-[#2D7578] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      <span>Mark All Present (سب کو حاضر لگائیں)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => markAllStudents('ABSENT')}
                      disabled={!students.length}
                      className="flex items-center gap-1.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2 text-xs font-bold text-[#B91C1C] hover:bg-[#FEE2E2] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      <span>Mark All Absent</span>
                    </button>

                    {studentChangedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => void saveStudents()}
                        disabled={savingStudents}
                        className="flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-3.5 py-2 text-xs font-bold text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        {savingStudents ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5 text-[#10B981]" />
                        )}
                        <span>Save ({studentChangedCount})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Distribution Progress Bar */}
                <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9] flex">
                  {liveStudentStats.present > 0 && (
                    <div
                      style={{ width: `${(liveStudentStats.present / (liveStudentStats.total || 1)) * 100}%` }}
                      className="bg-[#15803D] transition-all duration-300"
                      title={`Present: ${liveStudentStats.present}`}
                    />
                  )}
                  {liveStudentStats.late > 0 && (
                    <div
                      style={{ width: `${(liveStudentStats.late / (liveStudentStats.total || 1)) * 100}%` }}
                      className="bg-[#D97706] transition-all duration-300"
                      title={`Late: ${liveStudentStats.late}`}
                    />
                  )}
                  {liveStudentStats.excused > 0 && (
                    <div
                      style={{ width: `${(liveStudentStats.excused / (liveStudentStats.total || 1)) * 100}%` }}
                      className="bg-[#2563EB] transition-all duration-300"
                      title={`Leave: ${liveStudentStats.excused}`}
                    />
                  )}
                  {liveStudentStats.absent > 0 && (
                    <div
                      style={{ width: `${(liveStudentStats.absent / (liveStudentStats.total || 1)) * 100}%` }}
                      className="bg-[#DC2626] transition-all duration-300"
                      title={`Absent: ${liveStudentStats.absent}`}
                    />
                  )}
                </div>

                {/* Status Filter Badges */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {[
                    { key: 'ALL' as const, label: 'All', count: liveStudentStats.total, cls: 'bg-[#F1F5F9] text-[#475569]' },
                    { key: 'UNMARKED' as const, label: 'Unmarked', count: liveStudentStats.unmarked, cls: 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]' },
                    { key: 'PRESENT' as const, label: 'Present', count: liveStudentStats.present, cls: 'bg-[#ECFDF3] text-[#15803D] border border-[#BBF7D0]' },
                    { key: 'ABSENT' as const, label: 'Absent', count: liveStudentStats.absent, cls: 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]' },
                    { key: 'LATE' as const, label: 'Late', count: liveStudentStats.late, cls: 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]' },
                    { key: 'EXCUSED' as const, label: 'Leave', count: liveStudentStats.excused, cls: 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setStudentStatusFilter(f.key)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${f.cls} ${
                        studentStatusFilter === f.key ? 'ring-2 ring-[#1F5A5C] ring-offset-1 shadow-xs' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <span>{f.label}</span>
                      <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px]">{f.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Search Input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search student by name, admission no, or class…"
                  className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-9 text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] shadow-xs outline-none focus:ring-2 focus:ring-[#1F5A5C]/20 transition-all"
                />
                {studentSearch && (
                  <button
                    type="button"
                    onClick={() => setStudentSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Student Cards List */}
              {filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E2E8F0] bg-white p-12 text-center">
                  <Users className="h-10 w-10 text-[#94A3B8] mb-2" />
                  <p className="text-sm font-bold text-[#0F172A]">No students found</p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    {studentSearch || studentStatusFilter !== 'ALL'
                      ? 'Try clearing your search or filter criteria.'
                      : 'No student records available for this class.'}
                  </p>
                  {(studentSearch || studentStatusFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setStudentSearch('');
                        setStudentStatusFilter('ALL');
                      }}
                      className="mt-3 rounded-xl bg-[#F1F5F9] px-3.5 py-1.5 text-xs font-bold text-[#334155] hover:bg-[#E2E8F0]"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {filteredStudents.map((student) => {
                    const currentStatus = studentStatusMap[student.id] ?? null;
                    return (
                      <div
                        key={student.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-xs hover:shadow-sm transition-all"
                      >
                        {/* Left: Student Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-xs ${avatarTone(currentStatus)}`}>
                            {nameInitials(student.fullName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#0F172A]" dir="auto">
                              {student.fullName}
                            </p>
                            <p className="truncate text-xs text-[#64748B]">
                              #{student.admissionNo} · {student.classLabel}
                            </p>
                          </div>
                        </div>

                        {/* Right: 4-Segmented Control */}
                        <div className="flex items-center gap-2">
                          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] w-full sm:w-[320px]">
                            {/* Present */}
                            <button
                              type="button"
                              onClick={() => markStudent(student.id, 'PRESENT')}
                              className={`h-9 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all active:scale-[0.97] ${
                                currentStatus === 'PRESENT'
                                  ? 'bg-[#15803D] text-white shadow-xs ring-1 ring-[#15803D]'
                                  : 'text-[#15803D] hover:bg-[#ECFDF3]'
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>P</span>
                            </button>

                            {/* Absent */}
                            <button
                              type="button"
                              onClick={() => markStudent(student.id, 'ABSENT')}
                              className={`h-9 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all active:scale-[0.97] ${
                                currentStatus === 'ABSENT'
                                  ? 'bg-[#B91C1C] text-white shadow-xs ring-1 ring-[#B91C1C]'
                                  : 'text-[#B91C1C] hover:bg-[#FEF2F2]'
                              }`}
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>A</span>
                            </button>

                            {/* Late */}
                            <button
                              type="button"
                              onClick={() => markStudent(student.id, 'LATE')}
                              className={`h-9 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all active:scale-[0.97] ${
                                currentStatus === 'LATE'
                                  ? 'bg-[#D97706] text-white shadow-xs ring-1 ring-[#D97706]'
                                  : 'text-[#B45309] hover:bg-[#FFFBEB]'
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                              <span>L</span>
                            </button>

                            {/* Leave */}
                            <button
                              type="button"
                              onClick={() => markStudent(student.id, 'EXCUSED')}
                              className={`h-9 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all active:scale-[0.97] ${
                                currentStatus === 'EXCUSED'
                                  ? 'bg-[#2563EB] text-white shadow-xs ring-1 ring-[#2563EB]'
                                  : 'text-[#1E40AF] hover:bg-[#EFF6FF]'
                              }`}
                            >
                              <span>Leave</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Floating Bottom Save Bar for Students */}
              {studentChangedCount > 0 && (
                <div className="fixed bottom-[88px] left-3 right-3 z-50 flex items-center justify-between gap-3 rounded-2xl bg-[#0F172A]/95 p-3.5 text-white shadow-[0_16px_36px_rgba(0,0,0,0.35)] backdrop-blur-md border border-white/10 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto sm:min-w-[420px]">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-[#10B981] animate-pulse" />
                    <p className="text-xs sm:text-sm font-semibold">
                      {studentChangedCount} طلباء کی نئی تبدیلیاں محفوظ کریں
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={discardStudentChanges}
                      disabled={savingStudents}
                      className="rounded-xl px-3 py-2 text-xs font-semibold text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveStudents()}
                      disabled={savingStudents}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1F5A5C] to-[#2D7578] px-4 py-2 text-xs font-bold text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {savingStudents ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving…</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5 text-[#10B981]" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── SECTION 2: TEACHERS & STAFF ATTENDANCE ───────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {persona === 'teachers' && (
        <div className="space-y-4">
          {/* Sub-navigation pills for Teachers */}
          <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTeacherView('marking')}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  teacherView === 'marking'
                    ? 'bg-[#1F5A5C] text-white shadow-xs'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]'
                }`}
              >
                <CheckCheck className="h-4 w-4" />
                <span>Daily Staff Marking (اساتذہ کی حاضری لگائیں)</span>
              </button>

              <button
                type="button"
                onClick={() => setTeacherView('summary')}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  teacherView === 'summary'
                    ? 'bg-[#1F5A5C] text-white shadow-xs'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]'
                }`}
              >
                <Award className="h-4 w-4" />
                <span>Faculty Monthly Register (ماہانہ رپورٹ)</span>
              </button>
            </div>

            {/* Scope Badge */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#0F766E]">
              <span className="h-2 w-2 rounded-full bg-[#0F766E]" />
              <span>Teaching & Admin Faculty ({teachers.length} Members)</span>
            </div>
          </div>

          {/* Teacher KPI Overview Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#BBF7D0] bg-gradient-to-br from-[#ECFDF3] to-[#F2FBF6] p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#15803D]">Staff Present</span>
                <UserCheck className="h-4 w-4 text-[#15803D]" />
              </div>
              <p className="mt-2 text-2xl font-black text-[#0F172A] sm:text-3xl">
                {staffOverview?.present ?? liveTeacherStats.present}
              </p>
              <p className="mt-1 text-[11px] font-medium text-[#15803D]">حاضر اساتذہ</p>
            </div>

            <div className="rounded-2xl border border-[#FECACA] bg-gradient-to-br from-[#FEF2F2] to-[#FFF5F5] p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#B91C1C]">Staff Absent</span>
                <UserX className="h-4 w-4 text-[#B91C1C]" />
              </div>
              <p className="mt-2 text-2xl font-black text-[#0F172A] sm:text-3xl">
                {staffOverview?.absent ?? liveTeacherStats.absent}
              </p>
              <p className="mt-1 text-[11px] font-medium text-[#B91C1C]">غیر حاضر اساتذہ</p>
            </div>

            <div className="rounded-2xl border border-[#FDE68A] bg-gradient-to-br from-[#FFFBEB] to-[#FFFDF5] p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#B45309]">On Leave / Late</span>
                <Clock className="h-4 w-4 text-[#B45309]" />
              </div>
              <p className="mt-2 text-2xl font-black text-[#0F172A] sm:text-3xl">
                {(staffOverview?.leave ?? 0) + (staffOverview?.late ?? liveTeacherStats.late)}
              </p>
              <p className="mt-1 text-[11px] font-medium text-[#B45309]">رخصت یا تاخیر</p>
            </div>

            <div className="rounded-2xl border border-[#CCFBF1] bg-gradient-to-br from-[#F0FDFA] to-[#F5FEFD] p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F766E]">Faculty Rate</span>
                <TrendingUp className="h-4 w-4 text-[#0F766E]" />
              </div>
              <p className="mt-2 text-2xl font-black text-[#0F172A] sm:text-3xl">
                {staffOverview?.percentage ?? liveTeacherStats.rate}%
              </p>
              <p className="mt-1 text-[11px] font-medium text-[#0F766E]">اساتذہ کی حاضری شرح</p>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────────────── */}
          {/* ── TEACHER SUB-VIEW: DAILY MARKING ───────────────────────────────── */}
          {/* ──────────────────────────────────────────────────────────────────── */}
          {teacherView === 'marking' && (
            <div className="space-y-4">
              {/* Live Progress & Tally Bar */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#0F172A]">Staff Attendance Register</h3>
                      <span className="rounded-full bg-[#ECFDF3] px-2.5 py-0.5 text-xs font-bold text-[#15803D]">
                        {liveTeacherStats.rate}% Present
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#64748B]">
                      {liveTeacherStats.markedTotal} of {liveTeacherStats.total} staff recorded for {formatDateDisplay(selectedDate)}
                    </p>
                  </div>

                  {/* Bulk Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => markAllTeachers('PRESENT')}
                      disabled={!teachers.length}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#1F5A5C] to-[#2D7578] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      <span>Mark All Present</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => markAllTeachers('ABSENT')}
                      disabled={!teachers.length}
                      className="flex items-center gap-1.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2 text-xs font-bold text-[#B91C1C] hover:bg-[#FEE2E2] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      <span>Mark All Absent</span>
                    </button>

                    {teacherChangedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => void saveTeachers()}
                        disabled={savingTeachers}
                        className="flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-3.5 py-2 text-xs font-bold text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        {savingTeachers ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5 text-[#10B981]" />
                        )}
                        <span>Save ({teacherChangedCount})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Filter Badges */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {[
                    { key: 'ALL' as const, label: 'All', count: liveTeacherStats.total, cls: 'bg-[#F1F5F9] text-[#475569]' },
                    { key: 'UNMARKED' as const, label: 'Unmarked', count: liveTeacherStats.unmarked, cls: 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]' },
                    { key: 'PRESENT' as const, label: 'Present', count: liveTeacherStats.present, cls: 'bg-[#ECFDF3] text-[#15803D] border border-[#BBF7D0]' },
                    { key: 'ABSENT' as const, label: 'Absent', count: liveTeacherStats.absent, cls: 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]' },
                    { key: 'LATE' as const, label: 'Late', count: liveTeacherStats.late, cls: 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]' },
                    { key: 'EXCUSED' as const, label: 'Leave', count: liveTeacherStats.excused, cls: 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setTeacherStatusFilter(f.key)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${f.cls} ${
                        teacherStatusFilter === f.key ? 'ring-2 ring-[#1F5A5C] ring-offset-1 shadow-xs' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <span>{f.label}</span>
                      <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px]">{f.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Teacher Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="text"
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="Search faculty by name…"
                  className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-9 text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] shadow-xs outline-none focus:ring-2 focus:ring-[#1F5A5C]/20 transition-all"
                />
                {teacherSearch && (
                  <button
                    type="button"
                    onClick={() => setTeacherSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Teacher Cards List */}
              {filteredTeachers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E2E8F0] bg-white p-12 text-center">
                  <GraduationCap className="h-10 w-10 text-[#94A3B8] mb-2" />
                  <p className="text-sm font-bold text-[#0F172A]">No staff members found</p>
                  <p className="mt-1 text-xs text-[#64748B]">Try clearing your search criteria.</p>
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {filteredTeachers.map((teacher) => {
                    const currentStatus = teacherStatusMap[teacher.id] ?? null;
                    const summary = teacherMonthlySummaryMap.get(teacher.id) ?? { present: 0, absent: 0, late: 0, total: 0 };
                    return (
                      <div
                        key={teacher.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-xs hover:shadow-sm transition-all"
                      >
                        {/* Left: Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-xs ${avatarTone(currentStatus)}`}>
                            {nameInitials(teacher.fullName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#0F172A]" dir="auto">
                              {teacher.fullName}
                            </p>
                            <p className="text-xs text-[#64748B]">
                              Monthly: <span className="text-[#15803D] font-bold">{summary.present}P</span> · <span className="text-[#B91C1C] font-bold">{summary.absent}A</span> · <span className="text-[#B45309] font-bold">{summary.late}L</span> ({summary.total} days recorded)
                            </p>
                          </div>
                        </div>

                        {/* Right: 4-Segmented Control */}
                        <div className="flex items-center gap-2">
                          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] w-full sm:w-[320px]">
                            <button
                              type="button"
                              onClick={() => markTeacher(teacher.id, 'PRESENT')}
                              className={`h-9 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all active:scale-[0.97] ${
                                currentStatus === 'PRESENT'
                                  ? 'bg-[#15803D] text-white shadow-xs ring-1 ring-[#15803D]'
                                  : 'text-[#15803D] hover:bg-[#ECFDF3]'
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>P</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => markTeacher(teacher.id, 'ABSENT')}
                              className={`h-9 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all active:scale-[0.97] ${
                                currentStatus === 'ABSENT'
                                  ? 'bg-[#B91C1C] text-white shadow-xs ring-1 ring-[#B91C1C]'
                                  : 'text-[#B91C1C] hover:bg-[#FEF2F2]'
                              }`}
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>A</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => markTeacher(teacher.id, 'LATE')}
                              className={`h-9 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all active:scale-[0.97] ${
                                currentStatus === 'LATE'
                                  ? 'bg-[#D97706] text-white shadow-xs ring-1 ring-[#D97706]'
                                  : 'text-[#B45309] hover:bg-[#FFFBEB]'
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                              <span>L</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => markTeacher(teacher.id, 'EXCUSED')}
                              className={`h-9 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all active:scale-[0.97] ${
                                currentStatus === 'EXCUSED'
                                  ? 'bg-[#2563EB] text-white shadow-xs ring-1 ring-[#2563EB]'
                                  : 'text-[#1E40AF] hover:bg-[#EFF6FF]'
                              }`}
                            >
                              <span>Leave</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Floating Bottom Save Bar for Teachers */}
              {teacherChangedCount > 0 && (
                <div className="fixed bottom-[88px] left-3 right-3 z-50 flex items-center justify-between gap-3 rounded-2xl bg-[#0F172A]/95 p-3.5 text-white shadow-[0_16px_36px_rgba(0,0,0,0.35)] backdrop-blur-md border border-white/10 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto sm:min-w-[420px]">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-[#10B981] animate-pulse" />
                    <p className="text-xs sm:text-sm font-semibold">
                      {teacherChangedCount} اساتذہ کی نئی تبدیلیاں محفوظ کریں
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={discardTeacherChanges}
                      disabled={savingTeachers}
                      className="rounded-xl px-3 py-2 text-xs font-semibold text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveTeachers()}
                      disabled={savingTeachers}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1F5A5C] to-[#2D7578] px-4 py-2 text-xs font-bold text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {savingTeachers ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving…</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5 text-[#10B981]" />
                          <span>Save Staff</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────── */}
          {/* ── TEACHER SUB-VIEW: MONTHLY REGISTER TABLE ─────────────────────── */}
          {/* ──────────────────────────────────────────────────────────────────── */}
          {teacherView === 'summary' && (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#0F172A] sm:text-lg">
                    Faculty Monthly Attendance Register (اساتذہ کا ماہانہ ریکارڈ)
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Monthly attendance breakdown for each staff member for {monthName}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                      <th className="px-4 py-3">Faculty Member</th>
                      <th className="px-4 py-3 text-center">Present Days</th>
                      <th className="px-4 py-3 text-center">Absent Days</th>
                      <th className="px-4 py-3 text-center">Late Days</th>
                      <th className="px-4 py-3 text-center">Total Recorded</th>
                      <th className="px-4 py-3 text-right">Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {teachers.map((teacher) => {
                      const summary = teacherMonthlySummaryMap.get(teacher.id) ?? { present: 0, absent: 0, late: 0, total: 0 };
                      const rate = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;
                      return (
                        <tr key={teacher.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-[#0F172A]">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F5A5C]/10 text-xs font-bold text-[#1F5A5C]">
                                {nameInitials(teacher.fullName)}
                              </div>
                              <span dir="auto">{teacher.fullName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center rounded-md bg-[#ECFDF3] px-2.5 py-1 text-xs font-bold text-[#15803D]">
                              {summary.present} P
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center rounded-md bg-[#FEF2F2] px-2.5 py-1 text-xs font-bold text-[#B91C1C]">
                              {summary.absent} A
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center rounded-md bg-[#FFFBEB] px-2.5 py-1 text-xs font-bold text-[#B45309]">
                              {summary.late} L
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center font-semibold text-[#64748B]">
                            {summary.total} days
                          </td>
                          <td className="px-4 py-3.5 text-right font-black">
                            <div className="flex items-center justify-end gap-2">
                              <div className="hidden sm:block h-1.5 w-16 overflow-hidden rounded-full bg-[#E2E8F0]">
                                <div style={{ width: `${rate}%` }} className="h-full bg-[#1F5A5C]" />
                              </div>
                              <span className={rate >= 80 ? 'text-[#15803D]' : rate >= 60 ? 'text-[#B45309]' : 'text-[#B91C1C]'}>
                                {rate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Day Details Inspector Modal (Student Attendance) ── */}
      <Modal
        open={Boolean(selectedDay)}
        title={selectedDay ? `Student Attendance on ${formatDateDisplay(selectedDay)}` : 'Student Attendance Details'}
        subtitle={selectedClassId ? `Filtered by class: ${activeClassObj?.name} - ${activeClassObj?.section}` : 'Showing all enrolled classes'}
        onClose={() => setSelectedDay(null)}
      >
        {selectedDay && (
          <div className="space-y-4">
            {/* Modal Quick KPI Bar */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl bg-[#ECFDF3] p-2.5 border border-[#BBF7D0]">
                <p className="text-[10px] font-bold uppercase text-[#15803D]">Present</p>
                <p className="mt-0.5 text-lg font-black text-[#0F172A]">{selectedDayStats?.present ?? 0}</p>
              </div>
              <div className="rounded-xl bg-[#FEF2F2] p-2.5 border border-[#FECACA]">
                <p className="text-[10px] font-bold uppercase text-[#B91C1C]">Absent</p>
                <p className="mt-0.5 text-lg font-black text-[#0F172A]">{selectedDayStats?.absent ?? 0}</p>
              </div>
              <div className="rounded-xl bg-[#FFFBEB] p-2.5 border border-[#FDE68A]">
                <p className="text-[10px] font-bold uppercase text-[#B45309]">Late</p>
                <p className="mt-0.5 text-lg font-black text-[#0F172A]">{selectedDayStats?.late ?? 0}</p>
              </div>
              <div className="rounded-xl bg-[#F0FDFA] p-2.5 border border-[#CCFBF1]">
                <p className="text-[10px] font-bold uppercase text-[#0F766E]">Rate</p>
                <p className="mt-0.5 text-lg font-black text-[#0F172A]">{selectedDayRate}%</p>
              </div>
            </div>

            {/* Modal Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(['ALL', 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setModalFilter(st)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                    modalFilter === st
                      ? 'bg-[#1F5A5C] text-white shadow-xs'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Modal Student Rows */}
            {selectedDayLoading ? (
              <div className="flex items-center justify-center py-10 text-[#64748B]">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#1F5A5C]" />
                <span className="text-sm font-semibold">طلباء کا ریکارڈ لوڈ ہو رہا ہے…</span>
              </div>
            ) : selectedDayError ? (
              <div className="rounded-xl bg-[#FEF2F2] p-4 text-xs font-semibold text-[#B91C1C]">
                {selectedDayError}
              </div>
            ) : modalFilteredRows.length === 0 ? (
              <p className="py-8 text-center text-xs font-medium text-[#64748B]">
                اس فلٹر یا تاریخ کے لیے کوئی طالب علم موجود نہیں۔
              </p>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {modalFilteredRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#F1F5F9] bg-[#F8FAFC] px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs sm:text-sm font-bold text-[#0F172A]" dir="auto">
                        {row.student.user.fullName}
                      </p>
                      <p className="truncate text-[11px] text-[#64748B]">
                        #{row.student.admissionNo} · {row.class.name} - {row.class.section}
                      </p>
                      {row.remarks && (
                        <p className="mt-0.5 text-[10px] text-[#B45309]">Note: {row.remarks}</p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusPillTone(row.status)}`}>
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
