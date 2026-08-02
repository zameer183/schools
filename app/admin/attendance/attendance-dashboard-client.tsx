'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, X } from 'lucide-react';

type TabKey = 'overview' | 'students' | 'teachers';
type MarkStatus = 'PRESENT' | 'ABSENT' | 'LATE';

type ClassOption = {
  id: string;
  name: string;
  section: string;
};

type StudentRow = {
  id: string;
  fullName: string;
  admissionNo: string;
  classId: string;
  classLabel: string;
  status: string | null;
};

type TeacherRow = {
  id: string;
  fullName: string;
  status: string | null;
};

type TeacherMonthlySummaryRow = {
  teacherId: string;
  present: number;
  absent: number;
  late: number;
  total: number;
};

type MonthDayStatus = {
  date: string;
  status: string;
  count: number;
};

type AttendanceDetailRow = {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks: string | null;
  student: { admissionNo: string; user: { fullName: string } };
  class: { name: string; section: string };
};

function statusTone(status: string | null) {
  if (status === 'PRESENT') return 'bg-[#e8f5e9] text-[#046c4e] border-[#b7dfbc]';
  if (status === 'ABSENT') return 'bg-[#fde8e8] text-[#b91c1c] border-[#fca5a5]';
  if (status === 'LATE') return 'bg-[#fff3e0] text-[#9a5a00] border-[#f5d0a9]';
  return 'bg-[#edeeef] text-[#64748b] border-none';
}

function heatTone(present: number, absent: number, late: number) {
  if (!present && !absent && !late) return 'bg-[#f1f5f9] text-[#94a3b8]';
  if (absent > 0) return 'bg-[#fee2e2] text-[#b91c1c]';
  if (late > 0) return 'bg-[#fef3c7] text-[#9a5a00]';
  return 'bg-[#dcfce7] text-[#166534]';
}

function modalTone(status: AttendanceDetailRow['status']) {
  if (status === 'PRESENT') return 'bg-[#ecfdf3] text-[#166534]';
  if (status === 'ABSENT') return 'bg-[#fef2f2] text-[#b91c1c]';
  if (status === 'LATE') return 'bg-[#fffbeb] text-[#9a5a00]';
  return 'bg-[#f1f5f9] text-[#64748b]';
}

function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-h-[88vh] overflow-hidden rounded-t-3xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.2)] sm:max-w-3xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e2e8f0] px-5 py-4 sm:px-6">
          <div>
            <h3 className="font-headline text-lg font-bold text-[#0f172a] sm:text-xl">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-[#64748b]">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[#64748b] hover:bg-[#f1f5f9]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(88vh-72px)] overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
      </div>
    </div>
  );
}

