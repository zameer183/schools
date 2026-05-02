'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type ClassItem = { id: string; name: string; section: string };
type SubjectItem = { id: string; name: string; code: string; classId: string };
type AssignmentItem = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  maxMarks: number;
  class: { name: string; section: string };
  subject: { name: string };
  _count: { submissions: number };
};

export default function TeacherAssignmentsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    classId: '',
    subjectId: '',
    dueDate: '',
    maxMarks: '100'
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/subjects')
      ]);

      const classesJson = await classesRes.json();
      const subjectsJson = await subjectsRes.json();

      const classList: ClassItem[] = Array.isArray(classesJson) ? classesJson : [];
      const subjectList: SubjectItem[] = Array.isArray(subjectsJson)
        ? subjectsJson
            .filter(
              (s): s is { id: string; name: string; code: string; classId: string } =>
                typeof s?.id === 'string' &&
                typeof s?.name === 'string' &&
                typeof s?.code === 'string' &&
                typeof s?.classId === 'string'
            )
            .map((s) => ({ id: s.id, name: s.name, code: s.code, classId: s.classId }))
        : [];

      setClasses(classList);
      setSubjects(subjectList);

      const defaultClassId = classList[0]?.id || '';
      setSelectedClassId(defaultClassId);
      setForm((prev) => ({ ...prev, classId: prev.classId || defaultClassId }));

      if (defaultClassId) {
        const assRes = await fetch(`/api/assignments?classId=${defaultClassId}`);
        const assJson = await assRes.json();
        setAssignments(Array.isArray(assJson) ? assJson : []);
      } else {
        setAssignments([]);
      }
    } catch {
      setMessage('Failed to load assignments data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSubjects = useMemo(() => {
    const classId = form.classId || selectedClassId;
    if (!classId) return [];
    return subjects.filter((s) => s.classId === classId);
  }, [subjects, form.classId, selectedClassId]);

  useEffect(() => {
    if (!form.subjectId && filteredSubjects[0]?.id) {
      setForm((prev) => ({ ...prev, subjectId: filteredSubjects[0].id }));
    }
  }, [filteredSubjects, form.subjectId]);

  const refreshAssignments = async (classId: string) => {
    if (!classId) {
      setAssignments([]);
      return;
    }

    const assRes = await fetch(`/api/assignments?classId=${classId}`);
    const assJson = await assRes.json();
    setAssignments(Array.isArray(assJson) ? assJson : []);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const payload = {
        title: form.title,
        description: form.description,
        classId: form.classId,
        subjectId: form.subjectId,
        dueDate: form.dueDate,
        maxMarks: Number(form.maxMarks)
      };

      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) {
        setMessage(typeof json?.error === 'string' ? json.error : 'Unable to create assignment.');
        return;
      }

      setMessage('Assignment published successfully.');
      setForm((prev) => ({
        ...prev,
        title: '',
        description: '',
        dueDate: '',
        maxMarks: '100'
      }));
      void refreshAssignments(form.classId);
    } catch {
      setMessage('Request failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-4 sm:p-6">
        <h2 className="font-headline text-2xl sm:text-3xl font-bold text-[#1a1c1c]">Assignments</h2>
        <p className="mt-2 text-[#5c6668]">Create and manage assignments for your classes.</p>

        <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
          <input
            className="h-11 rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#1a1c1c] placeholder:text-[#6e7778] focus:ring-2 focus:ring-[#004649]/20 outline-none"
            placeholder="Assignment title"
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            required
          />
          <input
            className="h-11 rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#1a1c1c] focus:ring-2 focus:ring-[#004649]/20 outline-none"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((s) => ({ ...s, dueDate: e.target.value }))}
            required
          />
          <textarea
            className="min-h-28 rounded-xl bg-[#edeeef] border-none p-3 text-sm text-[#1a1c1c] placeholder:text-[#6e7778] focus:border-[#004649] focus:outline-none md:col-span-2"
            placeholder="Assignment description"
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            required
          />
          <select
            className="h-11 rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#1a1c1c] focus:ring-2 focus:ring-[#004649]/20 outline-none"
            value={form.classId}
            onChange={(e) => {
              const classId = e.target.value;
              setForm((s) => ({ ...s, classId, subjectId: '' }));
              setSelectedClassId(classId);
              void refreshAssignments(classId);
            }}
            required
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
            ))}
          </select>
          <select
            className="h-11 rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#1a1c1c] focus:ring-2 focus:ring-[#004649]/20 outline-none"
            value={form.subjectId}
            onChange={(e) => setForm((s) => ({ ...s, subjectId: e.target.value }))}
            required
          >
            <option value="">Select subject</option>
            {filteredSubjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
          <input
            className="h-11 rounded-xl bg-[#edeeef] border-none px-3 text-sm text-[#1a1c1c] focus:ring-2 focus:ring-[#004649]/20 outline-none"
            type="number"
            min={1}
            max={1000}
            placeholder="Max marks"
            value={form.maxMarks}
            onChange={(e) => setForm((s) => ({ ...s, maxMarks: e.target.value }))}
            required
          />
          <div className="md:col-span-2">
            <button
              disabled={saving || loading}
              className="h-11 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] shadow-[0_8px_20px_rgba(0,70,73,0.12)] active:scale-[0.98] transition-all px-6 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Publishing...' : 'Publish Assignment'}
            </button>
          </div>
        </form>

        {message ? <p className="mt-3 rounded-xl bg-[#f3f4f3] px-4 py-3 text-sm text-[#1a1c1c]">{message}</p> : null}
      </div>

      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-4 sm:p-6">
        <h3 className="font-headline font-semibold text-[#1a1c1c]">Published Assignments</h3>
        <div className="mt-4 space-y-2 md:hidden">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-xl bg-[#f3f4f5] p-3">
              <p className="text-sm font-semibold text-[#1a1c1c]">{assignment.title}</p>
              <p className="mt-1 text-xs text-[#596364]">Class: {assignment.class.name} - {assignment.class.section}</p>
              <p className="mt-1 text-xs text-[#596364]">Subject: {assignment.subject.name}</p>
              <p className="mt-1 text-xs text-[#596364]">Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
              <p className="mt-1 text-xs text-[#596364]">Submissions: {assignment._count.submissions}</p>
              <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${assignment.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : assignment.status === 'CLOSED' ? 'bg-rose-100 text-rose-700' : 'bg-[#f3f4f3] text-[#596364]'}`}>
                {assignment.status}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="hidden min-w-full text-sm md:table">
            <thead className="bg-[#f3f4f3] text-[#596364]">
              <tr>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Title</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Class</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Subject</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Due Date</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Submissions</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="border-b border-[#eef1f1]">
                  <td className="px-3 py-3 font-semibold text-[#1a1c1c]">{assignment.title}</td>
                  <td className="px-3 py-3 text-[#596364]">{assignment.class.name} - {assignment.class.section}</td>
                  <td className="px-3 py-3 text-[#596364]">{assignment.subject.name}</td>
                  <td className="px-3 py-3 text-[#596364]">{new Date(assignment.dueDate).toLocaleDateString()}</td>
                  <td className="px-3 py-3 font-semibold text-[#004649]">{assignment._count.submissions}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${assignment.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : assignment.status === 'CLOSED' ? 'bg-rose-100 text-rose-700' : 'bg-[#f3f4f3] text-[#596364]'}`}>
                      {assignment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {assignments.length === 0 ? <p className="mt-4 text-sm text-[#5c6668]">No assignments in this class yet.</p> : null}
      </div>
    </div>
  );
}
