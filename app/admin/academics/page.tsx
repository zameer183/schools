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
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h2 className="text-2xl font-bold text-[#1a1c1c]">Classes &amp; Subjects</h2>
        <p className="mt-1 text-sm text-[#6f7979]">Organize classes, sections, and subject mappings.</p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <form onSubmit={addClass} className="rounded-lg border border-[#e2e8e8] p-4">
            <h3 className="font-semibold text-[#1a1c1c] mb-3">Create Class</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649]"
                placeholder="Class Name (e.g. Grade 10)"
                value={classForm.name}
                onChange={(e) => setClassForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <input
                className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649]"
                placeholder="Section (e.g. B)"
                value={classForm.section}
                onChange={(e) => setClassForm((f) => ({ ...f, section: e.target.value }))}
                required
              />
              <input
                className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649]"
                placeholder="Academic Year (2026-27)"
                value={classForm.academicYear}
                onChange={(e) => setClassForm((f) => ({ ...f, academicYear: e.target.value }))}
                required
              />
              <input
                className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649]"
                placeholder="Room (optional)"
                value={classForm.roomNo}
                onChange={(e) => setClassForm((f) => ({ ...f, roomNo: e.target.value }))}
              />
            </div>
            <button className="mt-3 rounded-lg bg-[#004649] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005a5e]">
              Add Class
            </button>
          </form>

          <form onSubmit={addSubject} className="rounded-lg border border-[#e2e8e8] p-4">
            <h3 className="font-semibold text-[#1a1c1c] mb-3">Create Subject</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649]"
                placeholder="Subject Name"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <input
                className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649]"
                placeholder="Code (e.g. PHY-10)"
                value={subjectForm.code}
                onChange={(e) => setSubjectForm((f) => ({ ...f, code: e.target.value }))}
                required
              />
              <select
                className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649]"
                value={subjectForm.classId}
                onChange={(e) => setSubjectForm((f) => ({ ...f, classId: e.target.value }))}
                required
              >
                <option value="">Select Class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
              </select>
              <select
                className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649]"
                value={subjectForm.teacherId}
                onChange={(e) => setSubjectForm((f) => ({ ...f, teacherId: e.target.value }))}
              >
                <option value="">Assign Teacher (optional)</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.user.fullName}</option>)}
              </select>
              <input
                className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649] sm:col-span-2"
                type="number"
                min={1}
                value={subjectForm.creditHours}
                onChange={(e) => setSubjectForm((f) => ({ ...f, creditHours: Number(e.target.value) }))}
              />
            </div>
            <button className="mt-3 rounded-lg bg-[#004649] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005a5e]">
              Add Subject
            </button>
          </form>
        </div>
        {message ? (
          <p className={`mt-3 text-sm ${message.toLowerCase().includes('error') || message.includes('Unable') ? 'text-[#ba1a1a]' : 'text-[#004649]'}`}>
            {message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <h3 className="font-semibold text-[#1a1c1c] mb-4">Classes</h3>
          <div className="space-y-2">
            {classes.map((item) => (
              <div key={item.id} className="rounded-lg bg-[#f5f7f5] px-4 py-3">
                <p className="font-semibold text-[#1a1c1c]">{item.name} - {item.section}</p>
                <p className="text-xs text-[#6f7979] mt-0.5">
                  Year: {item.academicYear} | Room: {item.roomNo ?? '-'} | Students: {item.students?.length ?? 0} | Subjects: {item.subjects?.length ?? 0}
                </p>
              </div>
            ))}
            {classes.length === 0 ? <p className="text-sm text-[#6f7979]">No classes created yet.</p> : null}
          </div>
        </div>

        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <h3 className="font-semibold text-[#1a1c1c] mb-4">Subjects</h3>
          <div className="space-y-2">
            {subjects.map((item) => (
              <div key={item.id} className="rounded-lg bg-[#f5f7f5] px-4 py-3">
                <p className="font-semibold text-[#1a1c1c]">{item.name} ({item.code})</p>
                <p className="text-xs text-[#6f7979] mt-0.5">
                  Class: {item.class ? `${item.class.name} - ${item.class.section}` : '-'} | Teacher: {item.teacher?.user.fullName ?? 'Unassigned'}
                </p>
              </div>
            ))}
            {subjects.length === 0 ? <p className="text-sm text-[#6f7979]">No subjects created yet.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
