'use client';

import { useEffect, useState } from 'react';

type ClassItem = { id: string; name: string; section: string };
type StudentItem = {
  id: string;
  admissionNo: string;
  user: { fullName: string; email: string; phone?: string | null };
  class?: { name: string; section: string } | null;
};

const initialForm = {
  fullName: '',
  email: '',
  password: 'Pass@123',
  admissionNo: '',
  classId: '',
  phone: ''
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [studentsRes, classesRes] = await Promise.all([fetch('/api/students'), fetch('/api/classes')]);
      const studentsData = studentsRes.ok ? await studentsRes.json() : [];
      const classesData = classesRes.ok ? await classesRes.json() : [];
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setClasses(Array.isArray(classesData) ? classesData : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error ?? 'Unable to add student');
        return;
      }
      setForm(initialForm);
      setMessage('Student added successfully.');
      await load();
    } catch {
      setMessage('Network error while adding student.');
    } finally {
      setSaving(false);
    }
  };

  const removeStudent = async (id: string) => {
    setMessage('');
    const res = await fetch(`/api/students?id=${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data?.error ?? 'Unable to delete student');
      return;
    }
    setMessage('Student removed.');
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h2 className="text-2xl font-bold text-[#1a1c1c]">Students</h2>
        <p className="mt-1 text-sm text-[#6f7979]">Enroll, update, and manage learners.</p>

        <form onSubmit={createStudent} className="mt-5 grid gap-3 sm:grid-cols-2">
          <input
            className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649] focus:ring-1 focus:ring-[#004649]"
            placeholder="Full name"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            required
          />
          <input
            className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649] focus:ring-1 focus:ring-[#004649]"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <input
            className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649] focus:ring-1 focus:ring-[#004649]"
            placeholder="Admission number"
            value={form.admissionNo}
            onChange={(e) => setForm((f) => ({ ...f, admissionNo: e.target.value }))}
            required
          />
          <input
            className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649] focus:ring-1 focus:ring-[#004649]"
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649] focus:ring-1 focus:ring-[#004649]"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
          />
          <select
            className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649] focus:ring-1 focus:ring-[#004649]"
            value={form.classId}
            onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
          >
            <option value="">Select class (optional)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
            ))}
          </select>
          <div className="sm:col-span-2">
            <button
              disabled={saving}
              className="rounded-lg bg-[#004649] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#005a5e] disabled:opacity-60"
            >
              {saving ? 'Adding...' : 'Add Student'}
            </button>
            {message ? (
              <span className={`ml-3 text-sm ${message.includes('success') ? 'text-[#004649]' : 'text-[#ba1a1a]'}`}>
                {message}
              </span>
            ) : null}
          </div>
        </form>
      </div>

      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h3 className="font-semibold text-[#1a1c1c] mb-4">Student List</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8e8]">
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Name</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Email</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Admission #</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Class</th>
                <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8e8]">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="py-3 font-medium text-[#1a1c1c]">{s.user.fullName}</td>
                  <td className="py-3 text-[#6f7979]">{s.user.email}</td>
                  <td className="py-3 text-[#6f7979]">{s.admissionNo}</td>
                  <td className="py-3 text-[#6f7979]">{s.class ? `${s.class.name} - ${s.class.section}` : '-'}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => removeStudent(s.id)}
                      className="rounded-lg border border-[#fca5a5] px-3 py-1 text-xs font-semibold text-[#ba1a1a] hover:bg-[#fde8e8]"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading ? <p className="mt-4 text-sm text-[#6f7979]">Loading...</p> : null}
          {!loading && students.length === 0 ? <p className="mt-4 text-sm text-[#6f7979]">No students yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
