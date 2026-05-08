'use client';

import { useMemo, useState } from 'react';

type QuickClassOption = {
  id: string;
  name: string;
  section: string;
};

type QuickStudentOption = {
  id: string;
  classId: string;
  admissionNo: string;
  fullName: string;
};

type QuickStudentAttendanceFormProps = {
  classes: QuickClassOption[];
  students: QuickStudentOption[];
  defaultDate: string;
  defaultClassId: string;
  action: (formData: FormData) => Promise<void>;
};

export function QuickStudentAttendanceForm({
  classes,
  students,
  defaultDate,
  defaultClassId,
  action
}: QuickStudentAttendanceFormProps) {
  const [classId, setClassId] = useState(defaultClassId);
  const [studentId, setStudentId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(defaultDate);

  const filteredStudents = useMemo(
    () =>
      students
        .filter((student) => student.classId === classId)
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [students, classId]
  );

  return (
    <form action={action} className="grid gap-2 rounded-xl bg-[#f3f4f5] p-3 sm:grid-cols-12 sm:items-center">
      <div className="sm:col-span-2">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Date</label>
        <input
          type="date"
          name="date"
          value={attendanceDate}
          onChange={(event) => setAttendanceDate(event.target.value)}
          className="h-9 w-full rounded-xl bg-[#edeeef] border-none px-3 text-xs outline-none focus:ring-2 focus:ring-[#004649]/20"
          required
        />
      </div>

      <div className="sm:col-span-3">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Class</label>
        <select
          name="classId"
          value={classId}
          onChange={(event) => {
            setClassId(event.target.value);
            setStudentId('');
          }}
          className="h-9 w-full rounded-xl bg-[#edeeef] border-none px-3 text-xs outline-none focus:ring-2 focus:ring-[#004649]/20"
          required
        >
          <option value="">Select class</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} - {item.section}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-3">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Student</label>
        <select
          name="studentId"
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
          className="h-9 w-full rounded-xl bg-[#edeeef] border-none px-3 text-xs outline-none focus:ring-2 focus:ring-[#004649]/20"
          required
        >
          <option value="">Select student</option>
          {filteredStudents.map((item) => (
            <option key={item.id} value={item.id}>
              {item.fullName} ({item.admissionNo})
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-1">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Status</label>
        <select name="status" defaultValue="PRESENT" className="h-9 w-full rounded-xl bg-[#edeeef] border-none px-3 text-xs outline-none focus:ring-2 focus:ring-[#004649]/20">
          <option value="PRESENT">Present</option>
          <option value="ABSENT">Absent</option>
          <option value="LATE">Late</option>
          <option value="EXCUSED">Excused</option>
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Remarks</label>
        <input name="remarks" placeholder="Optional remark" className="h-9 w-full rounded-xl bg-[#edeeef] border-none px-3 text-xs outline-none focus:ring-2 focus:ring-[#004649]/20" />
      </div>

      <div className="sm:col-span-1 sm:self-end">
        <button disabled={!attendanceDate || !classId || !studentId} className="h-9 w-full rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-3 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
          Mark
        </button>
      </div>
    </form>
  );
}
