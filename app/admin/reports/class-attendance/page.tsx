import { prisma } from '@/lib/prisma';
import ClassAttendanceClient from './class-attendance-client';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<{ classId?: string; month?: string }>;
};

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

export default async function ClassAttendanceReportPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  const now = new Date();
  const monthKey =
    params.month && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const start = new Date(year, month - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, month, 0);
  end.setHours(23, 59, 59, 999);
  const monthLabel = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const classes = await prisma.class.findMany({
    select: {
      id: true,
      name: true,
      section: true,
      teacherLinks: {
        select: { isClassLead: true, teacher: { select: { user: { select: { fullName: true } } } } }
      }
    },
    orderBy: [{ name: 'asc' }, { section: 'asc' }]
  });

  const selectedClassId =
    classes.some((c) => c.id === params.classId) ? params.classId ?? '' : classes[0]?.id ?? '';
  const selectedClassRaw = classes.find((c) => c.id === selectedClassId) ?? null;

  const students = selectedClassRaw
    ? await prisma.student.findMany({
        where: { classId: selectedClassRaw.id },
        select: { id: true, rollNumber: true, user: { select: { fullName: true } } },
        orderBy: { rollNumber: 'asc' }
      })
    : [];

  const attendance = selectedClassRaw
    ? await prisma.attendance.findMany({
        where: { classId: selectedClassRaw.id, date: { gte: start, lte: end } },
        select: { studentId: true, date: true, status: true }
      })
    : [];

  // Build per-student date maps
  const rowsByStudent = new Map<string, Map<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>();
  for (const row of attendance) {
    if (!rowsByStudent.has(row.studentId)) rowsByStudent.set(row.studentId, new Map());
    rowsByStudent.get(row.studentId)!.set(dateKey(row.date), row.status);
  }

  const totalDays = new Date(year, month, 0).getDate();
  const dayColumns = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Build student rows
  let overallPresent = 0;
  let overallAbsent = 0;
  let overallLeave = 0;

  const studentRows = students.map((student) => {
    const dayMap = rowsByStudent.get(student.id) ?? new Map();
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLeave = 0;

    const codes = dayColumns.map((day) => {
      const d = new Date(year, month - 1, day);
      const key = dateKey(d);
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      const code = codeForStatus(dayMap.get(key), weekend);
      if (code === 'P') totalPresent++;
      if (code === 'A') totalAbsent++;
      if (code === 'L') totalLeave++;
      return code;
    });

    overallPresent += totalPresent;
    overallAbsent += totalAbsent;
    overallLeave += totalLeave;

    return {
      id: student.id,
      fullName: student.user.fullName,
      rollNumber: student.rollNumber,
      codes,
      totalPresent,
      totalAbsent,
      totalLeave
    };
  });

  const leadTeacher =
    selectedClassRaw?.teacherLinks.find((l) => l.isClassLead)?.teacher.user.fullName ??
    selectedClassRaw?.teacherLinks[0]?.teacher.user.fullName ??
    '-';

  const selectedClass = selectedClassRaw
    ? { id: selectedClassRaw.id, name: selectedClassRaw.name, section: selectedClassRaw.section, leadTeacher }
    : null;

  return (
    <ClassAttendanceClient
      classes={classes.map((c) => ({ id: c.id, name: c.name, section: c.section }))}
      selectedClassId={selectedClassId}
      selectedClass={selectedClass}
      monthKey={monthKey}
      monthLabel={monthLabel}
      dayColumns={dayColumns}
      students={studentRows}
      overallPresent={overallPresent}
      overallAbsent={overallAbsent}
      overallLeave={overallLeave}
    />
  );
}
