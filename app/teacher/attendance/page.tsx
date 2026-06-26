'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarCheck2, CheckCircle2, Check, Clock3, Loader2, Send, UserRound, Users2, X, XCircle } from 'lucide-react';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

type ClassItem = { id: string; name: string; section: string };
type StudentItem = {
  id: string;
  admissionNo: string;
  whatsApp?: string | null;
  guardianPhone?: string | null;
  user: { fullName: string; email: string };
  class: null | { id?: string; name: string; section: string };
};
type AttendanceRecord = {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
};

type ExistingAttendance = {
  id: string;
  studentId: string;
  status: AttendanceStatus;
  remarks: string | null;
};

type ApiAttendanceRow = {
  id: string;
  status: AttendanceStatus;
  date: string;
  studentId: string;
};

type StaffAttendanceRow = {
  id: string;
  date: string;
  status: AttendanceStatus;
  note: string | null;
};

const statusLabel: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  EXCUSED: 'Excused'
};

const statusStyle: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0]',
  ABSENT: 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]',
  LATE: 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]',
  EXCUSED: 'bg-[#e0ecff] text-[#1e3a8a] border-[#bfd3ff]'
};

const quickStatusPills: Array<{ label: string; value: AttendanceStatus }> = [
  { label: 'Present', value: 'PRESENT' },
  { label: 'Absent', value: 'ABSENT' },
  { label: 'Leave', value: 'EXCUSED' }
];

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const calendarStatusStyle: Record<AttendanceStatus, { cell: string; dot: string }> = {
  PRESENT: { cell: 'bg-[#16a34a] text-white', dot: 'bg-[#16a34a]' },
  ABSENT: { cell: 'bg-[#dc2626] text-white', dot: 'bg-[#dc2626]' },
  LATE: { cell: 'bg-[#d97706] text-white', dot: 'bg-[#d97706]' },
  EXCUSED: { cell: 'bg-[#2E2B78] text-white', dot: 'bg-[#2E2B78]' }
};

function fmtDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeStart(date: string, daysBack: number) {
  const base = new Date(date);
  base.setDate(base.getDate() - daysBack);
  return fmtDate(base);
}

function monthStart(date: string) {
  return `${new Date(date).toISOString().slice(0, 7)}-01`;
}

