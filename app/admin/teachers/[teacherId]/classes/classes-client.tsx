'use client';

import Link from 'next/link';
import { ChevronLeft, Users, GraduationCap, CheckCircle } from 'lucide-react';

type TeacherClassesData = {
  id: string;
  name: string;
  isActive: boolean;
  classes: Array<{
    id: string;
    name: string;
    section: string;
    academicYear: string;
    studentCount: number;
  }>;
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function avatarColor(name: string): string {
  const COLORS = ['#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#2563eb', '#0d9488'];
  return COLORS[name.charCodeAt(0) % COLORS.length];
}

export default function TeacherClassesClient({ teacher }: { teacher: TeacherClassesData }) {
  return (
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden pb-20 sm:pb-5 sm:space-y-6">
      {/* ── Header with back button ── */}
      <div className="flex items-center gap-3 px-4 py-3 sm:px-0">
        <Link
          href="/admin/teachers"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[#6f7979] hover:bg-[#f3f4f5] transition"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="font-headline text-xl font-bold text-[#1a1c1c] sm:text-2xl">Classes</h1>
      </div>

      {/* ── Teacher Info Section ── */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Avatar */}
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white sm:h-20 sm:w-20"
            style={{ backgroundColor: avatarColor(teacher.name) }}
          >
            {initials(teacher.name)}
          </div>

          {/* Teacher info */}
          <div className="min-w-0 flex-1">
            <h2 className="font-headline text-lg font-bold text-[#1a1c1c] sm:text-xl">{teacher.name}</h2>
            <p className="mt-0.5 text-sm text-[#6f7979]">Teacher</p>

            {/* Status badge */}
            <div className="mt-2 flex items-center gap-2">
              {teacher.isActive ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-[#16a34a]" />
                  <span className="text-xs font-medium text-[#15803d]">Active</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-[#ef4444]" />
                  <span className="text-xs font-medium text-[#dc2626]">Inactive</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Classes Section ── */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)] sm:p-6">
        <h3 className="font-headline mb-4 text-lg font-bold text-[#1a1c1c]">Assigned Classes</h3>

        {teacher.classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl bg-[#f8fafc] px-4 py-12 text-center">
            <GraduationCap size={40} className="mb-3 text-[#cbd5e1]" />
            <p className="text-sm text-[#64748b]">No classes assigned to this teacher</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 sm:hidden">
              {teacher.classes.map((cls) => (
                <div key={cls.id} className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#1a1c1c]">{cls.name}</p>
                      <p className="text-xs text-[#6b7280]">{cls.section}</p>
                    </div>
                  </div>

                  <p className="mb-2 text-xs text-[#6b7280]">
                    <span className="font-medium">Year:</span> {cls.academicYear}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-[#4b5563]">
                    <Users size={14} />
                    <span>{cls.studentCount} {cls.studentCount === 1 ? 'student' : 'students'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f1f5f9] bg-[#f8fafc]">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#6f7979]">
                      Class
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#6f7979]">
                      Section
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#6f7979]">
                      Academic Year
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#6f7979]">
                      Students
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {teacher.classes.map((cls) => (
                    <tr key={cls.id} className="hover:bg-[#fafafa] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#1a1c1c]">{cls.name}</td>
                      <td className="px-4 py-3 text-[#6b7280]">{cls.section}</td>
                      <td className="px-4 py-3 text-[#6b7280]">{cls.academicYear}</td>
                      <td className="px-4 py-3 text-[#6b7280]">
                        <div className="flex items-center gap-1.5">
                          <Users size={14} />
                          <span>{cls.studentCount}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
