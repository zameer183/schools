'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  GraduationCap,
  MessageSquare,
  MoreVertical,
  Search,
  Shield,
  Users2,
  X
} from 'lucide-react';

type StudentItem = {
  id: string;
  admissionNo: string;
  emergencyContact: string | null;
  user: { fullName: string; email: string };
  class: null | { id: string; name: string; section: string };
  attendance?: Array<{ status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' }>;
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

function avatarTone(name: string) {
  const tones = [
    'bg-[#DBEAFE] text-[#1D4ED8]',
    'bg-[#DCFCE7] text-[#15803D]',
    'bg-[#FCE7F3] text-[#BE185D]',
    'bg-[#FEF3C7] text-[#B45309]',
    'bg-[#E0F2FE] text-[#0369A1]',
    'bg-[#EDE9FE] text-[#6D28D9]'
  ];
  const seed = name.charCodeAt(0) + name.length;
  return tones[seed % tones.length];
}

export default function TeacherStudentsPage() {
  const searchParams = useSearchParams();
  const classIdFromUrl = searchParams.get('classId') ?? '';
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [actionSheetStudent, setActionSheetStudent] = useState<StudentItem | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());


  const classOptions = useMemo(() => {
    const uniq = new Set<string>();
    students.forEach((s) => {
      if (s.class) uniq.add(`${s.class.name} - ${s.class.section}`);
    });
    return ['all', ...Array.from(uniq).sort((a, b) => a.localeCompare(b))];
  }, [students]);

  const visibleStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      const classLabel = s.class ? `${s.class.name} - ${s.class.section}` : '-';
      const classMatch = classFilter === 'all' ? true : classLabel === classFilter;
      if (!classMatch) return false;
      if (!q) return true;
      return (
        s.user.fullName.toLowerCase().includes(q) ||
        s.user.email.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q)
      );
    });
  }, [students, query, classFilter]);

  const attendancePercent = (s: StudentItem) => {
    const logs = s.attendance ?? [];
    if (!logs.length) return 0;
    const presentLike = logs.filter((a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'EXCUSED').length;
    return Math.round((presentLike / logs.length) * 100);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setMessage('');
      try {
        const url = classIdFromUrl ? `/api/students?classId=${encodeURIComponent(classIdFromUrl)}` : '/api/students';
        const res = await fetch(url);
        const json = await res.json();
        setStudents(Array.isArray(json) ? json : []);

      } catch {
        setMessage('Failed to load class student data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [classIdFromUrl]);

  useEffect(() => {
    if (!actionSheetStudent) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [actionSheetStudent]);

  const closeActionSheet = () => setActionSheetStudent(null);

  return (
    <div className="min-h-screen space-y-6 bg-[#F7F9FB] pb-28">
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold text-[#00507D]">Dashboard</p>
            <h1 className="text-2xl font-bold leading-tight text-[#191C1E]">My Students</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#86F2E4] px-3 py-1 text-[#006F66]">
            <Users2 className="h-[18px] w-[18px]" />
            <span className="text-xs font-semibold">{visibleStudents.length} Students</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#707881]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, admission..."
              className="h-12 w-full rounded-xl border border-[#C0C7D1] bg-white py-3 pl-10 pr-4 text-base text-[#191C1E] outline-none transition-all placeholder:text-[#707881] focus:border-[#00507D] focus:ring-2 focus:ring-[#00507D]/10"
            />
          </div>
          <div className="relative">
            <GraduationCap className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#707881]" />
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-[#C0C7D1] bg-white py-3 pl-10 pr-10 text-base text-[#191C1E] outline-none transition-all focus:border-[#00507D] focus:ring-2 focus:ring-[#00507D]/10"
            >
              <option value="all">All Classes</option>
              {classOptions.filter((c) => c !== 'all').map((classLabel) => (
                <option key={classLabel} value={classLabel}>{classLabel}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#707881]">v</span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#CDE5FF] border-t-[#00507D]" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleStudents.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-xl border border-[#E6E8EA] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_6px_rgba(15,23,42,0.05)] transition-transform active:scale-[0.98] ${
                    selected.has(s.id) ? 'ring-2 ring-[#00507D]/20' : ''
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.id)) next.delete(s.id);
                          else next.add(s.id);
                          return next;
                        });
                      }}
                      className="flex min-w-0 gap-4 text-left"
                    >
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold ${avatarTone(s.user.fullName)}`}>
                        {initials(s.user.fullName).slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-[#191C1E]">{s.user.fullName}</h3>
                        <p className="truncate text-xs font-medium text-[#40474F]">{s.class ? `${s.class.name} - ${s.class.section}` : '-'}</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionSheetStudent(s)}
                      className="rounded-full p-1 text-[#707881] transition-colors hover:bg-[#E6E8EA]"
                      aria-label={`Open actions for ${s.user.fullName}`}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-2 border-t border-[#ECEEF0] pt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#40474F]">Attendance</span>
                      <span className="font-bold text-[#191C1E]">{attendancePercent(s)}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ECEEF0]">
                      <div
                        className={`h-full ${attendancePercent(s) < 70 ? 'bg-[#BA1A1A]/60' : 'bg-[#006A61]'}`}
                        style={{ width: `${Math.max(5, attendancePercent(s))}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {visibleStudents.length === 0 && (
                <p className="col-span-full py-8 text-center text-sm text-[#40474F]">No students found yet.</p>
              )}
            </div>

            {message && (
              <p className="mt-4 rounded-xl bg-[#FEE2E2] border border-[#FECACA] px-4 py-3 text-sm text-[#991B1B]">{message}</p>
            )}
          </>
        )}
      </section>

      {actionSheetStudent ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close actions"
            onClick={closeActionSheet}
            className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
          />

          <div className="absolute inset-x-0 bottom-0 rounded-t-[24px] border-t border-white/60 bg-white p-4 pb-6 shadow-[0_-20px_44px_rgba(15,23,42,0.25)] transition-transform duration-300 ease-out">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#CBD5E1]" />
            <div className="mb-3 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-white/70 ${avatarTone(actionSheetStudent.user.fullName)}`}>
                  {initials(actionSheetStudent.user.fullName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#0F172A]">{actionSheetStudent.user.fullName}</p>
                  <p className="truncate text-xs text-[#64748B]">#{actionSheetStudent.admissionNo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeActionSheet}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <Link
                href={`/teacher/students/${actionSheetStudent.id}`}
                onClick={closeActionSheet}
                className="flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9]"
              >
                <Eye className="h-4 w-4 text-[#0F766E]" />
                View Details
              </Link>
              <Link
                href={`/teacher/messages?studentId=${actionSheetStudent.id}`}
                onClick={closeActionSheet}
                className="flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9]"
              >
                <MessageSquare className="h-4 w-4 text-[#0F766E]" />
                Message
              </Link>
              <Link
                href={`/teacher/students/${actionSheetStudent.id}/progress`}
                onClick={closeActionSheet}
                className="flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9]"
              >
                <Shield className="h-4 w-4 text-[#0F766E]" />
                Progress
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
