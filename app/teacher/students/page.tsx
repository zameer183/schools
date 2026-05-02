'use client';

import { useEffect, useState } from 'react';
import { Users2 } from 'lucide-react';

type StudentItem = {
  id: string;
  admissionNo: string;
  emergencyContact: string | null;
  user: { fullName: string; email: string };
  class: null | { name: string; section: string };
};

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setMessage('');
      try {
        const studentsRes = await fetch('/api/students');
        const studentsJson = await studentsRes.json();
        setStudents(Array.isArray(studentsJson) ? studentsJson : []);
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
      <div className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm p-6">
        <h2 className="text-2xl font-bold text-[#1F2937]">My Class Students</h2>
        <p className="mt-2 text-sm text-[#6B7280]">You can view students from your assigned classes. New student enrollment is restricted to admin.</p>
      </div>

      <div className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D1FAE5]">
              <Users2 className="h-4 w-4 text-[#10B981]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F2937]">Students In Your Classes</h3>
          </div>
          <div className="space-y-2 md:hidden">
            {students.map((s) => (
              <div key={s.id} className="rounded-lg bg-[#F9FAFB] p-3 border border-[#E5E7EB]">
                <p className="text-sm font-semibold text-[#1F2937]">{s.user.fullName}</p>
                <p className="mt-0.5 text-xs text-[#6B7280]">{s.user.email}</p>
                <p className="mt-1 text-xs text-[#6B7280]">Admission: {s.admissionNo}</p>
                <p className="mt-1 text-xs text-[#6B7280]">Class: {s.class ? `${s.class.name} - ${s.class.section}` : '-'}</p>
                <p className="mt-1 text-xs text-[#6B7280]">Emergency: {s.emergencyContact || '-'}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="hidden min-w-full text-sm md:table">
              <thead className="bg-[#F9FAFB] text-[#6B7280] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Name</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Email</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Admission #</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Class</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Emergency Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {students.map((s) => (
                  <tr key={s.id} className="last:border-b-0">
                    <td className="px-3 py-3 font-semibold text-[#1F2937]">{s.user.fullName}</td>
                    <td className="px-3 py-3 text-[#6B7280]">{s.user.email}</td>
                    <td className="px-3 py-3 text-[#6B7280]">{s.admissionNo}</td>
                    <td className="px-3 py-3 text-[#6B7280]">{s.class ? `${s.class.name} - ${s.class.section}` : '-'}</td>
                    <td className="px-3 py-3 text-[#6B7280]">{s.emergencyContact || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading ? <p className="mt-4 text-sm text-[#6B7280]">Loading students...</p> : null}
            {!loading && students.length === 0 ? <p className="mt-4 text-sm text-[#6B7280]">No students found yet.</p> : null}
            {message ? <p className="mt-4 rounded-lg bg-[#FEE2E2] border border-[#FECACA] px-4 py-3 text-sm text-[#991B1B]">{message}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
