import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  ensureTeacherControlTables,
  type TeacherAccessLevel,
  type TeacherAccessLevelMap,
  TEACHER_ACCESS_MODULES,
  getTeacherAccessLevelMapsByTeacherIds,
  getTeacherCompensationsByTeacherIds
} from '@/lib/teacher-access';
import AdminTeachersPageClient from './page.client';

export const dynamic = 'force-dynamic';

type RestTeacher = {
  id: string;
  userId: string;
  employeeCode: string | null;
  qualification: string | null;
  specialization: string | null;
  joiningDate: string | null;
  createdAt: string;
};

type RestUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
};

type RestClass = {
  id: string;
  name: string;
  section: string;
};

type RestTeacherClass = {
  teacherId: string;
  classId: string;
  createdAt: string;
};

type RestTeacherAccess = {
  teacherId: string;
  module: string | null;
  enabled: boolean;
  level: string | null;
};

type RestTeacherCompensation = {
  teacherId: string;
  baseSalary: number | string;
  bonus: number | string;
  deduction: number | string;
};

const DEFAULT_ACCESS_LEVELS: TeacherAccessLevelMap = TEACHER_ACCESS_MODULES.reduce((acc, moduleKey) => {
  acc[moduleKey] = moduleKey === 'FEES' ? 'NONE' : 'FULL';
  return acc;
}, {} as TeacherAccessLevelMap);

function isDatabaseConnectionError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'PrismaClientInitializationError' ||
      error.message.includes("Can't reach database server") ||
      error.message.includes('Timed out fetching a new connection'))
  );
}

async function supabaseRest<T>(table: string, params: Record<string, string>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase REST fallback is not configured');
  }

  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Supabase REST ${table} failed with ${response.status}`);
  }

  return (await response.json()) as T[];
}

function inFilter(ids: string[]) {
  return `in.(${ids.join(',')})`;
}

function asAccessLevel(value: string | null | undefined, enabled: boolean): TeacherAccessLevel {
  if (value === 'NONE' || value === 'VIEW' || value === 'MANAGE' || value === 'FULL') return value;
  return enabled ? 'FULL' : 'NONE';
}

async function getTeachersDataViaSupabaseRest() {
  const [teachers, classes, classLinks, accessRows, compensationRows] = await Promise.all([
    supabaseRest<RestTeacher>('Teacher', {
      select: 'id,userId,employeeCode,qualification,specialization,joiningDate,createdAt',
      order: 'createdAt.desc'
    }),
    supabaseRest<RestClass>('Class', {
      select: 'id,name,section',
      order: 'name.asc,section.asc'
    }),
    supabaseRest<RestTeacherClass>('TeacherClass', {
      select: 'teacherId,classId,createdAt',
      order: 'createdAt.asc'
    }),
    supabaseRest<RestTeacherAccess>('TeacherAccess', {
      select: 'teacherId,module,enabled,level'
    }),
    supabaseRest<RestTeacherCompensation>('TeacherCompensation', {
      select: 'teacherId,baseSalary,bonus,deduction'
    })
  ]);

  const userIds = Array.from(new Set(teachers.map((teacher) => teacher.userId).filter(Boolean)));
  const users = userIds.length
    ? await supabaseRest<RestUser>('User', {
        select: 'id,email,fullName,phone,isActive',
        id: inFilter(userIds)
      })
    : [];

  const userById = new Map(users.map((user) => [user.id, user]));
  const classById = new Map(classes.map((cls) => [cls.id, cls]));
  const linksByTeacherId = new Map<string, RestTeacherClass[]>();
  for (const link of classLinks) {
    linksByTeacherId.set(link.teacherId, [...(linksByTeacherId.get(link.teacherId) ?? []), link]);
  }

  const accessByTeacherId = new Map<string, TeacherAccessLevelMap>();
  for (const row of accessRows) {
    const moduleKey = row.module as keyof TeacherAccessLevelMap;
    if (!TEACHER_ACCESS_MODULES.includes(moduleKey)) continue;
    const current = accessByTeacherId.get(row.teacherId) ?? { ...DEFAULT_ACCESS_LEVELS };
    current[moduleKey] = asAccessLevel(row.level, row.enabled);
    accessByTeacherId.set(row.teacherId, current);
  }

  const compensationByTeacherId = new Map(
    compensationRows.map((row) => {
      const baseSalary = Number(row.baseSalary ?? 0);
      const bonus = Number(row.bonus ?? 0);
      const deduction = Number(row.deduction ?? 0);
      return [
        row.teacherId,
        {
          baseSalary,
          bonus,
          deduction,
          netSalary: baseSalary + bonus - deduction
        }
      ];
    })
  );

  const enrichedTeachers = teachers.map((teacher) => ({
    ...teacher,
    user: userById.get(teacher.userId) ?? {
      id: teacher.userId,
      email: '',
      fullName: 'Unknown Teacher',
      phone: null,
      isActive: false
    },
    classAssignments: (linksByTeacherId.get(teacher.id) ?? []).map((link) => ({
      classId: link.classId,
      class: classById.get(link.classId) ?? {
        id: link.classId,
        name: 'Unknown Class',
        section: ''
      }
    })),
    access: accessByTeacherId.get(teacher.id) ?? { ...DEFAULT_ACCESS_LEVELS },
    compensation: compensationByTeacherId.get(teacher.id) ?? {
      baseSalary: 0,
      bonus: 0,
      deduction: 0,
      netSalary: 0
    }
  }));

  return { enrichedTeachers, classes, teachersCount: teachers.length };
}

async function getTeachersData() {
  await ensureTeacherControlTables();

  const [teachers, classes] = await Promise.all([
    prisma.teacher.findMany({
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
          select: {
            classId: true,
            class: {
              select: {
                id: true,
                name: true,
                section: true
              }
            }
          },
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
    getTeacherAccessLevelMapsByTeacherIds(teacherIds),
    getTeacherCompensationsByTeacherIds(teacherIds)
  ]);

  const enrichedTeachers = teachers.map((teacher) => ({
    ...teacher,
    access: accessByTeacherId[teacher.id],
    compensation: compensationByTeacherId[teacher.id]
  }));

  return { enrichedTeachers, classes, teachersCount: teachers.length };
}

const getCachedTeachersData = unstable_cache(
  async (mode: string) => {
    return mode === 'rest'
      ? await getTeachersDataViaSupabaseRest()
      : await getTeachersData();
  },
  ['admin-teachers-page-data'],
  { revalidate: 30 }
);

export default async function AdminTeachersPage() {
  const t0 = Date.now();
  await requireAuth([UserRole.ADMIN]);
  const cacheMode = process.env.FORCE_SUPABASE_REST_DATA_FALLBACK === '1' ? 'rest' : 'prisma';
  let data: Awaited<ReturnType<typeof getTeachersDataViaSupabaseRest>>;
  try {
    data = (await getCachedTeachersData(cacheMode)) as Awaited<ReturnType<typeof getTeachersDataViaSupabaseRest>>;
  } catch (error) {
    if (!isDatabaseConnectionError(error)) throw error;
    data = await getTeachersDataViaSupabaseRest();
  }

  const { enrichedTeachers, classes, teachersCount } = data;

  console.log('[admin/teachers] timing_ms', {
    total: Date.now() - t0,
    teachersCount,
    classesCount: classes.length
  });

  return <AdminTeachersPageClient initialTeachers={enrichedTeachers} initialClasses={classes} />;
}
