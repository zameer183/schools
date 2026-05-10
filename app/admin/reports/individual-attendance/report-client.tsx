'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Download, Share2 } from 'lucide-react';
import { PrintButton } from '@/components/reports/print-button';

type AttendanceRecord = {
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks: string | null;
};

type StudentItem = {
  id: string;
  admissionNo: string;
  rollNumber: string | null;
  whatsApp: string | null;
  guardianPhone: string | null;
  fullName: string;
  isActive: boolean;
  className: string | null;
};

type ClassItem = { id: string; name: string; section: string };

type Props = {
  classes: ClassItem[];
  students: StudentItem[];
  selectedClassId: string;
  selectedStudentId: string;
  selectedStudent: StudentItem | null;
  attendance: AttendanceRecord[];
  monthKey: string;
};

const STATUS_CONFIG = {
  PRESENT:  { bg: 'bg-[#dcfce7]', text: 'text-[#15803d]', dot: 'bg-[#22c55e]', label: 'Present' },
  ABSENT:   { bg: 'bg-[#fee2e2]', text: 'text-[#b91c1c]', dot: 'bg-[#ef4444]', label: 'Absent' },
  LATE:     { bg: 'bg-[#fff7ed]', text: 'text-[#b45309]', dot: 'bg-[#f59e0b]', label: 'Late' },
  EXCUSED:  { bg: 'bg-[#eff6ff]', text: 'text-[#1d4ed8]', dot: 'bg-[#3b82f6]', label: 'Leave' },
} as const;

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function toLocalDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseMonthKey(key: string) {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m };
}

