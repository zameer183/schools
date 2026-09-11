'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { PrintButton } from '@/components/reports/print-button';

type StudentRow = {
  id: string;
  fullName: string;
  rollNumber: string | null;
  codes: string[];
  totalPresent: number;
  totalAbsent: number;
  totalLeave: number;
};

type Props = {
  classes: { id: string; name: string; section: string }[];
  selectedClassId: string;
  selectedClass: { id: string; name: string; section: string; leadTeacher: string } | null;
  monthKey: string;
  monthLabel: string;
  dayColumns: number[];
  students: StudentRow[];
  overallPresent: number;
  overallAbsent: number;
  overallLeave: number;
  currentPage: number;
  totalStudents: number;
  pageSize: number;
};

function cellStyle(code: string) {
  if (code === 'P') return 'bg-[#dcfce7] text-[#15803d]';
  if (code === 'A') return 'bg-[#fee2e2] text-[#be123c]';
  if (code === 'L') return 'bg-[#eff6ff] text-[#1d4ed8]';
  if (code === 'H') return 'bg-[#f0f9ff] text-[#0284c7]';
  return 'text-[#d1d5db]';
}

function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ClassAttendanceClient({
  classes, selectedClassId, selectedClass, monthKey, monthLabel,
  dayColumns, students, overallPresent, overallAbsent, overallLeave,
  currentPage, totalStudents, pageSize
}: Props) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(totalStudents / pageSize));

  function navigate(overrides: Record<string, string>) {
    const params = new URLSearchParams({ classId: selectedClassId, month: monthKey, ...overrides });
    router.push(`/admin/reports/class-attendance?${params.toString()}`);
  }

  function handleDownload() {
    if (!selectedClass) return;
    const header = [
      `Class: ${selectedClass.name} ${selectedClass.section}`,
      `Teacher: ${selectedClass.leadTeacher}`,
      `Month: ${monthLabel}`,
      `Total Students: ${totalStudents}`,
      `Class Present: ${overallPresent} | Class Absent: ${overallAbsent} | Class Leave: ${overallLeave}`,
      ''
    ].join('\n');

    const cols = ['#', 'Student Name', ...dayColumns.map(String), 'Total P', 'Total A', 'Total L'];
    const rows = students.map((s, i) => [
      String(s.rollNumber ?? (currentPage - 1) * pageSize + i + 1),
      s.fullName,
      ...s.codes,
      String(s.totalPresent),
      String(s.totalAbsent),
      String(s.totalLeave)
    ]);

    const csv = header + [cols, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `class_attendance_${selectedClass.name}_${selectedClass.section}_${monthLabel.replace(/\s+/g, '_')}_page${currentPage}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Filter */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6 print:hidden">
        <Link href="/admin/reports" className="text-xs font-semibold text-[#004649] hover:text-[#1b5e62]">
          &larr; Back to Reports
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#1a1c1c]">Class Attendance Report</h1>
        <p className="mt-1 text-sm text-[#6f7979]">Student-wise monthly attendance sheet with daily P/A/L/H codes.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-[#6f7979]">
            Class
            <select
              value={selectedClassId}
              onChange={(e) => navigate({ classId: e.target.value, page: '1' })}
              className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.section}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#6f7979]">
            Month
            <input
              type="month"
              value={monthKey}
              onChange={(e) => navigate({ month: e.target.value, page: '1' })}
              className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              onClick={() => navigate({ month: shiftMonth(monthKey, -1), page: '1' })}
              className="h-10 flex-1 rounded-xl bg-[#f3f4f5] text-sm font-semibold text-[#374151] hover:bg-[#e5e7eb] transition"
            >
              ← Prev
            </button>
            <button
              onClick={() => navigate({ month: shiftMonth(monthKey, 1), page: '1' })}
              className="h-10 flex-1 rounded-xl bg-[#f3f4f5] text-sm font-semibold text-[#374151] hover:bg-[#e5e7eb] transition"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {selectedClass ? (
        <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
          {/* Print-only header */}
          <div className="hidden print:block mb-4 border-b pb-3">
            <h2 className="text-lg font-bold text-[#1a1c1c]">Class Attendance Report</h2>
            <div className="mt-1 flex flex-wrap gap-4 text-sm text-[#374151]">
              <span><span className="font-semibold">Class:</span> {selectedClass.name} {selectedClass.section}</span>
              <span><span className="font-semibold">Month:</span> {monthLabel}</span>
              <span><span className="font-semibold">Teacher:</span> {selectedClass.leadTeacher}</span>
              <span><span className="font-semibold">Students:</span> {totalStudents}</span>
            </div>
          </div>

          {/* Header row */}
          <div className="mb-4 flex items-start justify-between gap-3 print:hidden">
            <div>
              <h2 className="text-xl font-bold text-[#1a1c1c]">
                {selectedClass.name} {selectedClass.section}
              </h2>
              <div className="mt-1 flex flex-wrap gap-4 text-sm text-[#374151]">
                <span><span className="font-semibold">Month:</span> {monthLabel}</span>
                <span><span className="font-semibold">Teacher:</span> {selectedClass.leadTeacher}</span>
                <span><span className="font-semibold">Students:</span> {totalStudents}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <PrintButton label="Print / PDF" orientation="landscape" />
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-xl bg-[#004649] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1b5e62] transition"
              >
                <Download className="h-4 w-4" />
                CSV (Page)
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-[#e5e7eb]">
            <table className="w-full border-collapse text-xs" style={{ minWidth: `${Math.max(900, 180 + dayColumns.length * 32 + 120)}px` }}>
              <thead>
                <tr className="bg-[#004649] text-white">
                  <th className="sticky left-0 z-10 border-b border-r border-[#1b5e62] bg-[#004649] px-3 py-2 text-left font-semibold">Student</th>
                  <th className="border-b border-r border-[#1b5e62] px-2 py-2 text-center font-semibold w-10">Roll</th>
                  {dayColumns.map((day) => (
                    <th key={day} className="border-b border-r border-[#1b5e62] px-1 py-2 text-center font-semibold w-8">{day}</th>
                  ))}
                  <th className="border-b border-r border-[#1b5e62] px-2 py-2 text-center font-semibold w-10 bg-[#dcfce7] text-[#15803d]">P</th>
                  <th className="border-b border-r border-[#1b5e62] px-2 py-2 text-center font-semibold w-10 bg-[#fee2e2] text-[#be123c]">A</th>
                  <th className="border-b border-[#1b5e62] px-2 py-2 text-center font-semibold w-10 bg-[#eff6ff] text-[#1d4ed8]">L</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={dayColumns.length + 5} className="px-3 py-8 text-center text-sm text-[#6b7280]">
                      No students in this class.
                    </td>
                  </tr>
                ) : (
                  students.map((student, idx) => (
                    <tr key={student.id} className={idx % 2 === 0 ? 'bg-white hover:bg-[#f8fafb]' : 'bg-[#fafafa] hover:bg-[#f3f5f6]'}>
                      <td className="sticky left-0 z-10 border-b border-r border-[#e5e7eb] bg-inherit px-3 py-1.5 font-medium text-[#111827] whitespace-nowrap">
                        {student.fullName}
                      </td>
                      <td className="border-b border-r border-[#e5e7eb] px-2 py-1.5 text-center text-[#6b7280]">
                        {student.rollNumber ?? '-'}
                      </td>
                      {student.codes.map((code, i) => (
                        <td
                          key={i}
                          className={`border-b border-r border-[#e5e7eb] px-1 py-1.5 text-center font-semibold ${cellStyle(code)}`}
                        >
                          {code === '-' ? '' : code}
                        </td>
                      ))}
                      <td className="border-b border-r border-[#e5e7eb] px-2 py-1.5 text-center font-bold text-[#15803d]">
                        {student.totalPresent}
                      </td>
                      <td className="border-b border-r border-[#e5e7eb] px-2 py-1.5 text-center font-bold text-[#be123c]">
                        {student.totalAbsent}
                      </td>
                      <td className="border-b border-[#e5e7eb] px-2 py-1.5 text-center font-bold text-[#1d4ed8]">
                        {student.totalLeave}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 print:hidden sticky left-0">
                <div className="text-sm text-[#6b7280]">
                  Showing <span className="font-semibold text-[#111827]">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-semibold text-[#111827]">{Math.min(currentPage * pageSize, totalStudents)}</span> of <span className="font-semibold text-[#111827]">{totalStudents}</span> students
                </div>
                <div className="flex gap-2">
                  {currentPage > 1 ? (
                    <button
                      onClick={() => navigate({ page: String(currentPage - 1) })}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm font-semibold text-[#374151] hover:bg-[#f3f4f5] transition"
                    >
                      Previous
                    </button>
                  ) : (
                    <span className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm font-semibold text-[#d1d5db] cursor-not-allowed">
                      Previous
                    </span>
                  )}
                  {currentPage < totalPages ? (
                    <button
                      onClick={() => navigate({ page: String(currentPage + 1) })}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm font-semibold text-[#374151] hover:bg-[#f3f4f5] transition"
                    >
                      Next
                    </button>
                  ) : (
                    <span className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 text-sm font-semibold text-[#d1d5db] cursor-not-allowed">
                      Next
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Class totals */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#ecfdf3] px-4 py-3 text-[#15803d]">
              <p className="text-xs font-semibold">Class Present</p>
              <p className="text-2xl font-bold">{overallPresent}</p>
            </div>
            <div className="rounded-xl bg-[#fff1f2] px-4 py-3 text-[#be123c]">
              <p className="text-xs font-semibold">Class Absent</p>
              <p className="text-2xl font-bold">{overallAbsent}</p>
            </div>
            <div className="rounded-xl bg-[#eff6ff] px-4 py-3 text-[#1d4ed8]">
              <p className="text-xs font-semibold">Class Leave</p>
              <p className="text-2xl font-bold">{overallLeave}</p>
            </div>
          </div>

          <p className="mt-3 text-xs text-[#6b7280]">P = Present / Late &nbsp;·&nbsp; A = Absent &nbsp;·&nbsp; L = Leave / Excused &nbsp;·&nbsp; H = Holiday (weekend)</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-6 text-sm text-[#6f7979] shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          No class data found.
        </div>
      )}
    </div>
  );
}
