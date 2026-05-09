import { notFound } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import TeacherProfileClient from './profile-client';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ teacherId: string }> };

export default async function TeacherDetailPage({ params }: Props) {
  await requireAuth([UserRole.ADMIN]);
  const { teacherId } = await params;

  const [teacher, allClasses] = await Promise.all([
    prisma.teacher.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        employeeCode: true,
        qualification: true,
        specialization: true,
        joiningDate: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            isActive: true
          }
        },
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
            },
          }
        },
        subjects: {
          select: { id: true, name: true, code: true, class: { select: { name: true, section: true } } }
        },
        accessControls: {
          select: { module: true, enabled: true }
        },
        compensation: {
          select: { baseSalary: true, bonus: true, deduction: true }
        }
      }
    }),
    prisma.class.findMany({
      select: { id: true, name: true, section: true, academicYear: true },
      orderBy: [{ name: 'asc' }, { section: 'asc' }]
    })
  ]);

  if (!teacher) notFound();

  return (
    <TeacherProfileClient
      teacher={{
        ...teacher,
        joiningDate: teacher.joiningDate?.toISOString() ?? null,
        compensation: teacher.compensation
          ? {
              baseSalary: Number(teacher.compensation.baseSalary),
              bonus: Number(teacher.compensation.bonus),
              deduction: Number(teacher.compensation.deduction)
            }
          : null
      }}
      allClasses={allClasses}
    />
  );
}
