'use client';

import { useEffect, useState } from 'react';
import { Users2 } from 'lucide-react';
import { PageHeader } from '@/components/ui';

type StudentItem = {
  id: string;
  admissionNo: string;
  emergencyContact: string | null;
  user: { fullName: string; email: string };
  class: null | { name: string; section: string };
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setMessage('');
      try {
        const res = await fetch('/api/students');
        const json = await res.json();
        setStudents(Array.isArray(json) ? json : []);
      } catch {
        setMessage('Failed to load class student data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="My Students" subtitle="Students enrolled in your assigned classes." />

      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(43,103,110,0.06)] p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e0eff0]">
            <Users2 className="h-4 w-4 text-[#2b676e]" />
          </div>
          <h3 className="text-sm font-bold text-[#1a1c1c]">
            Students In Your Classes
            {students.length > 0 && (
              <span className="ml-2 rounded-full bg-[#e0eff0] px-2 py-0.5 text-xs font-bold text-[#2b676e]">
                {students.length}
              </span>
            )}
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e0eff0] border-t-[#2b676e]" />
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {students.map((s) => (
                <div key={s.id} className="flex gap-3 rounded-xl bg-[#f7fafb] p-3 border border-[#edf0f2]">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-[#e0eff0] flex items-center justify-center text-sm font-bold text-[#2b676e]">
                    {initials(s.user.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1a1c1c] truncate">{s.user.fullName}</p>
                    <p className="text-xs text-[#596364] truncate">{s.user.email}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="text-xs text-[#596364]">#{s.admissionNo}</span>
                      <span className="text-xs text-[#596364]">{s.class ? `${s.class.name} - ${s.class.section}` : '-'}</span>
                    </div>
                  </div>
                </div>
              ))}
              {students.length === 0 && !loading && (
                <p className="py-6 text-center text-sm text-[#596364]">No students found yet.</p>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f3f4f5] text-[#596364]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Student</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Email</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Admission #</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Class</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Emergency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1f1]">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-[#f7fafb] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 shrink-0 rounded-full bg-[#e0eff0] flex items-center justify-center text-xs font-bold text-[#2b676e]">
                            {initials(s.user.fullName)}
                          </div>
                          <span className="font-semibold text-[#1a1c1c]">{s.user.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#596364]">{s.user.email}</td>
                      <td className="px-4 py-3 text-[#596364]">{s.admissionNo}</td>
                      <td className="px-4 py-3 text-[#596364]">{s.class ? `${s.class.name} - ${s.class.section}` : '-'}</td>
                      <td className="px-4 py-3 text-[#596364]">{s.emergencyContact || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {students.length === 0 && (
                <p className="py-8 text-center text-sm text-[#596364]">No students found yet.</p>
              )}
            </div>

            {message && (
              <p className="mt-4 rounded-xl bg-[#FEE2E2] border border-[#FECACA] px-4 py-3 text-sm text-[#991B1B]">{message}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
