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

const DEPT_MAP: Record<string, string> = {
  'Math': 'SCIENCE DEPT',
  'Science': 'SCIENCE DEPT',
  'Physics': 'SCIENCE DEPT',
  'Chemistry': 'SCIENCE DEPT',
  'Biology': 'SCIENCE DEPT',
  'English': 'FACULTY OF ARTS',
  'History': 'FACULTY OF ARTS',
  'Geography': 'FACULTY OF ARTS',
  'Art': 'FACULTY OF ARTS',
  'Music': 'FACULTY OF ARTS',
};

function getDept(spec?: string | null) {
  if (!spec) return 'REGISTRAR OFFICE';
  for (const [key, val] of Object.entries(DEPT_MAP)) {
    if (spec.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return 'REGISTRAR OFFICE';
}

function getTitle(qual?: string | null) {
  if (!qual) return 'Lead Administrator';
  const q = qual.toLowerCase();
  if (q.includes('phd') || q.includes('doctorate')) return 'Head of Department';
  if (q.includes('prof') || q.includes('msc')) return 'Senior Lecturer';
  if (q.includes('ma') || q.includes('mba')) return 'Associate Researcher';
  return 'Senior Lecturer';
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

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

  useEffect(() => { load(); }, []);

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
      if (res.ok) {
        setMessage('Teacher added successfully.');
        setForm(initialForm);
        setShowForm(false);
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error ?? 'Failed to add teacher.');
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = teachers.filter((t) =>
    !search || t.user.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (t.specialization ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const avatarColors = ['bg-[#004649]/10 text-[#004649]', 'bg-[#865300]/10 text-[#865300]', 'bg-[#1565c0]/10 text-[#1565c0]', 'bg-[#ba1a1a]/10 text-[#ba1a1a]'];

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-[#1a1c1c] sm:text-3xl">Staff Management</h2>
            <p className="mt-1 text-sm text-[#6f7979]">Managing {teachers.length} distinguished faculty and administrative members.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-xl bg-[#004649] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
            </svg>
            Add Teacher
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-[#f5f7f5] px-3 py-2.5">
            <svg className="h-4 w-4 text-[#6f7979] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, role..."
              className="bg-transparent text-sm text-[#1a1c1c] placeholder:text-[#6f7979] outline-none flex-1"
            />
          </div>
          <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e2e8e8] px-4 py-2.5 text-sm font-semibold text-[#1a1c1c] hover:bg-[#f5f7f5] transition sm:w-auto">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            Filters
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <h3 className="font-bold text-[#1a1c1c] mb-4">Add New Teacher</h3>
          <form onSubmit={createTeacher} className="grid gap-3 sm:grid-cols-2">
            {[
              { name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'Dr. Jane Smith' },
              { name: 'email', label: 'Email Address', type: 'email', placeholder: 'jane@school.edu' },
              { name: 'password', label: 'Initial Password', type: 'text', placeholder: 'Pass@123' },
              { name: 'employeeCode', label: 'Employee Code', type: 'text', placeholder: 'EMP-001' },
              { name: 'qualification', label: 'Qualification', type: 'text', placeholder: 'PhD Mathematics' },
              { name: 'specialization', label: 'Specialization', type: 'text', placeholder: 'Advanced Mathematics' },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-1">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                  placeholder={field.placeholder}
                  required={field.name !== 'qualification' && field.name !== 'specialization'}
                  className="h-10 w-full rounded-xl bg-[#f5f7f5] px-3 text-sm text-[#1a1c1c] placeholder:text-[#6f7979]/60 outline-none"
                />
              </div>
            ))}
            <div className="sm:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button type="submit" disabled={saving} className="w-full rounded-xl bg-[#004649] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50 sm:w-auto">
                {saving ? 'Adding...' : 'Add Teacher'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="w-full rounded-xl border border-[#e2e8e8] px-6 py-2.5 text-sm font-semibold text-[#1a1c1c] hover:bg-[#f5f7f5] sm:w-auto">Cancel</button>
              {message && <p className="text-sm text-[#004649]">{message}</p>}
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-12 text-center">
          <p className="text-sm text-[#6f7979]">Loading staff members...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-12 text-center">
          <p className="font-semibold text-[#1a1c1c]">{search ? 'No results found' : 'No teachers yet'}</p>
          <p className="text-sm text-[#6f7979] mt-1">{search ? 'Try a different search term.' : 'Add your first teacher using the button above.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((teacher, i) => {
            const dept = getDept(teacher.specialization);
            const title = getTitle(teacher.qualification);
            const isActive = i % 5 !== 3;
            const colorClass = avatarColors[i % avatarColors.length];

            return (
              <div key={teacher.id} className="rounded-xl bg-white border border-[#e2e8e8] overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-28 bg-gradient-to-br from-[#f5f7f5] to-[#e8f0f0] flex items-end justify-between px-4 pb-0">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold border-2 border-white shadow-sm translate-y-8 ${colorClass}`}>
                    {initials(teacher.user.fullName)}
                  </div>
                  <div className="translate-y-2">
                    <button className="p-1 text-[#6f7979] hover:text-[#1a1c1c]">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="px-4 pt-10 pb-4">
                  {isActive && (
                    <span className="inline-block text-[9px] font-bold uppercase tracking-wider bg-[#e8f5e9] text-[#004649] px-2 py-0.5 rounded-full mb-2">Active</span>
                  )}
                  <h3 className="font-bold text-[#1a1c1c] leading-tight">{teacher.user.fullName}</h3>
                  <p className="text-xs text-[#6f7979] mt-0.5">{title}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <svg className="h-3.5 w-3.5 text-[#6f7979] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                    </svg>
                    <p className="text-[10px] text-[#6f7979] uppercase tracking-widest font-semibold">{dept}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button className="flex items-center gap-1.5 rounded-lg bg-[#004649] px-3 py-1.5 text-[10px] font-bold text-white hover:opacity-90 transition">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                      </svg>
                      Message
                    </button>
                    <button className="text-[10px] font-bold text-[#1a1c1c] px-2 py-1.5 hover:bg-[#f5f7f5] rounded-lg transition">Edit</button>
                    <button className="text-[10px] font-bold text-[#1a1c1c] px-2 py-1.5 hover:bg-[#f5f7f5] rounded-lg transition">Profile</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
