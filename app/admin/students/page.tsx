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
    <div className="space-y-5">
      <section className="rounded-[24px] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
        <h2 className="font-headline text-4xl font-extrabold text-[#0f1f3a]">Add Student</h2>
        <p className="mt-1 text-base text-[#3f536c]">Create new student account and admission profile.</p>

        <form onSubmit={createStudent} className="mt-5 grid gap-3 md:grid-cols-2">
          <input className="h-11 rounded-xl border border-[#c4d0db] px-3" placeholder="Full name" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
          <input className="h-11 rounded-xl border border-[#c4d0db] px-3" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          <input className="h-11 rounded-xl border border-[#c4d0db] px-3" placeholder="Admission number" value={form.admissionNo} onChange={(e) => setForm((f) => ({ ...f, admissionNo: e.target.value }))} required />
          <input className="h-11 rounded-xl border border-[#c4d0db] px-3" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <input className="h-11 rounded-xl border border-[#c4d0db] px-3" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
          <select className="h-11 rounded-xl border border-[#c4d0db] px-3" value={form.classId} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}>
            <option value="">Select class (optional)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
            ))}
          </select>
          <button disabled={saving} className="h-11 w-fit rounded-xl bg-[#0f5954] px-5 font-semibold text-white md:col-span-2">{saving ? 'Adding...' : 'Add Student'}</button>
        </form>
        {message ? <p className="mt-3 text-sm text-[#5c6668]">{message}</p> : null}
      </section>

      <section className="rounded-[24px] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
        <h3 className="font-headline text-4xl font-bold text-[#0f1f3a]">Student List</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f6f8] text-[#34495e]">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">Name</th>
                <th className="px-3 py-3 text-left font-semibold">Email</th>
                <th className="px-3 py-3 text-left font-semibold">Admission #</th>
                <th className="px-3 py-3 text-left font-semibold">Class</th>
                <th className="px-3 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-semibold text-[#1a1c1c]">{s.user.fullName}</td>
                  <td className="px-3 py-3 text-[#596364]">{s.user.email}</td>
                  <td className="px-3 py-3">{s.admissionNo}</td>
                  <td className="px-3 py-3">{s.class ? `${s.class.name} - ${s.class.section}` : '-'}</td>
                  <td className="px-3 py-3">
                    <button onClick={() => removeStudent(s.id)} className="rounded-lg border border-rose-300 px-3 py-1 text-rose-700 hover:bg-rose-50">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading ? <p className="mt-4 text-sm text-[#596364]">Loading...</p> : null}
          {!loading && students.length === 0 ? <p className="mt-4 text-sm text-[#596364]">No students available.</p> : null}
        </div>
      </section>
    </div>
  );
}
