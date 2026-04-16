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
    <div className="space-y-5">
      <section className="rounded-[24px] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
        <h2 className="font-headline text-4xl font-extrabold text-[#0f1f3a]">Add Teacher</h2>
        <p className="mt-1 text-base text-[#3f536c]">Create teacher/staff account from admin panel.</p>

        <form onSubmit={createTeacher} className="mt-5 grid gap-3 md:grid-cols-2">
          <input className="h-11 rounded-xl border border-[#c4d0db] px-3" placeholder="Full name" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
          <input className="h-11 rounded-xl border border-[#c4d0db] px-3" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          <input className="h-11 rounded-xl border border-[#c4d0db] px-3" placeholder="Employee code" value={form.employeeCode} onChange={(e) => setForm((f) => ({ ...f, employeeCode: e.target.value }))} required />
          <input className="h-11 rounded-xl border border-[#c4d0db] px-3" placeholder="Qualification" value={form.qualification} onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))} />
          <input className="h-11 rounded-xl border border-[#c4d0db] px-3" placeholder="Specialization" value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))} />
          <input className="h-11 rounded-xl border border-[#c4d0db] px-3" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
          <button disabled={saving} className="h-11 w-fit rounded-xl bg-[#0f5954] px-5 font-semibold text-white md:col-span-2">{saving ? 'Adding...' : 'Add Teacher'}</button>
        </form>
        {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      </section>

      <section className="rounded-[24px] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
        <h3 className="font-headline text-4xl font-bold text-[#0f1f3a]">Teacher List</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f6f8] text-[#34495e]">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">Name</th>
                <th className="px-3 py-3 text-left font-semibold">Email</th>
                <th className="px-3 py-3 text-left font-semibold">Employee Code</th>
                <th className="px-3 py-3 text-left font-semibold">Specialization</th>
                <th className="px-3 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-semibold text-[#1a1c1c]">{teacher.user.fullName}</td>
                  <td className="px-3 py-3 text-[#596364]">{teacher.user.email}</td>
                  <td className="px-3 py-3">{teacher.employeeCode}</td>
                  <td className="px-3 py-3">{teacher.specialization || '-'}</td>
                  <td className="px-3 py-3">
                    <button onClick={() => removeTeacher(teacher.id)} className="rounded-lg border border-rose-300 px-3 py-1 text-rose-700 hover:bg-rose-50">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading ? <p className="mt-4 text-sm text-[#596364]">Loading...</p> : null}
          {!loading && teachers.length === 0 ? <p className="mt-4 text-sm text-[#596364]">No teachers available.</p> : null}
        </div>
      </section>
    </div>
  );
}
