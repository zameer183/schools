'use client';

import { useMemo, useState } from 'react';

type StudentOption = {
  user: { id: string; fullName: string };
  class: { name: string; section: string } | null;
};

type TeacherOption = {
  user: { id: string; fullName: string };
};

type ClassOption = {
  id: string;
  name: string;
  section: string;
};

type TargetMode = 'individual_student' | 'individual_teacher' | 'class' | 'announcement';

export default function ComposeMessageForm({
  students,
  teachers,
  classes,
  presetRecipientId,
  action
}: {
  students: StudentOption[];
  teachers: TeacherOption[];
  classes: ClassOption[];
  presetRecipientId: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [targetMode, setTargetMode] = useState<TargetMode>(presetRecipientId ? 'individual_student' : 'individual_student');
  const [studentRecipientId, setStudentRecipientId] = useState(presetRecipientId);
  const [teacherRecipientId, setTeacherRecipientId] = useState('');
  const [classId, setClassId] = useState('');

  const modeHelpText = useMemo(() => {
    if (targetMode === 'individual_student') return 'Select one student from list.';
    if (targetMode === 'individual_teacher') return 'Select one teacher from list.';
    if (targetMode === 'class') return 'Select class to send group message.';
    return 'Announcement will be sent to all students.';
  }, [targetMode]);

  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      <input
        name="subject"
        required
        placeholder="Subject"
        className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#2c3e50] outline-none focus:ring-2 focus:ring-[#004649]/20 sm:col-span-2"
      />

      <select
        name="targetMode"
        value={targetMode}
        onChange={(e) => setTargetMode(e.target.value as TargetMode)}
        className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#2c3e50] outline-none focus:ring-2 focus:ring-[#004649]/20 sm:col-span-2"
      >
        <option value="individual_student">Individual Student</option>
        <option value="individual_teacher">Individual Teacher</option>
        <option value="class">Class Group</option>
        <option value="announcement">Announcement (All Students)</option>
      </select>

      {targetMode === 'individual_student' ? (
        <select
          name="studentRecipientId"
          value={studentRecipientId}
          onChange={(e) => setStudentRecipientId(e.target.value)}
          required
          className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#2c3e50] outline-none focus:ring-2 focus:ring-[#004649]/20 sm:col-span-2"
        >
          <option value="">Select student</option>
          {students.map((student) => (
            <option key={student.user.id} value={student.user.id}>
              {student.user.fullName} ({student.class ? `${student.class.name}-${student.class.section}` : 'No class'})
            </option>
          ))}
        </select>
      ) : null}

      {targetMode === 'individual_teacher' ? (
        <select
          name="teacherRecipientId"
          value={teacherRecipientId}
          onChange={(e) => setTeacherRecipientId(e.target.value)}
          required
          className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#2c3e50] outline-none focus:ring-2 focus:ring-[#004649]/20 sm:col-span-2"
        >
          <option value="">Select teacher</option>
          {teachers.map((teacher) => (
            <option key={teacher.user.id} value={teacher.user.id}>
              {teacher.user.fullName}
            </option>
          ))}
        </select>
      ) : null}

      {targetMode === 'class' ? (
        <select
          name="classId"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          required
          className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#2c3e50] outline-none focus:ring-2 focus:ring-[#004649]/20 sm:col-span-2"
        >
          <option value="">Select class for group message</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} - {item.section}
            </option>
          ))}
        </select>
      ) : null}

      <p className="text-xs text-[#6f7979] sm:col-span-2">{modeHelpText}</p>

      <textarea
        name="body"
        required
        rows={5}
        placeholder="Write message"
        className="sm:col-span-2 rounded-xl bg-[#edeeef] border-none p-3 text-sm text-[#2c3e50] outline-none focus:ring-2 focus:ring-[#004649]/20"
      />

      <button className="h-10 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,70,73,0.2)] transition-all hover:scale-105 sm:w-fit">
        Send In-App Message
      </button>
    </form>
  );
}

