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
      <div className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Attendance Marking</h2>
        <p className="mt-2 text-[#5c6668]">Mark daily attendance for students in your assigned classes.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <select
            className="h-11 rounded-xl border border-[#c0c8c9] bg-[#f9fafa] px-3 text-sm text-[#1a1c1c] focus:border-[#004649] focus:outline-none"
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
            className="h-11 rounded-xl border border-[#c0c8c9] bg-[#f9fafa] px-3 text-sm text-[#1a1c1c] focus:border-[#004649] focus:outline-none"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <button
            type="button"
            onClick={markAllPresent}
            className="h-11 rounded-xl border border-[#004649] px-4 font-semibold text-[#004649] hover:bg-[#f0f7f7]"
          >
            Mark All Present
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-semibold text-[#1a1c1c]">Students ({classStudents.length})</h3>
          <button
            type="button"
            onClick={saveAttendance}
            disabled={saving || loading}
            className="h-11 rounded-xl bg-[#004649] px-6 font-semibold text-white hover:bg-[#005a5e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
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
                    <select
                      className="h-10 rounded-lg border border-[#c0c8c9] bg-white px-2 text-sm focus:border-[#004649] focus:outline-none"
                      value={records[student.id]?.status ?? 'PRESENT'}
                      onChange={(e) => updateStatus(student.id, e.target.value as AttendanceStatus)}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className="h-10 w-full rounded-lg border border-[#c0c8c9] bg-white px-2 text-sm focus:border-[#004649] focus:outline-none"
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

        {classStudents.length === 0 ? <p className="mt-4 text-sm text-[#5c6668]">No students in selected class.</p> : null}
        {message ? <p className="mt-4 rounded-xl bg-[#f3f4f3] px-4 py-3 text-sm text-[#1a1c1c]">{message}</p> : null}
      </div>
    </div>
  );
}