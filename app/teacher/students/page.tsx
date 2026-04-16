'use client';

import { useCallback, useEffect, useState } from 'react';

type ClassItem = { id: string; name: string; section: string };
type StudentItem = {
  id: string;
  admissionNo: string;
  currentAddress: string | null;
  emergencyContact: string | null;
  user: { fullName: string; email: string };
  class: null | { name: string; section: string };
};

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: 'Pass@123',
    admissionNo: '',
    classId: '',
    phone: ''
  });

  const loadData = useCallback(async () => {
    try {
      const [studentsRes, classesRes] = await Promise.all([
        fetch('/api/students', { cache: 'no-store' }),
        fetch('/api/classes', { cache: 'no-store' })
      ]);

      const studentsJson = await studentsRes.json();
      const classesJson = await classesRes.json();

      setStudents(Array.isArray(studentsJson) ? studentsJson : []);
      const classList = Array.isArray(classesJson) ? classesJson : [];
      setClasses(classList);

      if (!form.classId && classList[0]?.id) {
        setForm((prev) => ({ ...prev, classId: classList[0].id }));
      }
    } catch {
      setMessage('Failed to load class student data.');
    }
  }, [form.classId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          admissionNo: form.admissionNo,
          classId: form.classId,
          phone: form.phone || undefined
        })
      });

      const json = await res.json();
      if (!res.ok) {
        setMessage(typeof json?.error === 'string' ? json.error : 'Unable to add student.');
        return;
      }

      setMessage('Student added to your class successfully.');
      setForm((prev) => ({
        ...prev,
        fullName: '',
        email: '',
        password: 'Pass@123',
        admissionNo: '',
        phone: ''
      }));
      await loadData();
    } catch {
      setMessage('Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h2 className="font-headline text-4xl font-extrabold tracking-tight text-slate-900">My Class Students</h2>
        <p className="mt-2 text-slate-600">Add and manage students for your assigned classes only.</p>

        <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
          <input className="h-11 rounded-xl border border-slate-300 px-3" placeholder="Full name" value={form.fullName} onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))} required />
          <input className="h-11 rounded-xl border border-slate-300 px-3" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} required />
          <input className="h-11 rounded-xl border border-slate-300 px-3" placeholder="Admission number" value={form.admissionNo} onChange={(e) => setForm((s) => ({ ...s, admissionNo: e.target.value }))} required />
          <input className="h-11 rounded-xl border border-slate-300 px-3" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
          <input className="h-11 rounded-xl border border-slate-300 px-3" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} required />
          <select className="h-11 rounded-xl border border-slate-300 px-3" value={form.classId} onChange={(e) => setForm((s) => ({ ...s, classId: e.target.value }))} required>
            <option value="">Select your class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
            ))}
          </select>
          <div className="md:col-span-2">
            <button disabled={loading || classes.length === 0} className="h-11 rounded-xl bg-[#0f5954] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'Saving...' : 'Add Student'}
            </button>
          </div>
        </form>

        {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h3 className="font-headline text-2xl font-bold text-slate-900">Students In Your Classes</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Admission #</th>
                <th className="px-3 py-2 text-left">Class</th>
                <th className="px-3 py-2 text-left">Emergency Contact</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{s.user.fullName}</td>
                  <td className="px-3 py-2">{s.user.email}</td>
                  <td className="px-3 py-2">{s.admissionNo}</td>
                  <td className="px-3 py-2">{s.class ? `${s.class.name} - ${s.class.section}` : '-'}</td>
                  <td className="px-3 py-2">{s.emergencyContact || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
