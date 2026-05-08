import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { PrintButton } from '@/components/reports/print-button';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<{ classId?: string; studentId?: string; from?: string; to?: string }>;
};

function parseDate(input?: string, fallback?: Date) {
  if (!input) return fallback ?? new Date();
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? fallback ?? new Date() : d;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function statusCode(status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') {
  if (status === 'PRESENT' || status === 'LATE') return 'P';
  if (status === 'ABSENT') return 'A';
  if (status === 'EXCUSED') return 'L';
  return '-';
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatRangeItem(items: { sectionKey: string; surahId: number; fromAyah: number; toAyah: number }[], key: string) {
  const selected = items.filter((item) => item.sectionKey.toLowerCase() === key);
  if (selected.length === 0) return '-';
  return selected.map((item) => `S${item.surahId}:${item.fromAyah}-${item.toAyah}`).join(', ');
}

function trimToDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function IndividualCompleteReportPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const fromDate = parseDate(params.from, monthStart);
  fromDate.setHours(0, 0, 0, 0);
  const toDate = parseDate(params.to, now);
  toDate.setHours(23, 59, 59, 999);

  const classes = await prisma.class.findMany({
    select: { id: true, name: true, section: true },
    orderBy: [{ name: 'asc' }, { section: 'asc' }]
  });

  const selectedClassId = params.classId && classes.some((c) => c.id === params.classId) ? params.classId : 'all';

  const students = await prisma.student.findMany({
    where: selectedClassId !== 'all' ? { classId: selectedClassId } : {},
    select: {
      id: true,
      classId: true,
      rollNumber: true,
      fatherName: true,
      user: { select: { fullName: true } },
      class: {
        select: {
          name: true,
          section: true,
          teacherLinks: {
            select: {
              isClassLead: true,
              teacher: { select: { user: { select: { fullName: true } } } }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const selectedStudentId = students.some((s) => s.id === params.studentId) ? params.studentId ?? '' : students[0]?.id ?? '';
  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null;

  const attendanceRows = selectedStudent
    ? await prisma.attendance.findMany({ where: { studentId: selectedStudent.id, date: { gte: fromDate, lte: toDate } }, select: { date: true, status: true } })
    : [];

  const progressRows = selectedStudent
    ? await prisma.studentProgress.findMany({
        where: { studentId: selectedStudent.id, date: { gte: fromDate, lte: toDate } },
        select: { date: true, surahRanges: { select: { sectionKey: true, surahId: true, fromAyah: true, toAyah: true } }, notes: true },
        orderBy: { date: 'asc' }
      })
    : [];

  const resultRows = selectedStudent
    ? await prisma.result.findMany({
        where: { studentId: selectedStudent.id, exam: { examDate: { gte: fromDate, lte: toDate } } },
        select: { marksObtained: true, exam: { select: { examDate: true, title: true, totalMarks: true } }, subject: { select: { name: true } } },
        orderBy: { exam: { examDate: 'asc' } }
      })
    : [];

  const attendanceByDate = new Map<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>();
  for (const row of attendanceRows) attendanceByDate.set(dateKey(row.date), row.status);

  const progressByDate = new Map<string, (typeof progressRows)[number]>();
  for (const row of progressRows) progressByDate.set(dateKey(row.date), row);

  const examByDate = new Map<string, string[]>();
  for (const row of resultRows) {
    const key = dateKey(row.exam.examDate);
    if (!examByDate.has(key)) examByDate.set(key, []);
    examByDate.get(key)?.push(`${row.subject.name}: ${row.marksObtained}/${row.exam.totalMarks} (${row.exam.title})`);
  }

  const rows: { date: Date; attendance: string; sabq: string; sabqi: string; manzil: string; testExam: string }[] = [];
  const cursor = new Date(fromDate);
  const maxRows = 120;
  let rowCount = 0;

  while (cursor <= toDate && rowCount < maxRows) {
    const key = dateKey(cursor);
    const progress = progressByDate.get(key);

    rows.push({
      date: new Date(cursor),
      attendance: statusCode(attendanceByDate.get(key)),
      sabq: progress ? formatRangeItem(progress.surahRanges, 'sabaq') : '-',
      sabqi: progress ? formatRangeItem(progress.surahRanges, 'sabqi') : '-',
      manzil: progress ? formatRangeItem(progress.surahRanges, 'manzil') : '-',
      testExam: examByDate.get(key)?.join(' | ') || progress?.notes || '-'
    });

    cursor.setDate(cursor.getDate() + 1);
    rowCount++;
  }

  const teacherName = selectedStudent?.class?.teacherLinks.find((link) => link.isClassLead)?.teacher.user.fullName ?? selectedStudent?.class?.teacherLinks[0]?.teacher.user.fullName ?? '-';

  const totalPresent = rows.filter((row) => row.attendance === 'P').length;
  const totalAbsent = rows.filter((row) => row.attendance === 'A').length;
  const totalLeave = rows.filter((row) => row.attendance === 'L').length;
  const totalHoliday = rows.reduce((sum, row) => ((row.date.getDay() === 0 || row.date.getDay() === 6) && row.attendance === '-' ? sum + 1 : sum), 0);

  return (
    <div className="space-y-4 pb-8">
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6 print:hidden">
        <Link href="/admin/reports" className="text-xs font-semibold text-[#004649] hover:text-[#1b5e62]">&larr; Back to Reports</Link>
        <h1 className="mt-2 text-2xl font-bold text-[#1a1c1c]">Individual Complete Report</h1>
        <p className="mt-1 text-sm text-[#6f7979]">Date-wise complete sheet with attendance, sabq/sabqi/manzil, and test/exam notes.</p>

        <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" method="get">
          <label className="text-xs font-semibold text-[#6f7979] lg:col-span-1">
            Class
            <select name="classId" defaultValue={selectedClassId} className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]">
              <option value="all">All Classes</option>
              {classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name} {classItem.section}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#6f7979] lg:col-span-2">
            Student
            <select name="studentId" defaultValue={selectedStudentId} className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]">
              {students.map((student) => <option key={student.id} value={student.id}>{student.user.fullName}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#6f7979]">
            From
            <input type="date" name="from" defaultValue={trimToDateInput(fromDate)} className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]" />
          </label>
          <label className="text-xs font-semibold text-[#6f7979]">
            To
            <input type="date" name="to" defaultValue={trimToDateInput(toDate)} className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]" />
          </label>
          <div className="sm:col-span-2 lg:col-span-5"><button type="submit" className="h-10 w-full rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] text-sm font-semibold text-white">Apply</button></div>
        </form>
      </div>

      {selectedStudent ? (
        <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
          <div className="mb-3 flex justify-end print:hidden"><PrintButton /></div>
          <div className="hidden print:block border-b border-[#e5e7eb] pb-2 mb-3">
            <h2 className="text-lg font-bold">Individual Complete Report</h2>
            <p className="text-xs text-[#64748b]">Date: {formatDateLabel(fromDate)} to {formatDateLabel(toDate)}</p>
          </div>
          <h2 className="text-xl font-bold text-[#1a1c1c]">Individual Complete Report</h2>
          <div className="mt-2 grid gap-1 text-sm text-[#374151] sm:grid-cols-2 lg:grid-cols-4">
            <p><span className="font-semibold">Date:</span> {formatDateLabel(fromDate)} to {formatDateLabel(toDate)}</p>
            <p><span className="font-semibold">Name:</span> {selectedStudent.user.fullName}</p>
            <p><span className="font-semibold">Class:</span> {selectedStudent.class ? `${selectedStudent.class.name} ${selectedStudent.class.section}` : 'Unassigned'}</p>
            <p><span className="font-semibold">Teacher:</span> {teacherName}</p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryBadge label="Total Present" value={totalPresent} tone="green" />
            <SummaryBadge label="Total Absent" value={totalAbsent} tone="red" />
            <SummaryBadge label="Total Leave" value={totalLeave} tone="gray" />
            <SummaryBadge label="Total Holiday" value={totalHoliday} tone="blue" />
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-[#e5e7eb]">
            <table className="min-w-[1100px] w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#f8fafc] text-[#475569]">
                  <th className="border-b border-r border-[#e5e7eb] px-3 py-2 text-left font-semibold">Date</th>
                  <th className="border-b border-r border-[#e5e7eb] px-3 py-2 text-left font-semibold">Attendance</th>
                  <th className="border-b border-r border-[#e5e7eb] px-3 py-2 text-left font-semibold">Sabq</th>
                  <th className="border-b border-r border-[#e5e7eb] px-3 py-2 text-left font-semibold">Sabqi</th>
                  <th className="border-b border-r border-[#e5e7eb] px-3 py-2 text-left font-semibold">Manzil</th>
                  <th className="border-b border-[#e5e7eb] px-3 py-2 text-left font-semibold">Test / Exam</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.date.toISOString()} className="hover:bg-[#fafafa]">
                    <td className="border-b border-r border-[#e5e7eb] px-3 py-2 text-[#334155]">{formatDateLabel(row.date)}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-3 py-2 font-semibold text-[#1f2937]">{row.attendance}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-3 py-2 text-[#334155]">{row.sabq}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-3 py-2 text-[#334155]">{row.sabqi}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-3 py-2 text-[#334155]">{row.manzil}</td>
                    <td className="border-b border-[#e5e7eb] px-3 py-2 text-[#334155]">{row.testExam}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-[#6b7280]">Format: P = Present, A = Absent, L = Leave, - = No entry.</p>
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

function SummaryBadge({ label, value, tone }: { label: string; value: number; tone: 'green' | 'red' | 'gray' | 'blue' }) {
  const tones = {
    green: 'bg-[#ecfdf3] text-[#15803d]',
    red: 'bg-[#fff1f2] text-[#be123c]',
    gray: 'bg-[#f3f4f6] text-[#4b5563]',
    blue: 'bg-[#eff6ff] text-[#1d4ed8]'
  } as const;

  return (
    <div className={`rounded-xl px-3 py-2 ${tones[tone]}`}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