export default function AttendanceDashboardClient({
  initialTab,
  selectedDate,
  selectedClassId,
  classes,
  students,
  teachers,
  teacherMonthlySummary,
  overview,
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
  monthStatusByDay: MonthDayStatus[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [studentStatusMap, setStudentStatusMap] = useState<Record<string, string | null>>(
    Object.fromEntries(students.map((item) => [item.id, item.status]))
  );
  const [teacherStatusMap, setTeacherStatusMap] = useState<Record<string, string | null>>(
    Object.fromEntries(teachers.map((item) => [item.id, item.status]))
  );
  const [dirtyStudents, setDirtyStudents] = useState<Record<string, MarkStatus>>({});
  const [dirtyTeachers, setDirtyTeachers] = useState<Record<string, MarkStatus>>({});
  const [savingStudents, setSavingStudents] = useState(false);
  const [savingTeachers, setSavingTeachers] = useState(false);
  const [flash, setFlash] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDayLoading, setSelectedDayLoading] = useState(false);
  const [selectedDayError, setSelectedDayError] = useState('');
  const [selectedDayRows, setSelectedDayRows] = useState<AttendanceDetailRow[]>([]);
  const teacherMonthlySummaryMap = useMemo(
    () => new Map(teacherMonthlySummary.map((item) => [item.teacherId, item])),
    [teacherMonthlySummary]
  );

  const monthMap = useMemo(() => {
    const map = new Map<string, { present: number; absent: number; late: number }>();
    for (const row of monthStatusByDay) {
      const current = map.get(row.date) ?? { present: 0, absent: 0, late: 0 };
      if (row.status === 'PRESENT') current.present += row.count;
      if (row.status === 'ABSENT') current.absent += row.count;
      if (row.status === 'LATE') current.late += row.count;
      map.set(row.date, current);
    }
    return map;
  }, [monthStatusByDay]);

  const studentsById = useMemo(() => new Map(students.map((item) => [item.id, item])), [students]);
  const currentDate = new Date(`${selectedDate}T00:00:00`);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const selectedDayCounts = selectedDay ? monthMap.get(selectedDay) ?? { present: 0, absent: 0, late: 0 } : null;
  const selectedDayDate = selectedDay ? new Date(`${selectedDay}T00:00:00`) : null;

  const quickButtonClass = 'h-11 rounded-xl border px-3 text-sm font-semibold transition active:scale-[0.99]';
  const studentChangedCount = Object.keys(dirtyStudents).length;
  const teacherChangedCount = Object.keys(dirtyTeachers).length;

  function markStudentLocal(studentId: string, status: MarkStatus) {
    setStudentStatusMap((prev) => ({ ...prev, [studentId]: status }));
    setDirtyStudents((prev) => ({ ...prev, [studentId]: status }));
    setFlash('');
  }

  function markTeacherLocal(teacherId: string, status: MarkStatus) {
    setTeacherStatusMap((prev) => ({ ...prev, [teacherId]: status }));
    setDirtyTeachers((prev) => ({ ...prev, [teacherId]: status }));
    setFlash('');
  }

  function markAllStudents(status: MarkStatus) {
    const nextMap = { ...studentStatusMap };
    const nextDirty = { ...dirtyStudents };
    for (const item of students) {
      nextMap[item.id] = status;
      nextDirty[item.id] = status;
    }
    setStudentStatusMap(nextMap);
    setDirtyStudents(nextDirty);
    setFlash('');
  }

  function markAllTeachers(status: MarkStatus) {
    const nextMap = { ...teacherStatusMap };
    const nextDirty = { ...dirtyTeachers };
    for (const item of teachers) {
      nextMap[item.id] = status;
      nextDirty[item.id] = status;
    }
    setTeacherStatusMap(nextMap);
    setDirtyTeachers(nextDirty);
    setFlash('');
  }

  async function saveStudents() {
    if (!studentChangedCount) return;
    setSavingStudents(true);
    setFlash('');
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
      setFlash('Student attendance saved.');
      router.refresh();
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Failed to save student attendance.');
    } finally {
      setSavingStudents(false);
    }
  }

  async function saveTeachers() {
    if (!teacherChangedCount) return;
    setSavingTeachers(true);
    setFlash('');
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
      setFlash('Teacher attendance saved.');
      router.refresh();
    } catch (error) {
      setFlash(error instanceof Error ? error.message : 'Failed to save teacher attendance.');
    } finally {
      setSavingTeachers(false);
    }
  }

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
      const day = selectedDay;
      if (!day) return;
      setSelectedDayLoading(true);
      setSelectedDayError('');
      try {
        const params = new URLSearchParams({ limit: '500' });
        params.set('date', day);
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

  const selectedDayCountsTotal = selectedDayCounts ? selectedDayCounts.present + selectedDayCounts.absent + selectedDayCounts.late : 0;
  const selectedDayAttendanceRate = selectedDayCountsTotal ? Math.round(((selectedDayCounts?.present ?? 0) / selectedDayCountsTotal) * 100) : 0;
  const selectedDayLabel = selectedDayDate
    ? selectedDayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <>
      <div className="space-y-4 pb-20">
        <div className="rounded-2xl bg-white p-4 shadow-[0_12px_40px_rgba(0,70,73,0.06)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-headline text-2xl font-bold text-[#0f172a] sm:text-3xl">Attendance</h2>
              <p className="mt-1 text-sm text-[#64748b]">Quick tap, then save once. Much faster on mobile.</p>
            </div>
          </div>

          <form className="mt-4 grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="tab" value={tab} />
            <label className="rounded-xl border border-none bg-[#edeeef] px-3 py-2">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748b]">Date</span>
              <input type="date" name="date" defaultValue={selectedDate} className="w-full bg-transparent text-sm outline-none" />
            </label>
            <label className="rounded-xl border border-none bg-[#edeeef] px-3 py-2">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748b]">Class</span>
              <select name="classId" defaultValue={selectedClassId} className="w-full bg-transparent text-sm outline-none">
                <option value="">All Classes</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} - {item.section}</option>
                ))}
              </select>
            </label>
            <button className="h-[58px] rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,70,73,0.12)] active:scale-[0.98] transition-all">
              Apply Filter
            </button>
          </form>

          <div className="sticky top-2 z-20 mt-4 flex gap-2 overflow-x-auto rounded-xl bg-white/95 p-1 backdrop-blur sm:static sm:bg-transparent sm:p-0">
            {[
              { key: 'overview' as const, label: 'Overview' },
              { key: 'students' as const, label: 'Students' },
              { key: 'teachers' as const, label: 'Teachers' }
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
                  tab === item.key
                    ? 'bg-gradient-to-r from-[#004649] to-[#1b5e62] text-white shadow-sm'
                    : 'bg-[#f1f5f9] text-[#334155] hover:bg-[#e2e8f0]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {flash ? (
          <div className="rounded-xl border border-[#dbeafe] bg-[#eff6ff] px-4 py-2 text-sm text-[#1d4ed8]">{flash}</div>
        ) : null}

        {tab === 'overview' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-[#dcfce7] bg-[#ecfdf3] p-4">
                <p className="text-xs font-semibold text-[#15803d]">Present</p>
                <p className="mt-2 text-3xl font-bold text-[#0f172a]">{overview.present}</p>
              </div>
              <div className="rounded-2xl border border-[#fee2e2] bg-[#fef2f2] p-4">
                <p className="text-xs font-semibold text-[#b91c1c]">Absent</p>
                <p className="mt-2 text-3xl font-bold text-[#0f172a]">{overview.absent}</p>
              </div>
              <div className="rounded-2xl border border-[#fef3c7] bg-[#fffbeb] p-4">
                <p className="text-xs font-semibold text-[#9a5a00]">Late</p>
                <p className="mt-2 text-3xl font-bold text-[#0f172a]">{overview.late}</p>
              </div>
              <div className="rounded-2xl border border-[#dbeafe] bg-[#eff6ff] p-4">
                <p className="text-xs font-semibold text-[#1d4ed8]">Percentage</p>
                <p className="mt-2 text-3xl font-bold text-[#0f172a]">{overview.percentage}%</p>
              </div>
            </div>

            <div className="sm:hidden rounded-2xl bg-white p-4 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
              <div className="mb-3 flex items-center gap-2 text-[#0f172a]">
                <CalendarDays className="h-5 w-5" />
                <h3 className="font-bold">Attendance Summary</h3>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#64748b] uppercase tracking-[0.14em]">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>

                <div className="rounded-xl border border-[#dbeafe] bg-gradient-to-br from-[#eff6ff] to-[#f0faff] p-3">
                  <p className="text-xs font-semibold text-[#1d4ed8]">Attendance Rate</p>
                  <p className="mt-2 text-4xl font-bold text-[#0f172a]">{overview.percentage}%</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-[#dcfce7] bg-[#ecfdf3] p-3 text-center">
                    <p className="text-xs font-semibold text-[#15803d]">Present</p>
                    <p className="mt-1 text-lg font-bold text-[#0f172a]">{overview.present}</p>
                  </div>
                  <div className="rounded-xl border border-[#fee2e2] bg-[#fef2f2] p-3 text-center">
                    <p className="text-xs font-semibold text-[#b91c1c]">Absent</p>
                    <p className="mt-1 text-lg font-bold text-[#0f172a]">{overview.absent}</p>
                  </div>
                  <div className="rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-3 text-center">
                    <p className="text-xs font-semibold text-[#9a5a00]">Late</p>
                    <p className="mt-1 text-lg font-bold text-[#0f172a]">{overview.late}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTab('overview')}
                  className="flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,70,73,0.12)] active:scale-[0.98] transition-all"
                >
                  View Calendar
                </button>
              </div>
            </div>

            <div className="hidden sm:block rounded-2xl bg-white p-4 shadow-[0_12px_40px_rgba(0,70,73,0.06)] sm:p-6">
              <div className="mb-3 flex items-center gap-2 text-[#0f172a]">
                <CalendarDays className="h-5 w-5" />
                <h3 className="font-bold">Monthly Attendance Heatmap</h3>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-10">
                {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().slice(0, 10);
                  const stats = monthMap.get(date) ?? { present: 0, absent: 0, late: 0 };
                  const active = selectedDay === date;
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelectedDay(date)}
                      className={`rounded-xl border p-2 text-center text-xs transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#004649] ${heatTone(stats.present, stats.absent, stats.late)} ${active ? 'ring-2 ring-[#004649] ring-offset-1' : 'border-transparent'}`}
                      aria-pressed={active}
                    >
                      <p className="font-bold">{day}</p>
                      <p className="mt-1 text-[10px]">P {stats.present}</p>
                      <p className="text-[10px]">A {stats.absent}</p>
                      <p className="text-[10px]">L {stats.late}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {tab === 'students' ? (
          <div className="rounded-2xl bg-white p-4 shadow-[0_12px_40px_rgba(0,70,73,0.06)] sm:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-headline font-bold text-[#0f172a]">Students Attendance</h3>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button onClick={() => markAllStudents('PRESENT')} disabled={!students.length} className="h-10 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-3 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(0,70,73,0.12)] active:scale-[0.98] transition-all disabled:opacity-50">Mark all Present</button>
                <button onClick={() => markAllStudents('ABSENT')} disabled={!students.length} className="h-10 rounded-xl bg-[#b91c1c] px-3 text-xs font-semibold text-white disabled:opacity-50">Mark all Absent</button>
              </div>
            </div>

            <div className="space-y-3">
              {students.map((student) => {
                const currentStatus = studentStatusMap[student.id] ?? null;
                return (
                  <div key={student.id} className="rounded-2xl border border-[#d7e2ea] bg-[#f9fcfd] p-3 sm:p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-[#0f172a]">{student.fullName}</p>
                        <p className="text-xs text-[#64748b]">{student.admissionNo} | {student.classLabel}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusTone(currentStatus)}`}>
                        {currentStatus ?? 'UNMARKED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { key: 'PRESENT', label: 'Present', cls: 'border-[#86efac] text-[#166534] bg-[#ecfdf3]' },
                        { key: 'ABSENT', label: 'Absent', cls: 'border-[#fca5a5] text-[#b91c1c] bg-[#fef2f2]' },
                        { key: 'LATE', label: 'Late', cls: 'border-[#fcd34d] text-[#9a5a00] bg-[#fffbeb]' }
                      ] as { key: MarkStatus; label: string; cls: string }[]).map((item) => (
                        <button
                          key={item.key}
                          onClick={() => markStudentLocal(student.id, item.key)}
                          className={`${quickButtonClass} w-full ${item.cls} ${currentStatus === item.key ? 'ring-2 ring-offset-1 ring-[#004649]' : ''}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {students.length === 0 ? <p className="text-sm text-[#64748b]">No students available for this filter.</p> : null}
            </div>

            <div className="sticky bottom-3 mt-4 rounded-2xl border border-[#dbeafe] bg-white/95 p-3 shadow-lg backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#004649]">{studentChangedCount} unsaved student change(s)</p>
                <button
                  onClick={() => void saveStudents()}
                  disabled={!studentChangedCount || savingStudents}
                  className="h-10 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,70,73,0.12)] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {savingStudents ? 'Saving...' : 'Save Students'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {tab === 'teachers' ? (
          <div className="rounded-2xl bg-white p-4 shadow-[0_12px_40px_rgba(0,70,73,0.06)] sm:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-headline font-bold text-[#0f172a]">Teachers Attendance</h3>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button onClick={() => markAllTeachers('PRESENT')} disabled={!teachers.length} className="h-10 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-3 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(0,70,73,0.12)] active:scale-[0.98] transition-all disabled:opacity-50">Mark all Present</button>
                <button onClick={() => markAllTeachers('ABSENT')} disabled={!teachers.length} className="h-10 rounded-xl bg-[#b91c1c] px-3 text-xs font-semibold text-white disabled:opacity-50">Mark all Absent</button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 xl:grid-cols-2">
                {teachers.map((teacher) => {
                  const summary = teacherMonthlySummaryMap.get(teacher.id) ?? { present: 0, absent: 0, late: 0, total: 0 };
                  return (
                    <div key={teacher.id} className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#0f172a]">{teacher.fullName}</p>
                          <p className="text-xs text-[#64748b]">Monthly attendance summary</p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusTone(teacher.status)}`}>
                          {teacher.status ?? 'UNMARKED'}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-4 gap-2">
                        <div className="rounded-xl bg-[#ecfdf3] p-3 text-center">
                          <p className="text-[10px] font-semibold text-[#166534]">Present</p>
                          <p className="mt-1 text-lg font-bold text-[#0f172a]">{summary.present}</p>
                        </div>
                        <div className="rounded-xl bg-[#fef2f2] p-3 text-center">
                          <p className="text-[10px] font-semibold text-[#b91c1c]">Absent</p>
                          <p className="mt-1 text-lg font-bold text-[#0f172a]">{summary.absent}</p>
                        </div>
                        <div className="rounded-xl bg-[#fffbeb] p-3 text-center">
                          <p className="text-[10px] font-semibold text-[#9a5a00]">Late</p>
                          <p className="mt-1 text-lg font-bold text-[#0f172a]">{summary.late}</p>
                        </div>
                        <div className="rounded-xl bg-[#eff6ff] p-3 text-center">
                          <p className="text-[10px] font-semibold text-[#1d4ed8]">Total</p>
                          <p className="mt-1 text-lg font-bold text-[#0f172a]">{summary.total}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {teachers.map((teacher) => {
                const currentStatus = teacherStatusMap[teacher.id] ?? null;
                return (
                  <div key={teacher.id} className="rounded-2xl border border-[#d7e2ea] bg-[#f9fcfd] p-3 sm:p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-[#0f172a]">{teacher.fullName}</p>
                        <p className="text-xs text-[#64748b]">Teacher record</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusTone(currentStatus)}`}>
                        {currentStatus ?? 'UNMARKED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { key: 'PRESENT', label: 'Present', cls: 'border-[#86efac] text-[#166534] bg-[#ecfdf3]' },
                        { key: 'ABSENT', label: 'Absent', cls: 'border-[#fca5a5] text-[#b91c1c] bg-[#fef2f2]' },
                        { key: 'LATE', label: 'Late', cls: 'border-[#fcd34d] text-[#9a5a00] bg-[#fffbeb]' }
                      ] as { key: MarkStatus; label: string; cls: string }[]).map((item) => (
                        <button
                          key={item.key}
                          onClick={() => markTeacherLocal(teacher.id, item.key)}
                          className={`${quickButtonClass} w-full ${item.cls} ${currentStatus === item.key ? 'ring-2 ring-offset-1 ring-[#004649]' : ''}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {teachers.length === 0 ? <p className="text-sm text-[#64748b]">No teachers available.</p> : null}
            </div>

            <div className="sticky bottom-3 mt-4 rounded-2xl border border-[#dbeafe] bg-white/95 p-3 shadow-lg backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#004649]">{teacherChangedCount} unsaved teacher change(s)</p>
                <button
                  onClick={() => void saveTeachers()}
                  disabled={!teacherChangedCount || savingTeachers}
                  className="h-10 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,70,73,0.12)] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {savingTeachers ? 'Saving...' : 'Save Teachers'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <Modal
        open={Boolean(selectedDay)}
        title={selectedDayLabel || 'Day Details'}
        subtitle={selectedClassId ? 'Filtered by selected class' : 'All classes for that day'}
        onClose={() => setSelectedDay(null)}
      >
        {selectedDay ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-[#ecfdf3] p-3">
                <p className="text-xs font-semibold text-[#166534]">Present</p>
                <p className="mt-1 text-2xl font-bold text-[#0f172a]">{selectedDayCounts?.present ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-[#fef2f2] p-3">
                <p className="text-xs font-semibold text-[#b91c1c]">Absent</p>
                <p className="mt-1 text-2xl font-bold text-[#0f172a]">{selectedDayCounts?.absent ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-[#fffbeb] p-3">
                <p className="text-xs font-semibold text-[#9a5a00]">Late</p>
                <p className="mt-1 text-2xl font-bold text-[#0f172a]">{selectedDayCounts?.late ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-[#eff6ff] p-3">
                <p className="text-xs font-semibold text-[#1d4ed8]">Rate</p>
                <p className="mt-1 text-2xl font-bold text-[#0f172a]">{selectedDayAttendanceRate}%</p>
              </div>
            </div>

            {selectedDayLoading ? (
              <p className="text-sm text-[#64748b]">Loading day details...</p>
            ) : selectedDayError ? (
              <p className="rounded-xl bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">{selectedDayError}</p>
            ) : selectedDayRows.length === 0 ? (
              <p className="text-sm text-[#64748b]">No attendance records found for this day.</p>
            ) : (
              <div className="space-y-4">
                {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as AttendanceDetailRow['status'][]).map((status) => {
                  const rows = selectedDayRows.filter((row) => row.status === status);
                  if (!rows.length) return null;
                  return (
                    <div key={status} className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-[#0f172a]">{status}</h4>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${modalTone(status)}`}>{rows.length}</span>
                      </div>
                      <div className="space-y-2">
                        {rows.map((row) => (
                          <div key={row.id} className="flex items-start justify-between gap-3 rounded-xl bg-[#f8fafc] px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#0f172a]">{row.student.user.fullName}</p>
                              <p className="text-xs text-[#64748b]">#{row.student.admissionNo} | {row.class.name} - {row.class.section}</p>
                              {row.remarks ? <p className="mt-1 text-xs text-[#475569]">{row.remarks}</p> : null}
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${modalTone(status)}`}>{status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
}







