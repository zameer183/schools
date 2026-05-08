'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader, Card } from '@/components/ui';

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
      <PageHeader
        title="Assignments"
        subtitle="Create and manage assignments for your classes."
      />

      <Card>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <input
            className="h-11 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] px-4 text-sm text-[#1F2937] placeholder:text-[#6B7280] focus:ring-2 focus:ring-[#1F5A5C]/20 outline-none"
            placeholder="Assignment title"
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            required
          />
          <input
            className="h-11 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] px-3 text-sm text-[#1F2937] focus:ring-2 focus:ring-[#1F5A5C]/20 outline-none"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((s) => ({ ...s, dueDate: e.target.value }))}
            required
          />
          <textarea
            className="min-h-28 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] p-4 text-sm text-[#1F2937] placeholder:text-[#6B7280] focus:ring-2 focus:ring-[#1F5A5C]/20 outline-none md:col-span-2"
            placeholder="Assignment description"
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            required
          />
          <select
            className="h-11 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] px-4 text-sm text-[#1F2937] focus:ring-2 focus:ring-[#1F5A5C]/20 outline-none"
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
            className="h-11 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] px-4 text-sm text-[#1F2937] focus:ring-2 focus:ring-[#1F5A5C]/20 outline-none"
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
            className="h-11 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] px-3 text-sm text-[#1F2937] focus:ring-2 focus:ring-[#1F5A5C]/20 outline-none"
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
              className="h-11 rounded-xl bg-gradient-to-br from-[#1F5A5C] to-[#2a7579] shadow-[0_8px_20px_rgba(31,90,92,0.12)] active:scale-[0.98] transition-all px-6 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Publishing...' : 'Publish Assignment'}
            </button>
          </div>
        </form>

        {message ? <p className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${message.includes('successfully') ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>{message}</p> : null}
      </Card>

      <Card>
        <h3 className="font-semibold text-[#1F2937] mb-4">Published Assignments</h3>
        <div className="space-y-2 md:hidden">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] p-4">
              <p className="text-sm font-semibold text-[#1F2937]">{assignment.title}</p>
              <p className="mt-1 text-xs text-[#6B7280]">Class: {assignment.class.name} - {assignment.class.section}</p>
              <p className="mt-1 text-xs text-[#6B7280]">Subject: {assignment.subject.name}</p>
              <p className="mt-1 text-xs text-[#6B7280]">Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
              <p className="mt-1 text-xs text-[#6B7280]">Submissions: {assignment._count.submissions}</p>
              <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-[10px] font-semibold ${assignment.status === 'PUBLISHED' ? 'bg-[#D1FAE5] text-[#065F46]' : assignment.status === 'CLOSED' ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-[#F3F4F5] text-[#6B7280]'}`}>
                {assignment.status}
              </span>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="hidden min-w-full text-sm md:table">
            <thead className="bg-[#F9FAFB] text-[#6B7280] border-b border-[#E5E7EB]">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest">Title</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest">Class</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest">Subject</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest">Due Date</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest">Submissions</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#1F2937]">{assignment.title}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{assignment.class.name} - {assignment.class.section}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{assignment.subject.name}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{new Date(assignment.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-semibold text-[#1F5A5C]">{assignment._count.submissions}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${assignment.status === 'PUBLISHED' ? 'bg-[#D1FAE5] text-[#065F46]' : assignment.status === 'CLOSED' ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-[#F3F4F5] text-[#6B7280]'}`}>
                      {assignment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {assignments.length === 0 ? <p className="mt-4 text-sm text-[#6B7280]">No assignments in this class yet.</p> : null}
      </Card>
    </div>
  );
}
