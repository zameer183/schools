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
  submissions: { id: string }[];
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
        fetch('/api/classes', { cache: 'no-store' }),
        fetch('/api/subjects', { cache: 'no-store' })
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

      const defaultClassId = selectedClassId || classList[0]?.id || '';
      setSelectedClassId(defaultClassId);
      setForm((prev) => ({ ...prev, classId: prev.classId || defaultClassId }));

      if (defaultClassId) {
        const assRes = await fetch(`/api/assignments?classId=${defaultClassId}`, { cache: 'no-store' });
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
  }, [selectedClassId]);

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

    const assRes = await fetch(`/api/assignments?classId=${classId}`, { cache: 'no-store' });
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
      await refreshAssignments(form.classId);
    } catch {
      setMessage('Request failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h2 className="font-headline text-4xl font-extrabold tracking-tight text-slate-900">Assignments</h2>
        <p className="mt-2 text-slate-600">Create and manage assignments for your classes.</p>

        <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
          <input
            className="h-11 rounded-xl border border-slate-300 px-3"
            placeholder="Assignment title"
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            required
          />
          <input
            className="h-11 rounded-xl border border-slate-300 px-3"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((s) => ({ ...s, dueDate: e.target.value }))}
            required
          />
          <textarea
            className="min-h-28 rounded-xl border border-slate-300 p-3 md:col-span-2"
            placeholder="Assignment description"
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            required
          />
          <select
            className="h-11 rounded-xl border border-slate-300 px-3"
            value={form.classId}
            onChange={(e) => {
              const classId = e.target.value;
              setForm((s) => ({ ...s, classId, subjectId: '' }));
              setSelectedClassId(classId);
              refreshAssignments(classId);
            }}
            required
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
            ))}
          </select>
          <select
            className="h-11 rounded-xl border border-slate-300 px-3"
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
            className="h-11 rounded-xl border border-slate-300 px-3"
            type="number"
            min={1}
            max={1000}
            value={form.maxMarks}
            onChange={(e) => setForm((s) => ({ ...s, maxMarks: e.target.value }))}
            required
          />
          <div className="md:col-span-2">
            <button
              disabled={saving || loading}
              className="h-11 rounded-xl bg-[#0f5954] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Publishing...' : 'Publish Assignment'}
            </button>
          </div>
        </form>

        {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h3 className="font-headline text-2xl font-bold text-slate-900">Published Assignments</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Class</th>
                <th className="px-3 py-2 text-left">Subject</th>
                <th className="px-3 py-2 text-left">Due Date</th>
                <th className="px-3 py-2 text-left">Submissions</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{assignment.title}</td>
                  <td className="px-3 py-2">{assignment.class.name} - {assignment.class.section}</td>
                  <td className="px-3 py-2">{assignment.subject.name}</td>
                  <td className="px-3 py-2">{new Date(assignment.dueDate).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{assignment.submissions.length}</td>
                  <td className="px-3 py-2">{assignment.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {assignments.length === 0 ? <p className="mt-4 text-sm text-slate-600">No assignments in this class yet.</p> : null}
      </div>
    </div>
  );
}
