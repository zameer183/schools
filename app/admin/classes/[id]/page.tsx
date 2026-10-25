import { UserRole } from '@prisma/client';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ClassDetailsPageClient from './page.client';

export const dynamic = 'force-dynamic';

type ClassDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClassDetailsPage({ params }: ClassDetailsPageProps) {
  await requireAuth([UserRole.ADMIN, UserRole.TEACHER]);
  const { id } = await params;

  const klass = await prisma.class.findUnique({
    where: { id },
    include: {
      subjects: { select: { id: true, name: true, code: true } },
      teacherLinks: {
        include: {
          teacher: {
            select: {
              id: true,
              employeeCode: true,
              user: { select: { fullName: true, email: true, phone: true } }
            }
          }
        }
      },
      progressLogs: {
        select: {
          id: true,
          date: true,
          lessonType: true,
          lessonNumber: true,
          ayahFrom: true,
          ayahTo: true,
          notes: true,
          tajweeditotal: true,
          hifzTotal: true
        },
        orderBy: { date: 'desc' },
        take: 20
      },
      students: {
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true } },
          attendance: { select: { status: true, date: true }, orderBy: { date: 'desc' }, take: 30 },
          results: { select: { grade: true, marks: true, totalMarks: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 3 },
          fees: { select: { id: true, title: true, status: true, amount: true, dueDate: true }, orderBy: { dueDate: 'desc' }, take: 8 },
          progressLogs: { select: { date: true, ayahFrom: true, ayahTo: true, notes: true }, orderBy: { date: 'desc' }, take: 1 }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!klass) notFound();

  // Also query additional students linked via StudentClass table (if any)
  const additionalStudentLinks = await prisma.$queryRaw<Array<{ studentId: string }>>`
    SELECT "studentId" FROM "StudentClass" WHERE "classId" = ${id}
  `.catch(() => []);

  const existingStudentIds = new Set(klass.students.map(s => s.id));
  const missingStudentIds = additionalStudentLinks
    .map(l => l.studentId)
    .filter(sid => !existingStudentIds.has(sid));

  let extraStudents: any[] = [];
  if (missingStudentIds.length > 0) {
    extraStudents = await prisma.student.findMany({
      where: { id: { in: missingStudentIds } },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        attendance: { select: { status: true, date: true }, orderBy: { date: 'desc' }, take: 30 },
        results: { select: { grade: true, marks: true, totalMarks: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 3 },
        fees: { select: { id: true, title: true, status: true, amount: true, dueDate: true }, orderBy: { dueDate: 'desc' }, take: 8 },
        progressLogs: { select: { date: true, ayahFrom: true, ayahTo: true, notes: true }, orderBy: { date: 'desc' }, take: 1 }
      }
    }).catch(() => []);
  }

  const allStudents = [...klass.students, ...extraStudents];

  const serialized = {
    ...klass,
    students: allStudents.map(s => ({
      ...s,
      fatherName: s.fatherName || null,
      gender: s.gender || null,
      whatsApp: s.whatsApp || null,
      rollNumber: s.rollNumber || null,
      fees: s.fees.map((f: any) => ({
        ...f,
        amount: Number(f.amount),
      })),
    })),
  };

  return <ClassDetailsPageClient initialClass={serialized} />;
}
