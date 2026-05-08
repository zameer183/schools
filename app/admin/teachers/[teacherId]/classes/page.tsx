import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import TeacherClassesClient from './classes-client';

export const dynamic = 'force-dynamic';

async function getTeacherWithClasses(teacherId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: {
      user: { select: { fullName: true, isActive: true } },
      classAssignments: {
        include: {
          class: {
            select: {
              id: true,
              name: true,
              section: true,
              academicYear: true,
              _count: { select: { students: true } }
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!teacher) notFound();
  return teacher;
}

export default async function TeacherClassesPage({ params }: { params: Promise<{ teacherId: string }> }) {
  await requireAuth([UserRole.ADMIN]);
  const { teacherId } = await params;
  const teacher = await getTeacherWithClasses(teacherId);

  const serializedTeacher = {
    id: teacher.id,
    name: teacher.user!.fullName,
    isActive: teacher.user!.isActive,
    classes: teacher.classAssignments.map((assignment) => ({
      id: assignment.class.id,
      name: assignment.class.name,
      section: assignment.class.section,
      academicYear: assignment.class.academicYear,
      studentCount: assignment.class._count.students
    }))
  };

  return <TeacherClassesClient teacher={serializedTeacher} />;
}
