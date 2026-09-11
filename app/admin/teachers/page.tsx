import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  ensureTeacherControlTables,
  getTeacherAccessLevelMapsByTeacherIds,
  getTeacherCompensationsByTeacherIds
} from '@/lib/teacher-access';
import AdminTeachersPageClient from './page.client';

export const dynamic = 'force-dynamic';

export default async function AdminTeachersPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const t0 = Date.now();
  await requireAuth([UserRole.ADMIN]);
  await ensureTeacherControlTables();

  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search = (searchParams.search as string) || '';
  const view = (searchParams.view as string) || 'grid';
  const pageSize = view === 'grid' ? 9 : 15;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (search) {
    where.OR = [
      { user: { fullName: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { specialization: { contains: search, mode: 'insensitive' } },
      { qualification: { contains: search, mode: 'insensitive' } },
      { employeeCode: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [total, active, uniqueClassesRows, allCompensations] = await Promise.all([
    prisma.teacher.count(),
    prisma.teacher.count({ where: { user: { isActive: true } } }),
    prisma.teacherClass.findMany({ select: { classId: true } }),
    prisma.teacherCompensation.findMany({ select: { baseSalary: true, bonus: true, deduction: true } })
  ]);

  const uniqueClasses = new Set(uniqueClassesRows.map((r: any) => r.classId)).size;
  const avgSalary = total > 0 ? allCompensations.reduce((sum: number, c: any) => sum + (Number(c.baseSalary||0) + Number(c.bonus||0) - Number(c.deduction||0)), 0) / total : 0;

  const totalFiltered = await prisma.teacher.count({ where });

  const [teachers, classes] = await Promise.all([
    prisma.teacher.findMany({
      where,
      select: {
        id: true,
        employeeCode: true,
        qualification: true,
        specialization: true,
        joiningDate: true,
        user: {
          select: { id: true, fullName: true, email: true, phone: true, isActive: true }
        },
        classAssignments: {
          select: { classId: true, class: { select: { id: true, name: true, section: true } } },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip, take: pageSize
    }),
    prisma.class.findMany({
      select: { id: true, name: true, section: true },
      orderBy: [{ name: 'asc' }, { section: 'asc' }]
    })
  ]);

  const teacherIds = teachers.map((t: any) => t.id);
  const [accessByTeacherId, compensationByTeacherId] = await Promise.all([
    getTeacherAccessLevelMapsByTeacherIds(teacherIds),
    getTeacherCompensationsByTeacherIds(teacherIds)
  ]);

  const enrichedTeachers = teachers.map((teacher: any) => ({
    ...teacher,
    access: accessByTeacherId[teacher.id],
    compensation: compensationByTeacherId[teacher.id]
  }));

  return <AdminTeachersPageClient 
    initialTeachers={enrichedTeachers as any} 
    initialClasses={classes} 
    totalFiltered={totalFiltered}
    stats={{ total, active, uniqueClasses, avgSalary }}
    currentPage={page}
    pageSize={pageSize}
    viewMode={view as 'grid'|'table'}
    searchQ={search}
  />;
}
