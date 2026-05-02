'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

type ClassItem = { id: string; name: string; section: string };
type StudentItem = {
  id: string;
  admissionNo: string;
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

const statusOptions: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

function fmtDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeStart(date: string, daysBack: number) {
  const base = new Date(date);
  base.setDate(base.getDate() - daysBack);
  return fmtDate(base);
}

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [dailyRows, setDailyRows] = useState<ApiAttendanceRow[]>([]);
  const [weeklyRows, setWeeklyRows] = useState<ApiAttendanceRow[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<ApiAttendanceRow[]>([]);
  const [myDailyStaffRows, setMyDailyStaffRows] = useState<StaffAttendanceRow[]>([]);
  const [myWeeklyStaffRows, setMyWeeklyStaffRows] = useState<StaffAttendanceRow[]>([]);
  const [myMonthlyStaffRows, setMyMonthlyStaffRows] = useState<StaffAttendanceRow[]>([]);
  const [myStatus, setMyStatus] = useState<AttendanceStatus>('PRESENT');
  const [myNote, setMyNote] = useState('');
  const [savingMyAttendance, setSavingMyAttendance] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const [classesRes, studentsRes] = await Promise.all([fetch('/api/classes'), fetch('/api/students')]);

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
        fetch(`/api/attendance?classId=${selectedClassId}&from=${new Date(date).toISOString().slice(0, 7)}-01&to=${date}`)
      ]);
      const [myDailyStaffRes, myWeeklyStaffRes, myMonthlyStaffRes] = await Promise.all([
        fetch(`/api/staff-attendance?date=${date}`),
        fetch(`/api/staff-attendance?from=${rangeStart(date, 6)}&to=${date}`),
        fetch(`/api/staff-attendance?from=${new Date(date).toISOString().slice(0, 7)}-01&to=${date}`)
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
      if (myDailyStaffParsed[0]) {
        setMyStatus(myDailyStaffParsed[0].status);
        setMyNote(myDailyStaffParsed[0].note ?? '');
      } else {
        setMyStatus('PRESENT');
        setMyNote('');
      }

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
  }, [selectedClassId, date, classStudents]);

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
      const res = await fetch('/api/attendance/status-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: selectedClassId, date, status })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error ?? 'Unable to send status message.');
        return;
      }
      setMessage(`${data?.sent ?? 0} ${status} attendance message(s) sent in-app.`);
    } catch {
      setMessage('Network error while sending attendance messages.');
    } finally {
      setBroadcasting(false);
    }
  };

  const saveMyAttendance = async () => {
    setSavingMyAttendance(true);
    setMessage('');
    try {
      const res = await fetch('/api/staff-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          status: myStatus,
          note: myNote.trim() || undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error ?? 'Unable to save your attendance.');
        return;
      }
      setMessage('Your attendance saved successfully.');
      await loadExistingAttendance();
    } catch {
      setMessage('Network error while saving your attendance.');
    } finally {
      setSavingMyAttendance(false);
    }
  };

  const countByStatus = (rows: { status: AttendanceStatus }[], status: AttendanceStatus) => rows.filter((row) => row.status === status).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-4 sm:p-6">
        <h2 className="font-headline text-2xl sm:text-3xl font-bold text-[#1a1c1c]">Attendance Marking</h2>
        <p className="mt-2 text-[#5c6668]">Daily marking with weekly/monthly attendance report and status messages.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <select className="h-11 rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#1a1c1c] focus:ring-2 focus:ring-[#004649]/20 outline-none" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
            <option value="">Select class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name} - {cls.section}</option>
            ))}
          </select>

          <input type="date" className="h-11 rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#1a1c1c] focus:ring-2 focus:ring-[#004649]/20 outline-none" value={date} onChange={(e) => setDate(e.target.value)} />

          <button type="button" onClick={markAllPresent} className="h-11 rounded-xl border border-[#004649] px-4 font-semibold text-[#004649] hover:bg-[#f0f7f7]">Mark All Present</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[{ label: 'Daily Present', value: countByStatus(dailyRows, 'PRESENT') }, { label: 'Weekly Present', value: countByStatus(weeklyRows, 'PRESENT') }, { label: 'Monthly Present', value: countByStatus(monthlyRows, 'PRESENT') }, { label: 'Monthly Absent', value: countByStatus(monthlyRows, 'ABSENT') }].map((item) => (
          <div key={item.label} className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'My Daily Status', value: myDailyStaffRows[0]?.status ?? 'UNMARKED' },
          { label: 'My Weekly Present', value: countByStatus(myWeeklyStaffRows, 'PRESENT') },
          { label: 'My Monthly Present', value: countByStatus(myMonthlyStaffRows, 'PRESENT') },
          { label: 'My Monthly Absent', value: countByStatus(myMonthlyStaffRows, 'ABSENT') }
        ].map((item) => (
          <div key={item.label} className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#1a1c1c]">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-4 sm:p-6">
        <h3 className="font-headline font-semibold text-[#1a1c1c]">Mark My Attendance</h3>
        <p className="mt-1 text-sm text-[#5c6668]">Teacher can mark own attendance for selected date.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <select
            className="h-11 rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#1a1c1c] focus:ring-2 focus:ring-[#004649]/20 outline-none"
            value={myStatus}
            onChange={(e) => setMyStatus(e.target.value as AttendanceStatus)}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input
            className="h-11 rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#1a1c1c] focus:ring-2 focus:ring-[#004649]/20 outline-none md:col-span-2"
            placeholder="Note (optional)"
            value={myNote}
            onChange={(e) => setMyNote(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={saveMyAttendance}
          disabled={savingMyAttendance}
          className="mt-4 h-10 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] shadow-[0_8px_20px_rgba(0,70,73,0.12)] active:scale-[0.98] transition-all px-6 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingMyAttendance ? 'Saving...' : 'Save My Attendance'}
        </button>
      </div>

      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-headline font-semibold text-[#1a1c1c]">Students ({classStudents.length})</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void sendStatusMessage('ABSENT')} disabled={broadcasting} className="rounded-xl border border-[#fca5a5] px-3 py-2 text-xs font-semibold text-[#ba1a1a] hover:bg-[#fde8e8] disabled:opacity-60">Message Absent</button>
            <button type="button" onClick={() => void sendStatusMessage('LATE')} disabled={broadcasting} className="rounded-xl border border-[#f5d0a9] px-3 py-2 text-xs font-semibold text-[#865300] hover:bg-[#fff3e0] disabled:opacity-60">Message Late</button>
            <button type="button" onClick={() => void sendStatusMessage('PRESENT')} disabled={broadcasting} className="rounded-xl border border-[#b7dfbc] px-3 py-2 text-xs font-semibold text-[#004649] hover:bg-[#e8f5e9] disabled:opacity-60">Message Present</button>
            <button type="button" onClick={saveAttendance} disabled={saving || loading} className="h-10 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] shadow-[0_8px_20px_rgba(0,70,73,0.12)] active:scale-[0.98] transition-all px-6 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving...' : 'Save Attendance'}</button>
          </div>
        </div>

        <div className="space-y-2 md:hidden">
          {classStudents.map((student) => (
            <div key={student.id} className="rounded-xl bg-[#f3f4f5] p-3">
              <p className="text-sm font-semibold text-[#1a1c1c]">{student.user.fullName}</p>
              <p className="mt-0.5 text-xs text-[#596364]">Admission: {student.admissionNo}</p>
              <select className="mt-2 h-10 w-full rounded-xl bg-[#edeeef] border-none px-2 text-sm focus:ring-2 focus:ring-[#004649]/20 outline-none" value={records[student.id]?.status ?? 'PRESENT'} onChange={(e) => updateStatus(student.id, e.target.value as AttendanceStatus)}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <input className="mt-2 h-10 w-full rounded-xl bg-[#edeeef] border-none px-2 text-sm focus:ring-2 focus:ring-[#004649]/20 outline-none" placeholder="Optional remark" value={records[student.id]?.remarks ?? ''} onChange={(e) => updateRemarks(student.id, e.target.value)} />
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="hidden min-w-full text-sm md:table">
            <thead className="bg-[#f3f4f3] text-[#596364]">
              <tr>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Student</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Admission #</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Status</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {classStudents.map((student) => (
                <tr key={student.id} className="border-b border-[#eef1f1]">
                  <td className="px-3 py-3 font-semibold text-[#1a1c1c]">{student.user.fullName}</td>
                  <td className="px-3 py-3 text-[#596364]">{student.admissionNo}</td>
                  <td className="px-3 py-3">
                    <select className="h-10 rounded-xl bg-[#edeeef] border-none px-2 text-sm focus:ring-2 focus:ring-[#004649]/20 outline-none" value={records[student.id]?.status ?? 'PRESENT'} onChange={(e) => updateStatus(student.id, e.target.value as AttendanceStatus)}>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <input className="h-10 w-full rounded-xl bg-[#edeeef] border-none px-2 text-sm focus:ring-2 focus:ring-[#004649]/20 outline-none" placeholder="Optional remark" value={records[student.id]?.remarks ?? ''} onChange={(e) => updateRemarks(student.id, e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {classStudents.length === 0 ? <p className="mt-4 text-sm text-[#5c6668]">No students in selected class.</p> : null}
        {message ? <p className="mt-4 rounded-xl bg-[#f3f4f3] px-4 py-3 text-sm text-[#1a1c1c]">{message}</p> : null}
      </div>

      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-4 sm:p-6">
        <h3 className="font-headline font-semibold text-[#1a1c1c]">My Staff Attendance Record</h3>
        <div className="mt-4 space-y-2 md:hidden">
          {myMonthlyStaffRows.map((row) => (
            <div key={row.id} className="rounded-xl bg-[#f3f4f5] p-3">
              <p className="text-sm font-semibold text-[#1a1c1c]">{row.date}</p>
              <p className="mt-1 text-xs text-[#596364]">Status: {row.status}</p>
              <p className="mt-1 text-xs text-[#596364]">Note: {row.note || '-'}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="hidden min-w-full text-sm md:table">
            <thead className="bg-[#f3f4f3] text-[#596364]">
              <tr>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Date</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Status</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Note</th>
              </tr>
            </thead>
            <tbody>
              {myMonthlyStaffRows.map((row) => (
                <tr key={row.id} className="border-b border-[#eef1f1]">
                  <td className="px-3 py-3 text-[#596364]">{row.date}</td>
                  <td className="px-3 py-3 font-semibold text-[#1a1c1c]">{row.status}</td>
                  <td className="px-3 py-3 text-[#596364]">{row.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {myMonthlyStaffRows.length === 0 ? <p className="mt-4 text-sm text-[#5c6668]">Staff attendance not marked yet.</p> : null}
      </div>
    </div>
  );
}
