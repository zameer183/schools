import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import StudentAttendanceClient from './attendance-client';

export const dynamic = 'force-dynamic';

async function getStudentAttendanceData(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
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
      },
      fees: {
        select: { title: true, amount: true, status: true },
        take: 1,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!student) notFound();
  return student;
}

export default async function StudentAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth([UserRole.ADMIN]);
  const { id } = await params;
  const student = await getStudentAttendanceData(id);

  const serializedStudent = {
    id: student.id,
    admissionNo: student.admissionNo,
    classId: student.classId,
    user: student.user,
    class: student.class,
    whatsApp: student.whatsApp,
    guardianPhone: student.guardianPhone,
    attendance: student.attendance.map((a) => ({
      id: a.id,
      date: a.date instanceof Date ? a.date.toISOString() : a.date,
      status: a.status,
      remarks: a.remarks ?? null
    })),
    joinDate: student.joinDate instanceof Date ? student.joinDate.toISOString() : student.joinDate
  };

  return <StudentAttendanceClient student={serializedStudent} />;
}
