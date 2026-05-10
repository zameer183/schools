import { prisma } from '@/lib/prisma';
import AttendanceReportClient from './report-client';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<{ classId?: string; studentId?: string; month?: string }>;
};

export default async function IndividualAttendanceReportPage({ searchParams }: PageProps) {
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

  const classes = await prisma.class.findMany({
    select: { id: true, name: true, section: true },
    orderBy: [{ name: 'asc' }, { section: 'asc' }]
  });

  const selectedClassId =
    params.classId && classes.some((c) => c.id === params.classId) ? params.classId : 'all';

  const students = await prisma.student.findMany({
    where: selectedClassId !== 'all' ? { classId: selectedClassId } : {},
    select: {
      id: true,
      admissionNo: true,
      rollNumber: true,
      whatsApp: true,
      guardianPhone: true,
      user: { select: { fullName: true, isActive: true } },
      class: { select: { name: true, section: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const selectedStudentId = students.some((s) => s.id === params.studentId)
    ? params.studentId ?? ''
    : students[0]?.id ?? '';

  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null;

  const attendanceRows = selectedStudent
    ? await prisma.attendance.findMany({
        where: { studentId: selectedStudent.id, date: { gte: start, lte: end } },
        select: { date: true, status: true, remarks: true },
        orderBy: { date: 'asc' }
      })
    : [];

  const studentList = students.map((s) => ({
    id: s.id,
    admissionNo: s.admissionNo,
    rollNumber: s.rollNumber,
    whatsApp: s.whatsApp,
    guardianPhone: s.guardianPhone,
    fullName: s.user.fullName,
    isActive: s.user.isActive,
    className: s.class ? `${s.class.name} ${s.class.section}` : null
  }));

  const selectedStudentSerialized = selectedStudent
    ? {
        id: selectedStudent.id,
        admissionNo: selectedStudent.admissionNo,
        rollNumber: selectedStudent.rollNumber,
        whatsApp: selectedStudent.whatsApp,
        guardianPhone: selectedStudent.guardianPhone,
        fullName: selectedStudent.user.fullName,
        isActive: selectedStudent.user.isActive,
        className: selectedStudent.class
          ? `${selectedStudent.class.name} ${selectedStudent.class.section}`
          : null
      }
    : null;

  return (
    <AttendanceReportClient
      classes={classes}
      students={studentList}
      selectedClassId={selectedClassId}
      selectedStudentId={selectedStudentId}
      selectedStudent={selectedStudentSerialized}
      attendance={attendanceRows.map((r) => ({
        date: r.date.toISOString(),
        status: r.status,
        remarks: r.remarks ?? null
      }))}
      monthKey={monthKey}
    />
  );
}