function shiftMonth(key: string, delta: number) {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function AttendanceReportClient({
  classes, students, selectedClassId, selectedStudentId, selectedStudent, attendance, monthKey
}: Props) {
  const router = useRouter();

  const { year, month } = parseMonthKey(monthKey);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd   = new Date(year, month, 0);
  const daysInMonth = monthEnd.getDate();
  const firstDay = monthStart.getDay();
  const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1;
  const monthName = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Build record map for current month
  const recordMap = new Map<string, AttendanceRecord>();
  for (const r of attendance) {
    const d = new Date(r.date);
    if (d >= monthStart && d <= monthEnd) {
      recordMap.set(toLocalDateStr(d), r);
    }
  }

  const stats = {
    present: [...recordMap.values()].filter((r) => r.status === 'PRESENT').length,
    absent:  [...recordMap.values()].filter((r) => r.status === 'ABSENT').length,
    late:    [...recordMap.values()].filter((r) => r.status === 'LATE').length,
    leave:   [...recordMap.values()].filter((r) => r.status === 'EXCUSED').length,
  };

  const calendarDays: (number | null)[] = [
    ...Array(adjustedFirst).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];

  const todayStr = toLocalDateStr(new Date());
  const waPhone = (selectedStudent?.whatsApp || selectedStudent?.guardianPhone || '').replace(/[^0-9+]/g, '');

  function navigate(overrides: Record<string, string>) {
    const params = new URLSearchParams({
      classId: selectedClassId,
      studentId: selectedStudentId,
      month: monthKey,
      ...overrides
    });
    router.push(`/admin/reports/individual-attendance?${params.toString()}`);
  }

  function handleDownload() {
    if (!selectedStudent) return;
    const header = [
      `Student: ${selectedStudent.fullName}`,
      `Admission No: ${selectedStudent.admissionNo}`,
      `Class: ${selectedStudent.className ?? 'Unassigned'}`,
      `Month: ${monthName}`,
      `Present: ${stats.present}  Absent: ${stats.absent}  Late: ${stats.late}  Leave: ${stats.leave}`,
      ''
    ].join('\n');
    const rows: string[][] = [['Date', 'Day', 'Status', 'Remarks']];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toLocalDateStr(new Date(year, month - 1, d));
      const r = recordMap.get(dateStr);
      if (r) {
        const dt = new Date(r.date);
        rows.push([
          dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
          dt.toLocaleDateString('en-US', { weekday: 'long' }),
          r.status,
          r.remarks ?? ''
        ]);
      }
    }
    const csv = header + rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedStudent.fullName.replace(/\s+/g, '_')}_${monthName.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleShare() {
    if (!waPhone || !selectedStudent) return;
    const msg = `📅 Attendance Report\n\nStudent: ${selectedStudent.fullName}\nMonth: ${monthName}\n\n✅ Present: ${stats.present}\n❌ Absent: ${stats.absent}\n🕒 Late: ${stats.late}\n📋 Leave: ${stats.leave}`;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  return (
    <div className="min-h-screen bg-[#f8fafb] p-4">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Print-only header */}
        {selectedStudent && (
          <div className="hidden print:block mb-4 border-b pb-3">
            <h1 className="text-lg font-bold text-[#1a1c1c]">Individual Attendance Report</h1>
            <div className="mt-1 flex flex-wrap gap-4 text-sm text-[#374151]">
              <span><span className="font-semibold">Student:</span> {selectedStudent.fullName}</span>
              <span><span className="font-semibold">Class:</span> {selectedStudent.className ?? 'Unassigned'}</span>
              <span><span className="font-semibold">Admission No:</span> {selectedStudent.admissionNo}</span>
              <span><span className="font-semibold">Month:</span> {monthName}</span>
            </div>
          </div>
        )}

        {/* Back */}
        <Link href="/admin/reports" className="inline-flex items-center gap-1 text-xs font-semibold text-[#004649] hover:text-[#1b5e62] transition print:hidden">
          <ChevronLeft className="h-4 w-4" />
          Back to Reports
        </Link>

        {/* Filters */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)] print:hidden">
          <h1 className="mb-4 text-lg font-bold text-[#1a1c1c]">Individual Attendance Report</h1>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-[#6f7979]">
              Class
              <select
                value={selectedClassId}
                onChange={(e) => navigate({ classId: e.target.value, studentId: '' })}
                className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} {c.section}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-[#6f7979]">
              Student
              <select
                value={selectedStudentId}
                onChange={(e) => navigate({ studentId: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-[#6f7979]">
              Month
              <input
                type="month"
                value={monthKey}
                onChange={(e) => navigate({ month: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]"
              />
            </label>
          </div>
        </div>

        {selectedStudent ? (
          <>
            {/* Hero */}
            <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)] p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#dcfce7] to-[#bbf7d0] text-lg font-bold text-[#15803d] ring-4 ring-[#f0fdf4]">
                  {initials(selectedStudent.fullName)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#111827]">{selectedStudent.fullName}</h2>
                    {selectedStudent.isActive
                      ? <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[9px] font-bold uppercase text-[#15803d]">Active</span>
                      : <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[9px] font-bold uppercase text-[#b91c1c]">Inactive</span>
                    }
                  </div>
                  <p className="mt-0.5 text-xs text-[#6b7280]">
                    {selectedStudent.className ?? 'Unassigned'} • Admission: <span className="font-semibold text-[#374151]">{selectedStudent.admissionNo}</span>
                    {selectedStudent.rollNumber && <> • Roll: <span className="font-semibold text-[#374151]">{selectedStudent.rollNumber}</span></>}
                  </p>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)] p-5">
              {/* Month nav */}
              <div className="mb-5 flex items-center justify-between">
                <button
                  onClick={() => navigate({ month: shiftMonth(monthKey, -1) })}
                  className="h-11 w-11 flex items-center justify-center rounded-xl bg-[#f0f2f5] hover:bg-[#e2e8e8] transition"
                >
                  <ChevronLeft size={18} className="text-[#1a1c1c]" />
                </button>
                <h3 className="font-semibold text-[#1a1c1c]">{monthName}</h3>
                <button
                  onClick={() => navigate({ month: shiftMonth(monthKey, 1) })}
                  className="h-11 w-11 flex items-center justify-center rounded-xl bg-[#f0f2f5] hover:bg-[#e2e8e8] transition"
                >
                  <ChevronRight size={18} className="text-[#1a1c1c]" />
                </button>
              </div>

              {/* Week header */}
              <div className="mb-3 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-[#6b7280]">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d}>{d}</div>)}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((day, idx) => {
                  if (day === null) return <div key={`e-${idx}`} className="aspect-square" />;
                  const dateStr = toLocalDateStr(new Date(year, month - 1, day));
                  const record = recordMap.get(dateStr);
                  const cfg = record ? STATUS_CONFIG[record.status] : null;
                  const isToday = dateStr === todayStr;

                  return (
                    <div
                      key={day}
                      className={`aspect-square flex items-center justify-center rounded-lg text-xs font-semibold relative
                        ${cfg ? `${cfg.bg} ${cfg.text}` : 'bg-[#f1f5f9] text-[#94a3b8]'}
                        ${isToday ? 'ring-2 ring-[#004649] ring-offset-1' : ''}
                      `}
                    >
                      {day}
                      {record && (
                        <span className={`absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full ${cfg?.dot}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-3">
                {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map((s) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${STATUS_CONFIG[s].dot}`} />
                    <span className="text-[10px] font-semibold text-[#6b7280]">{STATUS_CONFIG[s].label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f1f5f9] ring-1 ring-[#9ca3af]" />
                  <span className="text-[10px] font-semibold text-[#6b7280]">Not marked</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#f0fdf4] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Present</p>
                <p className="mt-1.5 text-2xl font-bold text-[#15803d]">{stats.present}</p>
              </div>
              <div className="rounded-xl bg-[#fef2f2] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Absent</p>
                <p className="mt-1.5 text-2xl font-bold text-[#b91c1c]">{stats.absent}</p>
              </div>
              <div className="rounded-xl bg-[#fef9f0] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Late</p>
                <p className="mt-1.5 text-2xl font-bold text-[#b45309]">{stats.late}</p>
              </div>
              <div className="rounded-xl bg-[#f0f4ff] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Leave</p>
                <p className="mt-1.5 text-2xl font-bold text-[#1d4ed8]">{stats.leave}</p>
              </div>
            </div>

            {/* Bottom buttons */}
            <div className="flex gap-3 print:hidden">
              <PrintButton label="Print / PDF" orientation="portrait" />
              <button
                onClick={handleDownload}
                className="h-11 flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#004649] text-white font-semibold hover:bg-[#1b5e62] transition"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </button>
              <button
                onClick={handleShare}
                disabled={!waPhone}
                className={`h-11 flex flex-1 items-center justify-center gap-2 rounded-xl font-semibold transition ${
                  waPhone ? 'bg-[#25d366] text-white hover:scale-105 active:scale-[0.98]' : 'bg-[#f0f2f5] text-[#6f7979] cursor-not-allowed opacity-60'
                }`}
              >
                <Share2 className="h-4 w-4" />
                WhatsApp
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-white p-6 text-sm text-[#6f7979] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            No student found. Select a student above.
          </div>
        )}
      </div>
    </div>
  );
}