function monthEnd(date: string) {
  const base = new Date(date);
  return fmtDate(new Date(base.getFullYear(), base.getMonth() + 1, 0));
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function firstDayOffset(year: number, month: number) {
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function shiftMonthKey(date: string, delta: number) {
  const base = new Date(date);
  return fmtDate(new Date(base.getFullYear(), base.getMonth() + delta, 1));
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] px-5 py-4">
          <h3 className="font-bold text-[#111827]">{title}</h3>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#374151]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [staffMonthDate, setStaffMonthDate] = useState(() => monthStart(new Date().toISOString().slice(0, 10)));
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [dailyRows, setDailyRows] = useState<ApiAttendanceRow[]>([]);
  const [weeklyRows, setWeeklyRows] = useState<ApiAttendanceRow[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<ApiAttendanceRow[]>([]);
  const [myDailyStaffRows, setMyDailyStaffRows] = useState<StaffAttendanceRow[]>([]);
  const [myWeeklyStaffRows, setMyWeeklyStaffRows] = useState<StaffAttendanceRow[]>([]);
  const [myMonthlyStaffRows, setMyMonthlyStaffRows] = useState<StaffAttendanceRow[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);
  const [sendFeedback, setSendFeedback] = useState('');
  const [messageChannelPicker, setMessageChannelPicker] = useState<AttendanceStatus | null>(null);
  const [staffModal, setStaffModal] = useState<{ date: string; existing: StaffAttendanceRow | null } | null>(null);
  const [staffModalStatus, setStaffModalStatus] = useState<AttendanceStatus>('PRESENT');
  const [staffModalNote, setStaffModalNote] = useState('');
  const [savingMyAttendance, setSavingMyAttendance] = useState(false);
  const [staffModalError, setStaffModalError] = useState('');

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const [classesRes, studentsRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/students?view=teacher-attendance')
      ]);

      const classesJson = await classesRes.json();
      const studentsJson = await studentsRes.json();

      const classList = Array.isArray(classesJson) ? classesJson : [];
      const studentList = Array.isArray(studentsJson) ? studentsJson : [];

      setClasses(classList);
      setStudents(studentList);

      if (classList[0]?.id) setSelectedClassId((prev) => prev || classList[0].id);
    } catch {
      setMessage('Failed to load attendance data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students.filter((student) => student.class && student.class.id === selectedClassId);
  }, [students, selectedClassId]);

  const loadExistingAttendance = useCallback(async () => {
    if (!selectedClassId) return;

    try {
      const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
        fetch(`/api/attendance?classId=${selectedClassId}&date=${date}`),
        fetch(`/api/attendance?classId=${selectedClassId}&from=${rangeStart(date, 6)}&to=${date}`),
        fetch(`/api/attendance?classId=${selectedClassId}&from=${monthStart(date)}&to=${monthEnd(date)}`)
      ]);
      const [myDailyStaffRes, myWeeklyStaffRes, myMonthlyStaffRes] = await Promise.all([
        fetch(`/api/staff-attendance?date=${date}`),
        fetch(`/api/staff-attendance?from=${rangeStart(date, 6)}&to=${date}`),
        fetch(`/api/staff-attendance?from=${monthStart(staffMonthDate)}&to=${monthEnd(staffMonthDate)}`)
      ]);

      const dailyJson = await dailyRes.json();
      const weeklyJson = await weeklyRes.json();
      const monthlyJson = await monthlyRes.json();
      const myDailyStaffJson = await myDailyStaffRes.json();
      const myWeeklyStaffJson = await myWeeklyStaffRes.json();
      const myMonthlyStaffJson = await myMonthlyStaffRes.json();

      const rows: ExistingAttendance[] = Array.isArray(dailyJson) ? dailyJson : [];
      const dailyParsed: ApiAttendanceRow[] = Array.isArray(dailyJson) ? dailyJson : [];
      const weeklyParsed: ApiAttendanceRow[] = Array.isArray(weeklyJson) ? weeklyJson : [];
      const monthlyParsed: ApiAttendanceRow[] = Array.isArray(monthlyJson) ? monthlyJson : [];
      const myDailyStaffParsed: StaffAttendanceRow[] = Array.isArray(myDailyStaffJson) ? myDailyStaffJson : [];
      const myWeeklyStaffParsed: StaffAttendanceRow[] = Array.isArray(myWeeklyStaffJson) ? myWeeklyStaffJson : [];
      const myMonthlyStaffParsed: StaffAttendanceRow[] = Array.isArray(myMonthlyStaffJson) ? myMonthlyStaffJson : [];

      setDailyRows(dailyParsed);
      setWeeklyRows(weeklyParsed);
      setMonthlyRows(monthlyParsed);
      setMyDailyStaffRows(myDailyStaffParsed);
      setMyWeeklyStaffRows(myWeeklyStaffParsed);
      setMyMonthlyStaffRows(myMonthlyStaffParsed);

      const nextMap: Record<string, AttendanceRecord> = {};
      for (const student of classStudents) {
        nextMap[student.id] = { studentId: student.id, status: 'PRESENT', remarks: '' };
      }

      for (const row of rows) {
        nextMap[row.studentId] = {
          studentId: row.studentId,
          status: row.status,
          remarks: row.remarks ?? ''
        };
      }

      setRecords(nextMap);
    } catch {
      setMessage('Failed to load existing attendance records.');
    }
  }, [selectedClassId, date, classStudents, staffMonthDate]);

  useEffect(() => {
    void loadExistingAttendance();
  }, [loadExistingAttendance]);

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? { studentId, remarks: '' }), studentId, status }
    }));
  };

  const updateRemarks = (studentId: string, remarks: string) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? { studentId, status: 'PRESENT' as AttendanceStatus }), studentId, remarks }
    }));
  };

  const markAllPresent = () => {
    const updated: Record<string, AttendanceRecord> = {};
    for (const student of classStudents) {
      updated[student.id] = { ...(records[student.id] ?? { studentId: student.id, remarks: '' }), studentId: student.id, status: 'PRESENT' };
    }
    setRecords(updated);
  };

  const saveAttendance = async () => {
    if (!selectedClassId) {
      setMessage('Please select a class first.');
      return;
    }

    const payloadRecords = classStudents.map((student) => ({
      studentId: student.id,
      status: (records[student.id]?.status ?? 'PRESENT') as AttendanceStatus,
      remarks: records[student.id]?.remarks?.trim() || undefined
    }));

    if (payloadRecords.length === 0) {
      setMessage('No students found in selected class.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: selectedClassId, date, records: payloadRecords })
      });

      const json = await res.json();
      if (!res.ok) {
        setMessage(typeof json?.error === 'string' ? json.error : 'Unable to save attendance.');
        return;
      }

      setMessage('Attendance saved successfully.');
      await loadExistingAttendance();
    } catch {
      setMessage('Request failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const sendStatusMessage = async (status: AttendanceStatus) => {
    if (!selectedClassId) {
      setMessage('Select class first.');
      return;
    }

    setBroadcasting(true);
    setMessage('');
    try {
      const studentIds = classStudents
        .filter((student) => (records[student.id]?.status ?? 'PRESENT') === status)
        .map((student) => student.id);

      const res = await fetch('/api/attendance/status-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: selectedClassId, date, status, studentIds })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error ?? 'Unable to send status message.');
        setSendFeedback('');
        return;
      }
      setMessage(`${data?.sent ?? 0} ${status} attendance message(s) sent in-app.`);
      setSendFeedback(`🔔 ${data?.sent ?? 0} ${statusLabel[status]} message(s) sent successfully.`);
      setTimeout(() => setSendFeedback(''), 3500);
    } catch {
      setMessage('Network error while sending attendance messages.');
      setSendFeedback('');
    } finally {
      setBroadcasting(false);
    }
  };

  const openStaffDay = (dateString: string) => {
    const existing = staffRecordMap.get(dateString) ?? null;
    setStaffModal({ date: dateString, existing });
    setStaffModalStatus(existing?.status ?? 'PRESENT');
    setStaffModalNote(existing?.note ?? '');
    setStaffModalError('');
  };

  const saveMyAttendance = async () => {
    if (!staffModal) return;
    setSavingMyAttendance(true);
    setStaffModalError('');
    try {
      const res = await fetch('/api/staff-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: staffModal.date,
          status: staffModalStatus,
          note: staffModalNote.trim() || undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStaffModalError(data?.error ?? 'Unable to save your attendance.');
        return;
      }
      setMessage('Your attendance saved successfully.');
      setDate(staffModal.date);
      setStaffMonthDate(monthStart(staffModal.date));
      setStaffModal(null);
      await loadExistingAttendance();
    } catch {
      setStaffModalError('Network error while saving your attendance.');
    } finally {
      setSavingMyAttendance(false);
    }
  };

  const normalizePhone = (raw?: string | null) => {
    if (!raw) return null;
    let digits = raw.replace(/\D/g, '');
    while (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('92')) {
      digits = digits.slice(2);
      if (digits.startsWith('0')) digits = digits.slice(1);
    } else if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    if (digits.length === 11 && digits.startsWith('03')) digits = digits.slice(1);
    if (digits.length === 10 && digits.startsWith('3')) return `92${digits}`;
    return null;
  };

  const openWhatsAppMessages = (status: AttendanceStatus) => {
    if (!selectedClassId) {
      setMessage('Select class first.');
      return;
    }

    const targets = classStudents
      .filter((student) => (records[student.id]?.status ?? 'PRESENT') === status)
      .map((student) => {
        const phone = normalizePhone(student.whatsApp || student.guardianPhone);
        return {
          id: student.id,
          name: student.user.fullName,
          phone
        };
      })
      .filter((item) => Boolean(item.phone));

    if (targets.length === 0) {
      setMessage(`No ${statusLabel[status]} students with WhatsApp number found.`);
      return;
    }

    const classLabel = classes.find((c) => c.id === selectedClassId);
    const text = `Assalam o Alaikum. Attendance update: ${statusLabel[status]} for ${classLabel?.name ?? 'Class'} ${classLabel?.section ?? ''} on ${date}.`;
    targets.slice(0, 20).forEach((target) => {
      const url = `https://wa.me/${target.phone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });

    setSendFeedback(`🔔 WhatsApp opened for ${targets.length} ${statusLabel[status]} student(s).`);
    setTimeout(() => setSendFeedback(''), 3500);
  };

  const countByStatus = (rows: { status: AttendanceStatus }[], status: AttendanceStatus) => rows.filter((row) => row.status === status).length;
  const todayStaffStatus = myDailyStaffRows[0]?.status;
  const inputBase = 'h-12 w-full rounded-2xl border border-[#D8E2E7] bg-white px-4 text-sm font-semibold text-[#0F172A] outline-none transition duration-200 focus:border-[#007A70] focus:ring-4 focus:ring-[#8BE8D8]/25';
  const [calendarYear, calendarMonth] = staffMonthDate.split('-').map(Number);
  const staffRecordMap = useMemo(() => new Map(myMonthlyStaffRows.map((row) => [row.date, row])), [myMonthlyStaffRows]);
  const calendarDays: (number | null)[] = [
    ...Array(firstDayOffset(calendarYear, calendarMonth)).fill(null),
    ...Array.from({ length: daysInMonth(calendarYear, calendarMonth) }, (_, index) => index + 1)
  ];
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);
  const selectedMonthLabel = new Date(calendarYear, calendarMonth - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
  const todayString = new Date().toISOString().slice(0, 10);

  return (
    <div className="-mx-4 -my-6 min-h-screen space-y-4 bg-[#F4F7F8] px-4 py-5 pb-36 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <section className="rounded-[24px] border border-white bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#006A61]">Teacher Portal</p>
            <h2 className="mt-2 text-[28px] font-black leading-tight tracking-[-0.04em] text-[#111827]">Attendance</h2>
            <p className="mt-1 text-sm leading-6 text-[#4B5563]">Review and update student attendance for your current class.</p>
          </div>
          <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${todayStaffStatus ? statusStyle[todayStaffStatus] : 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]'}`}>
            <AlertCircle className="mr-1 h-3.5 w-3.5" />
            {todayStaffStatus ? statusLabel[todayStaffStatus] : 'Unmarked'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <select className={inputBase} value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
            <option value="">Select class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name} - {cls.section}</option>
            ))}
          </select>

          <input type="date" className={inputBase} value={date} onChange={(e) => setDate(e.target.value)} />

          <button type="button" onClick={markAllPresent} className="h-12 rounded-2xl border border-[#CFE4E1] bg-[#E6F4F1] px-4 text-sm font-black text-[#007A70] transition active:scale-[0.98]">
            Mark All Present
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {[
          { label: 'Daily Present', value: countByStatus(dailyRows, 'PRESENT'), icon: CheckCircle2, tint: 'bg-[#E6F4F1] text-[#1F5A5C]' },
          { label: 'Weekly Present', value: countByStatus(weeklyRows, 'PRESENT'), icon: CalendarCheck2, tint: 'bg-[#dcfce7] text-[#166534]' },
          { label: 'Monthly Present', value: countByStatus(monthlyRows, 'PRESENT'), icon: Users2, tint: 'bg-[#ecfeff] text-[#0e7490]' },
          { label: 'Monthly Absent', value: countByStatus(monthlyRows, 'ABSENT'), icon: XCircle, tint: 'bg-[#fee2e2] text-[#991b1b]' }
        ].map((item) => (
          <div key={item.label} className="rounded-[20px] border border-white bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
            <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${item.tint}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <p className="text-xs font-bold text-[#64748B]">{item.label}</p>
            <p className="mt-1 text-[30px] leading-none font-extrabold tracking-tight text-[#0F172A]">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[24px] border border-white bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.07)]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#0F172A]">My Staff Attendance</h3>
          <span className="text-xs text-[#64748B]">{myMonthlyStaffRows.length} records</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Today', value: todayStaffStatus ? statusLabel[todayStaffStatus] : 'Unmarked' },
            { label: 'Weekly Present', value: countByStatus(myWeeklyStaffRows, 'PRESENT') },
            { label: 'Monthly Present', value: countByStatus(myMonthlyStaffRows, 'PRESENT') },
            { label: 'Monthly Absent', value: countByStatus(myMonthlyStaffRows, 'ABSENT') }
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <p className="text-[11px] text-[#64748B]">{item.label}</p>
              <p className="mt-1 text-base font-semibold text-[#0F172A]">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-white bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.07)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#084750]">My Attendance</p>
            <h3 className="mt-1 text-xl font-black text-[#0F172A]">{selectedMonthLabel}</h3>
            <p className="mt-1 text-xs text-[#64748B]">Tap any date to mark or update your staff attendance, just like student attendance.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStaffMonthDate(shiftMonthKey(staffMonthDate, -1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#084750] transition active:scale-[0.97]"
              aria-label="Previous month"
            >
              &#8592;
            </button>
            <button
              type="button"
              onClick={() => setStaffMonthDate(shiftMonthKey(staffMonthDate, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#084750] transition active:scale-[0.97]"
              aria-label="Next month"
            >
              &#8594;
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1">
          {dayNames.map((dayName) => (
            <div key={dayName} className="py-1 text-center text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
              {dayName}
            </div>
          ))}
          {calendarDays.map((day, index) => {
            if (day === null) return <div key={`blank-${index}`} />;
            const dateString = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const row = staffRecordMap.get(dateString);
            const statusClasses = row ? calendarStatusStyle[row.status] : null;
            const todayRing = dateString === todayString ? 'ring-2 ring-[#084750] ring-offset-1' : '';
            return (
              <button
                key={dateString}
                type="button"
                onClick={() => openStaffDay(dateString)}
                title={row ? `${statusLabel[row.status]}${row.note ? ` - ${row.note}` : ''}` : 'Mark attendance'}
                className={`relative flex aspect-square items-center justify-center rounded-xl text-sm font-bold ${
                  statusClasses?.cell ?? 'bg-[#F1F5F9] text-[#94A3B8]'
                } ${todayRing} transition hover:scale-[1.03] active:scale-[0.98]`}
              >
                {day}
                {statusClasses ? <span className={`absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full ${statusClasses.dot}`} /> : null}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { label: 'Present', value: countByStatus(myMonthlyStaffRows, 'PRESENT'), color: 'bg-[#16a34a]' },
            { label: 'Absent', value: countByStatus(myMonthlyStaffRows, 'ABSENT'), color: 'bg-[#dc2626]' },
            { label: 'Late', value: countByStatus(myMonthlyStaffRows, 'LATE'), color: 'bg-[#d97706]' },
            { label: 'Leave', value: countByStatus(myMonthlyStaffRows, 'EXCUSED'), color: 'bg-[#2E2B78]' }
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                <span className="text-sm font-black text-white">{item.value}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#0F172A]">{item.label}</p>
                <p className="text-[10px] text-[#64748B]">this month</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <p className="mb-3 text-xs font-bold text-[#64748B]">Legend</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {[
              { label: 'Present', dot: 'bg-[#16a34a]' },
              { label: 'Absent', dot: 'bg-[#dc2626]' },
              { label: 'Late', dot: 'bg-[#d97706]' },
              { label: 'Leave', dot: 'bg-[#2E2B78]' },
              { label: 'Not marked', dot: 'bg-[#CBD5E1]' }
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
                <span className="text-xs text-[#64748B]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-white bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.07)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-[#0F172A]">Students ({classStudents.length})</h3>
          <button
            type="button"
            onClick={saveAttendance}
            disabled={saving || loading}
            className="hidden h-10 rounded-2xl bg-[#084750] px-4 text-xs font-black text-white shadow-[0_10px_20px_rgba(8,71,80,0.25)] disabled:opacity-60 md:inline-flex md:items-center"
          >
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => setMessageChannelPicker('PRESENT')} disabled={broadcasting} className="h-10 rounded-xl border border-[#86efac] text-xs font-semibold text-[#15803d]">Message Present</button>
          <button type="button" onClick={() => setMessageChannelPicker('LATE')} disabled={broadcasting} className="h-10 rounded-xl border border-[#fcd34d] text-xs font-semibold text-[#b45309]">Message Late</button>
          <button type="button" onClick={() => setMessageChannelPicker('ABSENT')} disabled={broadcasting} className="h-10 rounded-xl border border-[#fca5a5] text-xs font-semibold text-[#b91c1c]">Message Absent</button>
        </div>
        {sendFeedback ? (
          <div className="mb-3 rounded-2xl border border-[#99F6E4] bg-[#ECFEFF] px-3 py-2 text-xs font-semibold text-[#0F766E] shadow-[0_6px_14px_rgba(20,184,166,0.15)]">
            {sendFeedback}
          </div>
        ) : null}

        <div className="space-y-2.5">
          {classStudents.map((student) => (
            <div key={student.id} className="rounded-[20px] border border-[#E2E8F0] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#F8FAFC] text-[#00507D] shadow-[0_4px_10px_rgba(15,23,42,0.08)]">
                  <UserRound className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#0F172A]">{student.user.fullName}</p>
                  <p className="text-xs text-[#64748B]">Admission: {student.admissionNo}</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 rounded-2xl bg-white p-1.5">
                {quickStatusPills.map((pill) => {
                  const active = (records[student.id]?.status ?? 'PRESENT') === pill.value;
                  return (
                    <button
                      key={pill.value}
                      type="button"
                      onClick={() => updateStatus(student.id, pill.value)}
                      className={`h-10 rounded-xl text-xs font-bold transition ${active ? (pill.value === 'PRESENT' ? 'bg-[#084750] text-white shadow-[0_8px_16px_rgba(8,71,80,0.24)]' : pill.value === 'ABSENT' ? 'bg-[#C81E1E] text-white shadow-[0_8px_16px_rgba(200,30,30,0.22)]' : 'bg-[#2E2B78] text-white shadow-[0_8px_16px_rgba(46,43,120,0.22)]') : 'bg-[#F8FAFC] text-[#475569]'}`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>
              <input className="mt-2 h-9 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#1F5A5C]" placeholder="Optional remark" value={records[student.id]?.remarks ?? ''} onChange={(e) => updateRemarks(student.id, e.target.value)} />
            </div>
          ))}
        </div>

        {classStudents.length === 0 ? (
          <div className="mt-2 rounded-2xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-6 text-center">
            <Users2 className="mx-auto h-6 w-6 text-[#94A3B8]" />
            <p className="mt-2 text-sm font-medium text-[#0F172A]">No students in selected class</p>
            <p className="mt-1 text-xs text-[#64748B]">Choose another class to mark attendance.</p>
          </div>
        ) : null}
      </section>

      <section className="rounded-[24px] border border-white bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.07)]">
        <h3 className="text-base font-semibold text-[#0F172A]">My Staff Attendance Record</h3>
        {myMonthlyStaffRows.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-6 text-center">
            <Clock3 className="mx-auto h-6 w-6 text-[#94A3B8]" />
            <p className="mt-2 text-sm font-medium text-[#0F172A]">No attendance records yet</p>
            <p className="mt-1 text-xs text-[#64748B]">Your staff attendance timeline will appear here.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-2.5">
            {myMonthlyStaffRows.slice(0, 8).map((row) => (
              <div key={row.id} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#0F172A]">{row.date}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyle[row.status]}`}>{statusLabel[row.status]}</span>
                </div>
                <p className="mt-1 text-xs text-[#64748B]">{row.note || 'No note added.'}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {message ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] shadow-[0_6px_16px_rgba(15,23,42,0.05)]">
          {message}
        </div>
      ) : null}

      <div className="fixed bottom-[84px] left-3 right-3 z-40 md:hidden">
        <button
          type="button"
          onClick={saveAttendance}
          disabled={saving || loading}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#084750] px-4 text-lg font-black text-white shadow-[0_16px_28px_rgba(8,71,80,0.32)] transition active:scale-[0.99] disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Attendance'}
        </button>
      </div>

      {messageChannelPicker ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close channel picker"
            onClick={() => setMessageChannelPicker(null)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[24px] border-t border-white/60 bg-white p-4 pb-6 shadow-[0_-20px_44px_rgba(15,23,42,0.25)]">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#CBD5E1]" />
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-[#0F172A]">
                Send {statusLabel[messageChannelPicker]} Message
              </p>
              <button
                type="button"
                onClick={() => setMessageChannelPicker(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => {
                  void sendStatusMessage(messageChannelPicker);
                  setMessageChannelPicker(null);
                }}
                className="flex h-12 items-center justify-center rounded-xl bg-[#084750] text-sm font-semibold text-white shadow-[0_8px_16px_rgba(8,71,80,0.24)]"
              >
                In-App Message
              </button>
              <button
                type="button"
                onClick={() => {
                  openWhatsAppMessages(messageChannelPicker);
                  setMessageChannelPicker(null);
                }}
                className="flex h-12 items-center justify-center rounded-xl border border-[#D7E3E8] bg-white text-sm font-semibold text-[#0F172A]"
              >
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {staffModal ? (
        <Modal
          title={new Date(`${staffModal.date}T00:00:00`).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
          onClose={() => setStaffModal(null)}
        >
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Status</p>
              <div className="grid grid-cols-2 gap-2">
                {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const).map((status) => {
                  const active = staffModalStatus === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStaffModalStatus(status)}
                      className={`h-11 rounded-xl border-2 text-sm font-semibold transition ${
                        active
                          ? `${calendarStatusStyle[status].cell} border-current`
                          : 'border-transparent bg-[#f8fafc] text-[#6b7280] hover:bg-[#f1f5f9]'
                      }`}
                    >
                      {statusLabel[status]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Note (optional)</label>
              <input
                className="mt-1 h-10 w-full rounded-xl border-none bg-[#f3f4f5] px-3 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#004649]/30"
                placeholder="e.g. Sick leave"
                value={staffModalNote}
                onChange={(e) => setStaffModalNote(e.target.value)}
              />
            </div>

            {staffModalError ? <p className="text-xs font-medium text-[#b91c1c]">{staffModalError}</p> : null}

            <button
              type="button"
              onClick={saveMyAttendance}
              disabled={savingMyAttendance}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#004649] font-semibold text-white transition hover:bg-[#1b5e62] disabled:opacity-60"
            >
              {savingMyAttendance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {staffModal.existing ? 'Update Attendance' : 'Mark Attendance'}
            </button>

            {staffModal.existing ? (
              <div className="rounded-xl bg-[#f8fafc] px-3 py-2 text-xs text-[#64748B]">
                Existing note: {staffModal.existing.note || 'No note added.'}
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
