import { UserRole } from '@prisma/client';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import StudentAttendanceClient from '../../../../admin/students/[id]/attendance/attendance-client';

export const dynamic = 'force-dynamic';

async function getTeacherStudentAttendanceData(userId: string, studentId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: {
      classAssignments: { select: { classId: true } },
      subjects: { select: { classId: true } }
    }
  });

  if (!teacher) notFound();

  const allowedClassIds = Array.from(
    new Set([
      ...teacher.classAssignments.map((item) => item.classId),
      ...teacher.subjects.map((item) => item.classId)
    ])
  );

  if (allowedClassIds.length === 0) notFound();

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      classId: { in: allowedClassIds }
    },
    select: {
      id: true,
      admissionNo: true,
      joinDate: true,
      whatsApp: true,
      guardianPhone: true,
      user: { select: { fullName: true, isActive: true } },
      class: { select: { name: true, section: true } },
      classId: true,
      attendance: {
        select: { id: true, date: true, status: true, remarks: true },
        orderBy: { date: 'desc' }
      }
    }
  });

  if (!student) notFound();
  return student;
}

export default async function TeacherStudentAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth([UserRole.TEACHER]);
  const { id } = await params;
  const student = await getTeacherStudentAttendanceData(session.id, id);

  const serializedStudent = {
    id: student.id,
    admissionNo: student.admissionNo,
    classId: student.classId,
    user: student.user,
    class: student.class,
    whatsApp: student.whatsApp,
    guardianPhone: student.guardianPhone,
    attendance: student.attendance.map((attendance) => ({
      id: attendance.id,
      date: attendance.date instanceof Date ? attendance.date.toISOString() : attendance.date,
      status: attendance.status,
      remarks: attendance.remarks ?? null
    })),
    joinDate: student.joinDate instanceof Date ? student.joinDate.toISOString() : student.joinDate
  };

  return (
    <StudentAttendanceClient
      student={serializedStudent}
      backHref={`/teacher/students/${student.id}`}
      backLabel="Back to Student"
      canDelete
    />
  );
}
