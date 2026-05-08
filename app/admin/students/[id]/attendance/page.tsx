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
      attendance: {
        select: { date: true, status: true },
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
    user: student.user,
    class: student.class,
    whatsApp: student.whatsApp,
    guardianPhone: student.guardianPhone,
    attendance: student.attendance.map((a) => ({
      date: a.date instanceof Date ? a.date.toISOString() : a.date,
      status: a.status
    })),
    joinDate: student.joinDate instanceof Date ? student.joinDate.toISOString() : student.joinDate
  };

  return <StudentAttendanceClient student={serializedStudent} />;
}
