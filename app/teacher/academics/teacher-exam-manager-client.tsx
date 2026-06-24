'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

type ExamClassOption = { id: string; name: string; section: string };

const EXAM_TYPES = ['One Juzz', '5 Juzz', '10 Juzz', 'Full Revision', 'Custom'] as const;

export function TeacherExamManagerClient({
  classes
}: {
  classes: ExamClassOption[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    title: '',
    examType: 'One Juzz',
    classId: classes[0]?.id ?? '',
    subjectName: '',
    dueDate: '',
    totalMarks: '100',
    passingMarks: '50'
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    const res = await fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        totalMarks: Number(form.totalMarks),
        passingMarks: Number(form.passingMarks)
      })
    });

    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setMessage(data?.error ?? 'Unable to create exam.');
      setSaving(false);
      return;
    }

    setMessage('Exam added successfully.');
    setForm((prev) => ({
      ...prev,
      title: '',
      dueDate: '',
      subjectName: ''
    }));
    setSaving(false);
    router.refresh();
  };

  const fieldBase =
    'h-10 w-full rounded-lg border border-[#C0C7D1] bg-white px-3 text-sm text-[#191C1E] outline-none transition duration-200 focus:border-[#084750] focus:ring-2 focus:ring-[#084750]/10';
  const selectFieldBase = `${fieldBase} appearance-none pr-10`;
  const labelBase =
    'mb-1.5 block text-xs font-medium text-[#40474F]';

  return (
    <div className="overflow-hidden rounded-lg border border-[#E6E8EA] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_6px_rgba(15,23,42,0.05)]">
      <h3 className="text-2xl font-semibold text-[#084750]">Create Exam</h3>
      <p className="mt-1 text-sm leading-snug text-[#191C1E]">Design your exam setup for assigned classes.</p>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <section className="space-y-3">
          <p className="border-b border-[#E0E3E5] pb-2 text-sm font-bold text-[#191C1E]">Exam Details</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 min-w-0">
              <div>
                <label className={labelBase}>Exam Title</label>
                <input
                  className={fieldBase}
                  placeholder="e.g., Mid-Term Assessment"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="min-w-0">
              <div>
                <label className={labelBase}>Program</label>
                <select
                  className={selectFieldBase}
                  value={form.examType}
                  onChange={(e) => setForm((prev) => ({ ...prev, examType: e.target.value }))}
                >
                  {EXAM_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="min-w-0">
              <div>
                <label className={labelBase}>Class</label>
                <select
                  className={selectFieldBase}
                  value={form.classId}
                  onChange={(e) => setForm((prev) => ({ ...prev, classId: e.target.value }))}
                  required
                >
                  <option value="">Select class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - {cls.section}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-2 min-w-0">
              <div>
                <label className={labelBase}>Subject (optional)</label>
                <input
                  className={fieldBase}
                  value={form.subjectName}
                  onChange={(e) => setForm((prev) => ({ ...prev, subjectName: e.target.value }))}
                  placeholder="Type any subject name"
                />
              </div>
            </div>

            <div className="sm:col-span-2 min-w-0">
              <div>
                <label className={labelBase}>Date</label>
                <input
                  className={fieldBase}
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <p className="border-b border-[#E0E3E5] pb-2 text-sm font-bold text-[#191C1E]">Marks Configuration</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <div>
                <label className={labelBase}>Total Marks</label>
                <input
                  className={fieldBase}
                  type="number"
                  min={1}
                  value={form.totalMarks}
                  onChange={(e) => setForm((prev) => ({ ...prev, totalMarks: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="min-w-0">
              <div>
                <label className={labelBase}>Passing Marks</label>
                <input
                  className={fieldBase}
                  type="number"
                  min={0}
                  value={form.passingMarks}
                  onChange={(e) => setForm((prev) => ({ ...prev, passingMarks: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>
        </section>

        <button
          disabled={saving}
          className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#084750] text-sm font-bold text-white shadow-[0_10px_20px_rgba(8,71,80,0.22)] transition duration-200 active:scale-95 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {saving ? 'Saving...' : 'Create Exam'}
        </button>
      </form>

      {message ? <p className="mt-3 text-sm text-[#084750]">{message}</p> : null}
    </div>
  );
}
