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

const statusOptions: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const [classesRes, studentsRes] = await Promise.all([
        fetch('/api/classes', { cache: 'no-store' }),
        fetch('/api/students', { cache: 'no-store' })
      ]);

      const classesJson = await classesRes.json();
      const studentsJson = await studentsRes.json();

      const classList = Array.isArray(classesJson) ? classesJson : [];
      const studentList = Array.isArray(studentsJson) ? studentsJson : [];

      setClasses(classList);
      setStudents(studentList);

      if (!selectedClassId && classList[0]?.id) {
        setSelectedClassId(classList[0].id);
      }
    } catch {
      setMessage('Failed to load attendance data.');
    } finally {
      setLoading(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    loadBaseData();
  }, [loadBaseData]);

  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students.filter((student) => student.class && (student.class.id === selectedClassId));
  }, [students, selectedClassId]);

  const loadExistingAttendance = useCallback(async () => {
    if (!selectedClassId) return;

    try {
      const res = await fetch(`/api/attendance?classId=${selectedClassId}&date=${date}`, { cache: 'no-store' });
      const json = await res.json();
      const rows: ExistingAttendance[] = Array.isArray(json) ? json : [];

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
    loadExistingAttendance();
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
    } catch {
      setMessage('Request failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h2 className="font-headline text-4xl font-extrabold tracking-tight text-slate-900">Attendance Marking</h2>
        <p className="mt-2 text-slate-600">Mark daily attendance for students in your assigned classes.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <select
            className="h-11 rounded-xl border border-slate-300 px-3"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="">Select class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name} - {cls.section}</option>
            ))}
          </select>

          <input
            type="date"
            className="h-11 rounded-xl border border-slate-300 px-3"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <button
            type="button"
            onClick={markAllPresent}
            className="h-11 rounded-xl border border-teal-700 px-4 font-semibold text-teal-800 hover:bg-teal-50"
          >
            Mark All Present
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-headline text-2xl font-bold text-slate-900">Students ({classStudents.length})</h3>
          <button
            type="button"
            onClick={saveAttendance}
            disabled={saving || loading}
            className="h-11 rounded-xl bg-[#0f5954] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Student</th>
                <th className="px-3 py-2 text-left">Admission #</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {classStudents.map((student) => (
                <tr key={student.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{student.user.fullName}</td>
                  <td className="px-3 py-2">{student.admissionNo}</td>
                  <td className="px-3 py-2">
                    <select
                      className="h-10 rounded-lg border border-slate-300 px-2"
                      value={records[student.id]?.status ?? 'PRESENT'}
                      onChange={(e) => updateStatus(student.id, e.target.value as AttendanceStatus)}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="h-10 w-full rounded-lg border border-slate-300 px-2"
                      placeholder="Optional remark"
                      value={records[student.id]?.remarks ?? ''}
                      onChange={(e) => updateRemarks(student.id, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {classStudents.length === 0 ? <p className="mt-4 text-sm text-slate-600">No students in selected class.</p> : null}
        {message ? <p className="mt-4 text-sm text-slate-700">{message}</p> : null}
      </div>
    </div>
  );
}