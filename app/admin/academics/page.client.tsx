'use client';

import { useMemo, useState } from 'react';

export type ClassItem = {
  id: string;
  name: string;
  section: string;
  roomNo?: string | null;
  academicYear: string;
  _count?: { students: number; subjects: number };
};

export type TeacherItem = { id: string; user: { fullName: string } };

export type SubjectItem = {
  id: string;
  name: string;
  code: string;
  classId?: string;
  class?: { name: string; section: string } | null;
  teacher?: { user: { fullName: string } } | null;
};

export type ExamItem = {
  id: string;
  title: string;
  examType?: string;
  dueDate?: string;
  examDate: string;
  totalMarks: number;
  passingMarks: number;
  classId: string;
  subjectId: string;
  createdById: string;
  teacherName?: string;
  class: { name: string; section: string };
  subject: { name: string };
};

const EXAM_TYPES = ['One Juzz', '5 Juzz', '10 Juzz', 'Full Revision', 'Custom'] as const;

export default function AdminAcademicsPageClient({
  initialClasses,
  initialSubjects,
  initialTeachers,
  initialExams
}: {
  initialClasses: ClassItem[];
  initialSubjects: SubjectItem[];
  initialTeachers: TeacherItem[];
  initialExams: ExamItem[];
}) {
  const [classes, setClasses] = useState<ClassItem[]>(initialClasses);
  const [subjects, setSubjects] = useState<SubjectItem[]>(initialSubjects);
  const [teachers, setTeachers] = useState<TeacherItem[]>(initialTeachers);
  const [exams, setExams] = useState<ExamItem[]>(initialExams);
  const [message, setMessage] = useState('');
  const [examSaving, setExamSaving] = useState(false);

  const [classForm, setClassForm] = useState({ name: '', section: '', roomNo: '', academicYear: '2026' });
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', classId: '', teacherId: '', creditHours: 3 });
  const [examForm, setExamForm] = useState({
    id: '',
    title: '',
    examType: 'One Juzz',
    classId: '',
    subjectId: '',
    dueDate: '',
    totalMarks: '100',
    passingMarks: '50',
    createdByTeacherId: ''
  });

  const filteredSubjects = useMemo(
    () => subjects.filter((subject) => !examForm.classId || subject.classId === examForm.classId),
    [subjects, examForm.classId]
  );

  const load = async () => {
    const [classesRes, subjectsRes, teachersRes, examsRes] = await Promise.all([
      fetch('/api/classes'),
      fetch('/api/subjects'),
      fetch('/api/teachers'),
      fetch('/api/exams')
    ]);

    setClasses(classesRes.ok ? await classesRes.json() : []);
    setSubjects(subjectsRes.ok ? await subjectsRes.json() : []);
    setTeachers(teachersRes.ok ? await teachersRes.json() : []);
    setExams(examsRes.ok ? await examsRes.json() : []);
  };

  const addClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classForm)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data?.error ?? 'Unable to add class');
      return;
    }

    setMessage('Class added.');
    setClassForm({ name: '', section: '', roomNo: '', academicYear: classForm.academicYear });
    void load();
  };

  const addSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const payload = { ...subjectForm, creditHours: Number(subjectForm.creditHours) };
    const res = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data?.error ?? 'Unable to add subject');
      return;
    }

    setMessage('Subject added.');
    setSubjectForm({ name: '', code: '', classId: '', teacherId: '', creditHours: 3 });
    void load();
  };

  const saveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setExamSaving(true);

    const payload = {
      ...examForm,
      totalMarks: Number(examForm.totalMarks),
      passingMarks: Number(examForm.passingMarks)
    };

    const method = examForm.id ? 'PUT' : 'POST';
    const res = await fetch('/api/exams', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data?.error ?? 'Unable to save exam');
      setExamSaving(false);
      return;
    }

    setMessage(examForm.id ? 'Exam updated.' : 'Exam added.');
    setExamForm({
      id: '',
      title: '',
      examType: 'One Juzz',
      classId: '',
      subjectId: '',
      dueDate: '',
      totalMarks: '100',
      passingMarks: '50',
      createdByTeacherId: ''
    });

    setExamSaving(false);
    void load();
  };

  const editExam = (exam: ExamItem) => {
    setExamForm({
      id: exam.id,
      title: exam.title,
      examType: exam.examType ?? 'Custom',
      classId: exam.classId,
      subjectId: exam.subjectId,
      dueDate: (exam.dueDate ?? exam.examDate).slice(0, 10),
      totalMarks: String(exam.totalMarks),
      passingMarks: String(exam.passingMarks),
      createdByTeacherId: exam.createdById
    });
  };

  const removeExam = async (id: string) => {
    setMessage('');
    const res = await fetch(`/api/exams?id=${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data?.error ?? 'Unable to delete exam');
      return;
    }

    setMessage('Exam deleted.');
    if (examForm.id === id) {
      setExamForm({
        id: '',
        title: '',
        examType: 'One Juzz',
        classId: '',
        subjectId: '',
        dueDate: '',
        totalMarks: '100',
        passingMarks: '50',
        createdByTeacherId: ''
      });
    }
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-6">
        <h2 className="font-headline text-3xl font-bold text-[#1a1c1c]">Classes, Subjects &amp; Exams</h2>
        <p className="mt-1 text-sm text-[#6f7979]">Manage complete academic structure with exam planning and control.</p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <form onSubmit={addClass} className="rounded-xl bg-[#f3f4f5] p-4">
            <h3 className="font-headline font-semibold text-[#1a1c1c] mb-3">Create Class</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" placeholder="Class Name" value={classForm.name} onChange={(e) => setClassForm((f) => ({ ...f, name: e.target.value }))} required />
              <input className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" placeholder="Section" value={classForm.section} onChange={(e) => setClassForm((f) => ({ ...f, section: e.target.value }))} required />
              <input className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" placeholder="Academic Year" value={classForm.academicYear} onChange={(e) => setClassForm((f) => ({ ...f, academicYear: e.target.value }))} required />
              <input className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" placeholder="Room (optional)" value={classForm.roomNo} onChange={(e) => setClassForm((f) => ({ ...f, roomNo: e.target.value }))} />
            </div>
            <button className="mt-3 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Add Class</button>
          </form>

          <form onSubmit={addSubject} className="rounded-xl bg-[#f3f4f5] p-4">
            <h3 className="font-headline font-semibold text-[#1a1c1c] mb-3">Create Subject</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" placeholder="Subject Name" value={subjectForm.name} onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))} required />
              <input className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" placeholder="Code" value={subjectForm.code} onChange={(e) => setSubjectForm((f) => ({ ...f, code: e.target.value }))} required />
              <select className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" value={subjectForm.classId} onChange={(e) => setSubjectForm((f) => ({ ...f, classId: e.target.value }))} required>
                <option value="">Select Class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
              </select>
              <select className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" value={subjectForm.teacherId} onChange={(e) => setSubjectForm((f) => ({ ...f, teacherId: e.target.value }))}>
                <option value="">Assign Teacher (optional)</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.user.fullName}</option>)}
              </select>
              <input className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20 sm:col-span-2" type="number" min={1} value={subjectForm.creditHours} onChange={(e) => setSubjectForm((f) => ({ ...f, creditHours: Number(e.target.value) }))} />
            </div>
            <button className="mt-3 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Add Subject</button>
          </form>
        </div>

        <form onSubmit={saveExam} className="mt-4 rounded-xl bg-[#f3f4f5] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-headline font-semibold text-[#1a1c1c]">Exam Manager (Add / Edit / Delete)</h3>
            {examForm.id ? (
              <button type="button" onClick={() => setExamForm({ id: '', title: '', examType: 'One Juzz', classId: '', subjectId: '', dueDate: '', totalMarks: '100', passingMarks: '50', createdByTeacherId: '' })} className="rounded-xl border border-[#e0e5e5] px-3 py-1.5 text-xs font-semibold text-[#1a1c1c] hover:bg-white">
                Cancel Edit
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" placeholder="Exam title" value={examForm.title} onChange={(e) => setExamForm((f) => ({ ...f, title: e.target.value }))} required />

            <select className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" value={examForm.examType} onChange={(e) => setExamForm((f) => ({ ...f, examType: e.target.value }))}>
              {EXAM_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>

            <select className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" value={examForm.classId} onChange={(e) => setExamForm((f) => ({ ...f, classId: e.target.value, subjectId: '' }))} required>
              <option value="">Select Class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
            </select>

            <select className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" value={examForm.subjectId} onChange={(e) => setExamForm((f) => ({ ...f, subjectId: e.target.value }))} required>
              <option value="">Select Subject</option>
              {filteredSubjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>

            <input className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" type="date" value={examForm.dueDate} onChange={(e) => setExamForm((f) => ({ ...f, dueDate: e.target.value }))} required />

            <input className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" type="number" min={1} placeholder="Total marks" value={examForm.totalMarks} onChange={(e) => setExamForm((f) => ({ ...f, totalMarks: e.target.value }))} required />

            <input className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" type="number" min={0} placeholder="Passing marks" value={examForm.passingMarks} onChange={(e) => setExamForm((f) => ({ ...f, passingMarks: e.target.value }))} required />

            <select className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#004649]/20" value={examForm.createdByTeacherId} onChange={(e) => setExamForm((f) => ({ ...f, createdByTeacherId: e.target.value }))} required>
              <option value="">Teacher who added exam</option>
              {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.user.fullName}</option>)}
            </select>
          </div>

          <button disabled={examSaving} className="mt-3 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {examSaving ? 'Saving...' : examForm.id ? 'Update Exam' : 'Add Exam'}
          </button>
        </form>

        {message ? (
          <p className={`mt-3 text-sm ${message.toLowerCase().includes('unable') || message.toLowerCase().includes('error') ? 'text-[#ba1a1a]' : 'text-[#004649]'}`}>
            {message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-6">
          <h3 className="font-headline font-semibold text-[#1a1c1c] mb-4">Classes</h3>
          <div className="space-y-2">
            {classes.map((item) => (
              <div key={item.id} className="rounded-xl bg-[#f3f4f5] px-4 py-3">
                <p className="font-semibold text-[#1a1c1c]">{item.name} - {item.section}</p>
                <p className="text-xs text-[#6f7979] mt-0.5">Year: {item.academicYear} | Room: {item.roomNo ?? '-'} | Students: {item._count?.students ?? 0} | Subjects: {item._count?.subjects ?? 0}</p>
              </div>
            ))}
            {classes.length === 0 ? <p className="text-sm text-[#6f7979]">No classes created yet.</p> : null}
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-6">
          <h3 className="font-headline font-semibold text-[#1a1c1c] mb-4">Subjects</h3>
          <div className="space-y-2">
            {subjects.map((item) => (
              <div key={item.id} className="rounded-xl bg-[#f3f4f5] px-4 py-3">
                <p className="font-semibold text-[#1a1c1c]">{item.name} ({item.code})</p>
                <p className="text-xs text-[#6f7979] mt-0.5">Class: {item.class ? `${item.class.name} - ${item.class.section}` : '-'} | Teacher: {item.teacher?.user.fullName ?? 'Unassigned'}</p>
              </div>
            ))}
            {subjects.length === 0 ? <p className="text-sm text-[#6f7979]">No subjects created yet.</p> : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-6">
        <h3 className="font-headline font-semibold text-[#1a1c1c] mb-4">Exam List</h3>
        {exams.length === 0 ? (
          <p className="text-sm text-[#6f7979]">No exams created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-[#e2e8e8]">
                  <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Title</th>
                  <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Exam Type</th>
                  <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Class</th>
                  <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Subject</th>
                  <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Due Date</th>
                  <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Teacher</th>
                  <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Marks</th>
                  <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8e8]">
                {exams.map((exam) => (
                  <tr key={exam.id}>
                    <td className="py-3 font-medium text-[#1a1c1c]">{exam.title}</td>
                    <td className="py-3 text-[#6f7979]">{exam.examType ?? 'Custom'}</td>
                    <td className="py-3 text-[#6f7979]">{exam.class.name} - {exam.class.section}</td>
                    <td className="py-3 text-[#6f7979]">{exam.subject.name}</td>
                    <td className="py-3 text-[#6f7979]">{new Date(exam.dueDate ?? exam.examDate).toISOString().slice(0, 10)}</td>
                    <td className="py-3 text-[#1a1c1c]">{exam.teacherName ?? '-'}</td>
                    <td className="py-3 text-[#1a1c1c]">{exam.passingMarks}/{exam.totalMarks}</td>
                    <td className="py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button type="button" onClick={() => editExam(exam)} className="rounded-xl border border-[#e0e5e5] px-3 py-1.5 text-xs font-semibold text-[#1a1c1c] hover:bg-[#f3f4f5]">Edit</button>
                        <button type="button" onClick={() => void removeExam(exam.id)} className="rounded-xl border border-[#f3b3b3] px-3 py-1.5 text-xs font-semibold text-[#ba1a1a] hover:bg-[#fde8e8]">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
