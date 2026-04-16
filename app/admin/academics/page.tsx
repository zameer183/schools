'use client';

import { useEffect, useState } from 'react';

type ClassItem = { id: string; name: string; section: string; roomNo?: string | null; academicYear: string; students?: { id: string }[]; subjects?: { id: string }[] };
type TeacherItem = { id: string; user: { fullName: string } };
type SubjectItem = {
  id: string;
  name: string;
  code: string;
  class?: { name: string; section: string } | null;
  teacher?: { user: { fullName: string } } | null;
};

export default function AdminAcademicsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [message, setMessage] = useState('');

  const [classForm, setClassForm] = useState({ name: '', section: '', roomNo: '', academicYear: '2026' });
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', classId: '', teacherId: '', creditHours: 3 });

  const load = async () => {
    const [classesRes, subjectsRes, teachersRes] = await Promise.all([
      fetch('/api/classes'),
      fetch('/api/subjects'),
      fetch('/api/teachers')
    ]);
    setClasses(classesRes.ok ? await classesRes.json() : []);
    setSubjects(subjectsRes.ok ? await subjectsRes.json() : []);
    setTeachers(teachersRes.ok ? await teachersRes.json() : []);
  };

  useEffect(() => {
    load();
  }, []);

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
    await load();
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
    await load();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
        <h2 className="font-headline text-4xl font-extrabold text-[#0f1f3a]">Classes & Subjects</h2>
        <p className="mt-1 text-base text-[#3f536c]">Organize classes, sections, and subject mappings.</p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <form onSubmit={addClass} className="rounded-2xl border border-[#d4dee7] p-4">
            <h3 className="mb-3 text-3xl font-bold text-[#0f1f3a]">Create Class</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <input className="h-11 rounded-xl border border-[#c4d0db] px-3" placeholder="Class Name (e.g. Grade 10)" value={classForm.name} onChange={(e) => setClassForm((f) => ({ ...f, name: e.target.value }))} required />
              <input className="h-11 rounded-xl border border-[#c4d0db] px-3" placeholder="Section (e.g. B)" value={classForm.section} onChange={(e) => setClassForm((f) => ({ ...f, section: e.target.value }))} required />
              <input className="h-11 rounded-xl border border-[#c4d0db] px-3" placeholder="Academic Year (2026-27)" value={classForm.academicYear} onChange={(e) => setClassForm((f) => ({ ...f, academicYear: e.target.value }))} required />
              <input className="h-11 rounded-xl border border-[#c4d0db] px-3" placeholder="Room (optional)" value={classForm.roomNo} onChange={(e) => setClassForm((f) => ({ ...f, roomNo: e.target.value }))} />
            </div>
            <button className="mt-4 h-11 rounded-xl bg-[#0f5954] px-5 font-semibold text-white">Add Class</button>
          </form>

          <form onSubmit={addSubject} className="rounded-2xl border border-[#d4dee7] p-4">
            <h3 className="mb-3 text-3xl font-bold text-[#0f1f3a]">Create Subject</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <input className="h-11 rounded-xl border border-[#c4d0db] px-3" placeholder="Subject Name" value={subjectForm.name} onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))} required />
              <input className="h-11 rounded-xl border border-[#c4d0db] px-3" placeholder="Code (e.g. PHY-10)" value={subjectForm.code} onChange={(e) => setSubjectForm((f) => ({ ...f, code: e.target.value }))} required />
              <select className="h-11 rounded-xl border border-[#c4d0db] px-3" value={subjectForm.classId} onChange={(e) => setSubjectForm((f) => ({ ...f, classId: e.target.value }))} required>
                <option value="">Select Class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
              </select>
              <select className="h-11 rounded-xl border border-[#c4d0db] px-3" value={subjectForm.teacherId} onChange={(e) => setSubjectForm((f) => ({ ...f, teacherId: e.target.value }))}>
                <option value="">Assign Teacher (optional)</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.user.fullName}</option>)}
              </select>
              <input className="h-11 rounded-xl border border-[#c4d0db] px-3 md:col-span-2" type="number" min={1} value={subjectForm.creditHours} onChange={(e) => setSubjectForm((f) => ({ ...f, creditHours: Number(e.target.value) }))} />
            </div>
            <button className="mt-4 h-11 rounded-xl bg-[#0f5954] px-5 font-semibold text-white">Add Subject</button>
          </form>
        </div>
        {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] bg-white p-5 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
          <h3 className="text-4xl font-bold text-[#0f1f3a]">Classes</h3>
          <div className="mt-4 space-y-3">
            {classes.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[#d4dee7] p-4">
                <p className="text-2xl font-semibold text-[#0f1f3a]">{item.name} - {item.section}</p>
                <p className="text-sm text-[#3f536c]">Year: {item.academicYear} | Room: {item.roomNo ?? '-'}</p>
              </article>
            ))}
            {classes.length === 0 ? <p className="text-sm text-[#596364]">No classes created yet.</p> : null}
          </div>
        </div>

        <div className="rounded-[24px] bg-white p-5 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
          <h3 className="text-4xl font-bold text-[#0f1f3a]">Subjects</h3>
          <div className="mt-4 space-y-3">
            {subjects.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[#d4dee7] p-4">
                <p className="text-2xl font-semibold text-[#0f1f3a]">{item.name} ({item.code})</p>
                <p className="text-sm text-[#3f536c]">Class: {item.class ? `${item.class.name} - ${item.class.section}` : '-'} </p>
                <p className="text-sm text-[#3f536c]">Teacher: {item.teacher?.user.fullName ?? 'Unassigned'}</p>
              </article>
            ))}
            {subjects.length === 0 ? <p className="text-sm text-[#596364]">No subjects created yet.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
