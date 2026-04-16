'use client';

import { useEffect, useState } from 'react';

type TeacherItem = {
  id: string;
  employeeCode: string;
  qualification?: string | null;
  specialization?: string | null;
  user: { fullName: string; email: string };
};

const initialForm = {
  fullName: '',
  email: '',
  password: 'Pass@123',
  employeeCode: '',
  qualification: '',
  specialization: ''
};

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teachers');
      const data = res.ok ? await res.json() : [];
      setTeachers(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error ?? 'Unable to add teacher');
        return;
      }
      setForm(initialForm);
      setMessage('Teacher added successfully.');
      await load();
    } catch {
      setMessage('Network error while adding teacher.');
    } finally {
      setSaving(false);
    }
  };

  const removeTeacher = async (id: string) => {
    setMessage('');
    const res = await fetch(`/api/teachers?id=${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data?.error ?? 'Unable to delete teacher');
      return;
    }
    setMessage('Teacher removed.');
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Teachers</h2>
        <p className="mt-1 text-sm text-[#6f7979]">Create teacher and staff accounts from the admin panel.</p>

        <form onSubmit={createTeacher} className="mt-5 grid gap-3 sm:grid-cols-2">
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
            placeholder="Employee code"
            value={form.employeeCode}
            onChange={(e) => setForm((f) => ({ ...f, employeeCode: e.target.value }))}
            required
          />
          <input
            className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649] focus:ring-1 focus:ring-[#004649]"
            placeholder="Qualification"
            value={form.qualification}
            onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649] focus:ring-1 focus:ring-[#004649]"
            placeholder="Specialization"
            value={form.specialization}
            onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649] focus:ring-1 focus:ring-[#004649]"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
          />
          <div className="sm:col-span-2">
            <button
              disabled={saving}
              className="rounded-lg bg-[#004649] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#005a5e] disabled:opacity-60"
            >
              {saving ? 'Adding...' : 'Add Teacher'}
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
        <h3 className="font-semibold text-[#1a1c1c] mb-4">Teacher List</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8e8]">
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Name</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Email</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Employee Code</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Specialization</th>
                <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8e8]">
              {teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td className="py-3 font-medium text-[#1a1c1c]">{teacher.user.fullName}</td>
                  <td className="py-3 text-[#6f7979]">{teacher.user.email}</td>
                  <td className="py-3 text-[#6f7979]">{teacher.employeeCode}</td>
                  <td className="py-3 text-[#6f7979]">{teacher.specialization || '-'}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => removeTeacher(teacher.id)}
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
          {!loading && teachers.length === 0 ? <p className="mt-4 text-sm text-[#6f7979]">No teachers yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
