import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { PrintButton } from '@/components/reports/print-button';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<{ studentId?: string; month?: string }>;
};

type DayCell = {
  day: number;
  key: string;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HOLIDAY' | 'NONE';
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

function dayStatus(raw?: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') {
  if (raw === 'PRESENT' || raw === 'LATE') return 'PRESENT';
  if (raw === 'ABSENT') return 'ABSENT';
  if (raw === 'EXCUSED') return 'LEAVE';
  return 'NONE';
}

function cellClass(status: DayCell['status']) {
  if (status === 'PRESENT') return 'border-[#34c38f] bg-[#eefcf6] text-[#067647]';
  if (status === 'ABSENT') return 'border-[#fda4af] bg-[#fff1f2] text-[#be123c]';
  if (status === 'LEAVE') return 'border-[#d1d5db] bg-[#f8fafc] text-[#4b5563]';
  if (status === 'HOLIDAY') return 'border-[#93c5fd] bg-[#eff6ff] text-[#1d4ed8]';
  return 'border-[#e5e7eb] bg-white text-[#6b7280]';
}

export default async function IndividualAttendanceReportPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const { monthKey, start, end } = monthBounds(params.month);

  const students = await prisma.student.findMany({
    select: {
      id: true,
      rollNumber: true,
      fatherName: true,
      guardianPhone: true,
      user: { select: { fullName: true } },
      class: { select: { name: true, section: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const selectedStudentId = students.some((s) => s.id === params.studentId) ? params.studentId ?? '' : students[0]?.id ?? '';
  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null;

  const attendance = selectedStudent
    ? await prisma.attendance.findMany({
        where: { studentId: selectedStudent.id, date: { gte: start, lte: end } },
        select: { date: true, status: true },
        orderBy: { date: 'asc' }
      })
    : [];

  const statusByDate = new Map<string, 'PRESENT' | 'ABSENT' | 'LEAVE' | 'NONE'>();
  for (const row of attendance) statusByDate.set(dateKey(row.date), dayStatus(row.status));

  const totalDays = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const firstDay = (start.getDay() + 6) % 7;
  const calendarCells: DayCell[] = [];

  for (let i = 0; i < firstDay; i++) calendarCells.push({ day: 0, key: `empty-${i}`, status: 'NONE' });

  let presentCount = 0;
  let absentCount = 0;
  let leaveCount = 0;
  let holidayCount = 0;

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(start.getFullYear(), start.getMonth(), day);
    const key = dateKey(d);
    const explicit = statusByDate.get(key);
    const weekend = d.getDay() === 0 || d.getDay() === 6;

    const status: DayCell['status'] = explicit && explicit !== 'NONE' ? explicit : weekend ? 'HOLIDAY' : 'NONE';

    if (status === 'PRESENT') presentCount++;
    if (status === 'ABSENT') absentCount++;
    if (status === 'LEAVE') leaveCount++;
    if (status === 'HOLIDAY') holidayCount++;

    calendarCells.push({ day, key, status });
  }

  const monthLabel = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div className="space-y-4 pb-8">
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6 print:hidden">
        <Link href="/admin/reports" className="text-xs font-semibold text-[#004649] hover:text-[#1b5e62]">&larr; Back to Reports</Link>
        <h1 className="mt-2 text-2xl font-bold text-[#1a1c1c]">Individual Attendance Report</h1>
        <p className="mt-1 text-sm text-[#6f7979]">Monthly attendance calendar with Present, Absent, Leave, and Holiday counts.</p>

        <form className="mt-4 grid gap-3 sm:grid-cols-3" method="get">
          <label className="text-xs font-semibold text-[#6f7979]">
            Student
            <select name="studentId" defaultValue={selectedStudentId} className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]">
              {students.map((student) => <option key={student.id} value={student.id}>{student.user.fullName}</option>)}
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

      {selectedStudent ? (
        <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
          <div className="mb-3 flex justify-end print:hidden">
            <PrintButton />
          </div>
          <div className="hidden print:block border-b border-[#e5e7eb] pb-2 mb-3">
            <h2 className="text-lg font-bold">Individual Attendance Report</h2>
            <p className="text-xs text-[#64748b]">Month: {monthLabel}</p>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf0f2] pb-4">
            <div>
              <h2 className="text-xl font-bold text-[#1a1c1c]">ATTENDANCE REPORT</h2>
              <p className="mt-1 text-sm text-[#6b7280]">{monthLabel}</p>
            </div>
            <div className="text-right text-sm text-[#374151]">
              <p><span className="font-semibold">Phone:</span> {selectedStudent.guardianPhone || '-'}</p>
              <p><span className="font-semibold">Roll No:</span> {selectedStudent.rollNumber || '-'}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_240px]">
            <div>
              <div className="mb-4 text-sm text-[#374151]">
                <p><span className="font-semibold">Student:</span> {selectedStudent.user.fullName}</p>
                <p><span className="font-semibold">Guardian:</span> {selectedStudent.fatherName || '-'}</p>
                <p><span className="font-semibold">Batch:</span> {selectedStudent.class ? `${selectedStudent.class.name} ${selectedStudent.class.section}` : 'Unassigned'}</p>
              </div>

              <div className="rounded-xl border border-[#e5e7eb] p-4">
                <h3 className="mb-3 text-xl font-bold text-[#1f2937]">{monthLabel}</h3>
                <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold text-[#6b7280]">
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => <div key={d}>{d}</div>)}
                </div>
                <div className="mt-3 grid grid-cols-7 gap-2">
                  {calendarCells.map((cell) => (
                    <div key={cell.key} className="flex h-10 items-center justify-center">
                      {cell.day > 0 ? <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${cellClass(cell.status)}`}>{cell.day}</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <SummaryBox label="Present" value={presentCount} tone="green" />
              <SummaryBox label="Absent" value={absentCount} tone="red" />
              <SummaryBox label="Leave" value={leaveCount} tone="gray" />
              <SummaryBox label="Holiday" value={holidayCount} tone="blue" />
            </div>
          </div>

          <div className="hidden print:flex mt-8 justify-between text-xs text-[#475569]">
            <span>Generated: {new Date().toLocaleDateString('en-GB')}</span>
            <span>Authorized Sign: __________________</span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-6 text-sm text-[#6f7979] shadow-[0_4px_12px_rgba(0,0,0,0.08)]">No student data found.</div>
      )}
    </div>
  );
}

function SummaryBox({ label, value, tone }: { label: string; value: number; tone: 'green' | 'red' | 'gray' | 'blue' }) {
  const tones = {
    green: 'bg-[#ecfdf3] text-[#15803d]',
    red: 'bg-[#fff1f2] text-[#be123c]',
    gray: 'bg-[#f3f4f6] text-[#4b5563]',
    blue: 'bg-[#eff6ff] text-[#1d4ed8]'
  } as const;

  return (
    <div className={`rounded-xl px-4 py-3 ${tones[tone]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );
}
