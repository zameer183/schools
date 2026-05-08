import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { PrintButton } from '@/components/reports/print-button';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<{ classId?: string; month?: string }>;
};

function monthBounds(monthKey?: string) {
  const now = new Date();
  const parsed = monthKey && /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearStr, monthStr] = parsed.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const start = new Date(year, month - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, month, 0);
  end.setHours(23, 59, 59, 999);
  return { monthKey: parsed, start, end };
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function codeForStatus(status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED', weekend = false) {
  if (status === 'PRESENT' || status === 'LATE') return 'P';
  if (status === 'ABSENT') return 'A';
  if (status === 'EXCUSED') return 'L';
  if (weekend) return 'H';
  return '-';
}

function textTone(code: string) {
  if (code === 'P') return 'text-[#15803d]';
  if (code === 'A') return 'text-[#be123c]';
  if (code === 'L') return 'text-[#6b7280]';
  if (code === 'H') return 'text-[#2563eb]';
  return 'text-[#9ca3af]';
}

export default async function ClassAttendanceReportPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const { monthKey, start, end } = monthBounds(params.month);

  const classes = await prisma.class.findMany({
    select: {
      id: true,
      name: true,
      section: true,
      teacherLinks: { select: { teacher: { select: { user: { select: { fullName: true } } } }, isClassLead: true } }
    },
    orderBy: [{ name: 'asc' }, { section: 'asc' }]
  });

  const selectedClassId = classes.some((c) => c.id === params.classId) ? params.classId ?? '' : classes[0]?.id ?? '';
  const selectedClass = classes.find((c) => c.id === selectedClassId) ?? null;

  const students = selectedClass
    ? await prisma.student.findMany({
        where: { classId: selectedClass.id },
        select: { id: true, user: { select: { fullName: true } } },
        orderBy: { user: { fullName: 'asc' } }
      })
    : [];

  const attendance = selectedClass
    ? await prisma.attendance.findMany({
        where: { classId: selectedClass.id, date: { gte: start, lte: end } },
        select: { studentId: true, date: true, status: true }
      })
    : [];

  const rowsByStudent = new Map<string, Map<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>();
  for (const row of attendance) {
    if (!rowsByStudent.has(row.studentId)) rowsByStudent.set(row.studentId, new Map());
    rowsByStudent.get(row.studentId)?.set(dateKey(row.date), row.status);
  }

  const overallPresent = attendance.filter((row) => row.status === 'PRESENT' || row.status === 'LATE').length;
  const overallAbsent = attendance.filter((row) => row.status === 'ABSENT').length;

  const totalDays = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const monthLabel = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const dayColumns = Array.from({ length: totalDays }, (_, i) => i + 1);

  const leadTeacher =
    selectedClass?.teacherLinks.find((link) => link.isClassLead)?.teacher.user.fullName ??
    selectedClass?.teacherLinks[0]?.teacher.user.fullName ??
    '-';

  return (
    <div className="space-y-4 pb-8">
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6 print:hidden">
        <Link href="/admin/reports" className="text-xs font-semibold text-[#004649] hover:text-[#1b5e62]">&larr; Back to Reports</Link>
        <h1 className="mt-2 text-2xl font-bold text-[#1a1c1c]">Class Attendance Report</h1>
        <p className="mt-1 text-sm text-[#6f7979]">Student-wise monthly attendance sheet (P/A/L/H) with totals.</p>

        <form className="mt-4 grid gap-3 sm:grid-cols-3" method="get">
          <label className="text-xs font-semibold text-[#6f7979]">
            Class
            <select name="classId" defaultValue={selectedClassId} className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]">
              {classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name} {classItem.section}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#6f7979]">
            Month
            <input type="month" name="month" defaultValue={monthKey} className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]" />
          </label>
          <div className="flex items-end">
            <button type="submit" className="h-10 w-full rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] text-sm font-semibold text-white">Apply</button>
          </div>
        </form>
      </div>

      {selectedClass ? (
        <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
          <div className="mb-3 flex justify-end print:hidden"><PrintButton /></div>
          <div className="hidden print:block border-b border-[#e5e7eb] pb-2 mb-3">
            <h2 className="text-lg font-bold">Class Attendance Report</h2>
            <p className="text-xs text-[#64748b]">Month: {monthLabel}</p>
          </div>
          <h2 className="text-xl font-bold text-[#1a1c1c]">Class Attendance Report</h2>
          <div className="mt-2 grid gap-1 text-sm text-[#374151] sm:grid-cols-3">
            <p><span className="font-semibold">Date:</span> {monthLabel}</p>
            <p><span className="font-semibold">Class:</span> {selectedClass.name} {selectedClass.section}</p>
            <p><span className="font-semibold">Teacher:</span> {leadTeacher}</p>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-[#e5e7eb]">
            <table className="min-w-[1000px] w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#f8fafc] text-[#475569]">
                  <th className="sticky left-0 z-10 border-b border-r border-[#e5e7eb] bg-[#f8fafc] px-3 py-2 text-left font-semibold">Student Name</th>
                  {dayColumns.map((day) => <th key={day} className="border-b border-r border-[#e5e7eb] px-2 py-2 text-center font-semibold">{day}</th>)}
                  <th className="border-b border-r border-[#e5e7eb] px-2 py-2 text-center font-semibold">Total Present</th>
                  <th className="border-b border-[#e5e7eb] px-2 py-2 text-center font-semibold">Total Absent</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={dayColumns.length + 3} className="px-3 py-8 text-center text-sm text-[#6b7280]">No students found in this class.</td></tr>
                ) : (
                  students.map((student) => {
                    const dayMap = rowsByStudent.get(student.id) ?? new Map();
                    let totalPresent = 0;
                    let totalAbsent = 0;

                    const codes = dayColumns.map((day) => {
                      const d = new Date(start.getFullYear(), start.getMonth(), day);
                      const key = dateKey(d);
                      const weekend = d.getDay() === 0 || d.getDay() === 6;
                      const code = codeForStatus(dayMap.get(key), weekend);
                      if (code === 'P') totalPresent++;
                      if (code === 'A') totalAbsent++;
                      return code;
                    });

                    return (
                      <tr key={student.id} className="hover:bg-[#fafafa]">
                        <td className="sticky left-0 z-10 border-b border-r border-[#e5e7eb] bg-white px-3 py-2 font-medium text-[#111827]">{student.user.fullName}</td>
                        {codes.map((code, idx) => <td key={idx} className={`border-b border-r border-[#e5e7eb] px-2 py-2 text-center font-semibold ${textTone(code)}`}>{code}</td>)}
                        <td className="border-b border-r border-[#e5e7eb] px-2 py-2 text-center font-bold text-[#15803d]">{totalPresent}</td>
                        <td className="border-b border-[#e5e7eb] px-2 py-2 text-center font-bold text-[#be123c]">{totalAbsent}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[#ecfdf3] px-4 py-3 text-[#15803d]">
              <p className="text-xs font-semibold">Class Total Present</p>
              <p className="text-2xl font-bold">{overallPresent}</p>
            </div>
            <div className="rounded-xl bg-[#fff1f2] px-4 py-3 text-[#be123c]">
              <p className="text-xs font-semibold">Class Total Absent</p>
              <p className="text-2xl font-bold">{overallAbsent}</p>
            </div>
          </div>

          <p className="mt-3 text-xs text-[#6b7280]">Legend: P = Present, A = Absent, L = Leave, H = Holiday, - = No entry.</p>
          <div className="hidden print:flex mt-8 justify-between text-xs text-[#475569]">
            <span>Generated: {new Date().toLocaleDateString('en-GB')}</span>
            <span>Authorized Sign: __________________</span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-6 text-sm text-[#6f7979] shadow-[0_4px_12px_rgba(0,0,0,0.08)]">No class data found.</div>
      )}
    </div>
  );
}
