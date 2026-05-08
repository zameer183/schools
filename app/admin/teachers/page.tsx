import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  ensureTeacherControlTables,
  getTeacherAccessMapsByTeacherIds,
  getTeacherCompensationsByTeacherIds
} from '@/lib/teacher-access';
import AdminTeachersPageClient from './page.client';

export const dynamic = 'force-dynamic';

const getCachedTeachersData = unstable_cache(
  async () => {
    await ensureTeacherControlTables();

    const [teachers, classes] = await Promise.all([
      prisma.teacher.findMany({
        include: {
          user: true,
          classAssignments: {
            include: { class: true },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.class.findMany({
        select: { id: true, name: true, section: true },
        orderBy: [{ name: 'asc' }, { section: 'asc' }]
      })
    ]);

    const teacherIds = teachers.map((teacher) => teacher.id);
    const [accessByTeacherId, compensationByTeacherId] = await Promise.all([
      getTeacherAccessMapsByTeacherIds(teacherIds),
      getTeacherCompensationsByTeacherIds(teacherIds)
    ]);

    const enrichedTeachers = teachers.map((teacher) => ({
      ...teacher,
      access: accessByTeacherId[teacher.id],
      compensation: compensationByTeacherId[teacher.id]
    }));

    return { enrichedTeachers, classes, teachersCount: teachers.length };
  },
  ['admin-teachers-page-data'],
  { revalidate: 30 }
);

export default async function AdminTeachersPage() {
  const t0 = Date.now();
  await requireAuth([UserRole.ADMIN]);
  const { enrichedTeachers, classes, teachersCount } = await getCachedTeachersData();

  console.log('[admin/teachers] timing_ms', {
    total: Date.now() - t0,
    teachersCount,
    classesCount: classes.length
  });

  return <AdminTeachersPageClient initialTeachers={enrichedTeachers} initialClasses={classes} />;
}
