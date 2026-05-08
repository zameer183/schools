import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminClassesPageClient from './page.client';

export const dynamic = 'force-dynamic';

export default async function AdminClassesPage() {
  await requireAuth([UserRole.ADMIN]);
  const [classes, teachers] = await Promise.all([
    prisma.class.findMany({
      include: {
        teacherLinks: {
          include: {
            teacher: {
              include: {
                user: { select: { fullName: true } }
              }
            }
          },
          orderBy: { createdAt: 'asc' },
          take: 1
        },
        _count: { select: { students: true } }
      },
      orderBy: [{ name: 'asc' }, { section: 'asc' }]
    }),
    prisma.teacher.findMany({
      select: { id: true, user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  return <AdminClassesPageClient initialClasses={classes} initialTeachers={teachers} />;
}
