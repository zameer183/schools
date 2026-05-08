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
      teacherLinks: {
        include: { teacher: { include: { user: { select: { fullName: true, email: true, phone: true } } } } }
      },
      students: {
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true } },
          attendance: { select: { id: true, date: true, status: true } },
          results: { select: { id: true, grade: true, marksObtained: true } },
          fees: { select: { id: true, status: true, amount: true, dueDate: true } }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!klass) notFound();

  const serialized = {
    ...klass,
    students: klass.students.map(s => ({
      ...s,
      fees: s.fees.map(f => ({
        ...f,
        amount: Number(f.amount),
      })),
    })),
  };

  return <ClassDetailsPageClient initialClass={serialized} />;
}
