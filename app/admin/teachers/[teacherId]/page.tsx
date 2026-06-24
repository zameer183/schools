import { notFound } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import TeacherProfileClient from './profile-client';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ teacherId: string }> };

type RestTeacher = {
  id: string;
  userId: string;
  employeeCode: string;
  qualification: string | null;
  specialization: string | null;
  joiningDate: string | null;
};

type RestUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
};

type RestClass = {
  id: string;
  name: string;
  section: string;
  academicYear: string;
};

type RestTeacherClass = {
  teacherId: string;
  classId: string;
  isClassLead: boolean;
};

type RestSubject = {
  id: string;
  name: string;
  code: string;
  classId: string;
};

type RestAccess = {
  module: string | null;
  enabled: boolean;
};

type RestCompensation = {
  baseSalary: number | string;
  bonus: number | string;
  deduction: number | string;
};

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

async function getTeacherDetailViaSupabaseRest(teacherId: string) {
  const [teacher] = await supabaseRest<RestTeacher>('Teacher', {
    select: 'id,userId,employeeCode,qualification,specialization,joiningDate',
    id: `eq.${teacherId}`,
    limit: '1'
  });
  if (!teacher) return null;

  const [userRows, allClasses, classAssignments, subjects, accessControls, compensationRows] = await Promise.all([
    supabaseRest<RestUser>('User', {
      select: 'id,fullName,email,phone,isActive',
      id: `eq.${teacher.userId}`,
      limit: '1'
    }),
    supabaseRest<RestClass>('Class', {
      select: 'id,name,section,academicYear',
      order: 'name.asc,section.asc'
    }),
    supabaseRest<RestTeacherClass>('TeacherClass', {
      select: 'teacherId,classId,isClassLead',
      teacherId: `eq.${teacherId}`
    }),
    supabaseRest<RestSubject>('Subject', {
      select: 'id,name,code,classId',
      teacherId: `eq.${teacherId}`
    }),
    supabaseRest<RestAccess>('TeacherAccess', {
      select: 'module,enabled',
      teacherId: `eq.${teacherId}`
    }),
    supabaseRest<RestCompensation>('TeacherCompensation', {
      select: 'baseSalary,bonus,deduction',
      teacherId: `eq.${teacherId}`,
      limit: '1'
    })
  ]);

  const classById = new Map(allClasses.map((cls) => [cls.id, cls]));
  const classIds = classAssignments.map((item) => item.classId);
  const students = classIds.length
    ? await supabaseRest<{ classId: string }>('Student', {
        select: 'classId',
        classId: inFilter(classIds)
      })
    : [];
  const studentCountByClassId = new Map<string, number>();
  for (const student of students) {
    studentCountByClassId.set(student.classId, (studentCountByClassId.get(student.classId) ?? 0) + 1);
  }

  const user = userRows[0];
  const compensation = compensationRows[0];

  return {
    teacher: {
      id: teacher.id,
      employeeCode: teacher.employeeCode,
      qualification: teacher.qualification,
      specialization: teacher.specialization,
      joiningDate: teacher.joiningDate,
      user: user ?? {
        id: teacher.userId,
        fullName: 'Unknown Teacher',
        email: '',
        phone: null,
        isActive: false
      },
      classAssignments: classAssignments.map((item) => {
        const cls = classById.get(item.classId) ?? {
          id: item.classId,
          name: 'Unknown Class',
          section: '',
          academicYear: ''
        };

        return {
          isClassLead: item.isClassLead,
          class: {
            ...cls,
            _count: { students: studentCountByClassId.get(item.classId) ?? 0 }
          }
        };
      }),
      subjects: subjects.map((subject) => {
        const cls = classById.get(subject.classId);
        return {
          id: subject.id,
          name: subject.name,
          code: subject.code,
          class: {
            name: cls?.name ?? 'Unknown Class',
            section: cls?.section ?? ''
          }
        };
      }),
      accessControls: accessControls
        .filter((item) => item.module)
        .map((item) => ({ module: item.module ?? '', enabled: item.enabled })),
      compensation: compensation
        ? {
            baseSalary: Number(compensation.baseSalary),
            bonus: Number(compensation.bonus),
            deduction: Number(compensation.deduction)
          }
        : null
    },
    allClasses
  };
}

export default async function TeacherDetailPage({ params }: Props) {
  await requireAuth([UserRole.ADMIN]);
  const { teacherId } = await params;

  if (process.env.FORCE_SUPABASE_REST_DATA_FALLBACK === '1') {
    const data = await getTeacherDetailViaSupabaseRest(teacherId);
    if (!data) notFound();
    return <TeacherProfileClient teacher={data.teacher} allClasses={data.allClasses} />;
  }

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
