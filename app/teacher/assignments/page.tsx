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
      <div className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Assignments</h2>
        <p className="mt-2 text-[#5c6668]">Create and manage assignments for your classes.</p>

        <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
          <input
            className="h-11 rounded-xl border border-[#c0c8c9] bg-[#f9fafa] px-3 text-sm text-[#1a1c1c] placeholder:text-[#6e7778] focus:border-[#004649] focus:outline-none"
            placeholder="Assignment title"
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            required
          />
          <input
            className="h-11 rounded-xl border border-[#c0c8c9] bg-[#f9fafa] px-3 text-sm text-[#1a1c1c] focus:border-[#004649] focus:outline-none"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((s) => ({ ...s, dueDate: e.target.value }))}
            required
          />
          <textarea
            className="min-h-28 rounded-xl border border-[#c0c8c9] bg-[#f9fafa] p-3 text-sm text-[#1a1c1c] placeholder:text-[#6e7778] focus:border-[#004649] focus:outline-none md:col-span-2"
            placeholder="Assignment description"
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            required
          />
          <select
            className="h-11 rounded-xl border border-[#c0c8c9] bg-[#f9fafa] px-3 text-sm text-[#1a1c1c] focus:border-[#004649] focus:outline-none"
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
            className="h-11 rounded-xl border border-[#c0c8c9] bg-[#f9fafa] px-3 text-sm text-[#1a1c1c] focus:border-[#004649] focus:outline-none"
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
            className="h-11 rounded-xl border border-[#c0c8c9] bg-[#f9fafa] px-3 text-sm text-[#1a1c1c] focus:border-[#004649] focus:outline-none"
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
              className="h-11 rounded-xl bg-[#004649] px-6 font-semibold text-white hover:bg-[#005a5e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Publishing...' : 'Publish Assignment'}
            </button>
          </div>
        </form>

        {message ? <p className="mt-3 rounded-xl bg-[#f3f4f3] px-4 py-3 text-sm text-[#1a1c1c]">{message}</p> : null}
      </div>

      <div className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
        <h3 className="font-semibold text-[#1a1c1c]">Published Assignments</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
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
                  <td className="px-3 py-3 font-semibold text-[#004649]">{assignment.submissions.length}</td>
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
