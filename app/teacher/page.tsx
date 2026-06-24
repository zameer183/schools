import Link from 'next/link';
import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatusBadge } from '@/components/ui';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  TrendingUp,
  Users2,
  WifiOff
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type RestTeacherDashboardTeacher = {
  id: string;
  userId: string;
  user: { fullName: string };
  classAssignments: Array<{
    classId: string;
    isClassLead: boolean;
    class: {
      name: string;
      section: string;
      _count: { students: number };
    };
  }>;
  subjects: Array<{
    id: string;
    name: string;
    code: string;
    classId: string;
    class: {
      name: string;
      section: string;
      _count: { students: number };
    };
  }>;
};

type RestTeacher = {
  id: string;
  userId: string;
};

type RestUser = {
  id: string;
  fullName: string;
};

type RestTeacherClass = {
  teacherId: string;
  classId: string;
  isClassLead: boolean | null;
  createdAt: string;
};

type RestSubject = {
  id: string;
  name: string;
  code: string;
  classId: string;
};

type RestClass = {
  id: string;
  name: string;
  section: string;
};

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

async function getTeacherDashboardDataViaSupabaseRest(userId: string, dayKey: string) {
  const [teacher] = await supabaseRest<RestTeacher>('Teacher', {
    select: 'id,userId',
    userId: `eq.${userId}`,
    limit: '1'
  });

  if (!teacher) {
    return {
      teacher: null,
      attendanceToday: 0,
      progressCount: 0
    };
  }

  const [userRows, classLinks, subjects, attendanceRows] = await Promise.all([
    supabaseRest<RestUser>('User', {
      select: 'id,fullName',
      id: `eq.${teacher.userId}`,
      limit: '1'
    }),
    supabaseRest<RestTeacherClass>('TeacherClass', {
      select: 'teacherId,classId,isClassLead,createdAt',
      teacherId: `eq.${teacher.id}`,
      order: 'createdAt.asc'
    }),
    supabaseRest<RestSubject>('Subject', {
      select: 'id,name,code,classId',
      teacherId: `eq.${teacher.id}`,
      order: 'name.asc'
    }),
    supabaseRest<{ id: string }>('Attendance', {
      select: 'id',
      markedById: `eq.${teacher.id}`,
      and: `(date.gte.${dayKey}T00:00:00.000Z,date.lte.${dayKey}T23:59:59.999Z)`
    })
  ]);

  const classIds = Array.from(new Set([
    ...classLinks.map((link) => link.classId),
    ...subjects.map((subject) => subject.classId)
  ].filter(Boolean)));

  const [classes, students, exams] = await Promise.all([
    classIds.length
      ? supabaseRest<RestClass>('Class', {
          select: 'id,name,section',
          id: inFilter(classIds)
        })
      : Promise.resolve([]),
    classIds.length
      ? supabaseRest<{ id: string; classId: string }>('Student', {
          select: 'id,classId',
          classId: inFilter(classIds)
        })
      : Promise.resolve([]),
    classIds.length
      ? supabaseRest<{ id: string }>('Exam', {
          select: 'id',
          classId: inFilter(classIds)
        })
      : Promise.resolve([])
  ]);

  const examIds = exams.map((exam) => exam.id);
  const resultRows = examIds.length
    ? await supabaseRest<{ id: string }>('Result', {
        select: 'id',
        examId: inFilter(examIds)
      })
    : [];

  const classById = new Map(classes.map((item) => [item.id, item]));
  const studentCountByClassId = new Map<string, number>();
  for (const student of students) {
    studentCountByClassId.set(student.classId, (studentCountByClassId.get(student.classId) ?? 0) + 1);
  }

  const classPayload = (classId: string) => {
    const cls = classById.get(classId);
    return {
      name: cls?.name ?? 'Unknown Class',
      section: cls?.section ?? '',
      _count: { students: studentCountByClassId.get(classId) ?? 0 }
    };
  };

  const dashboardTeacher: RestTeacherDashboardTeacher = {
    ...teacher,
    user: { fullName: userRows[0]?.fullName ?? 'Teacher' },
    classAssignments: classLinks.map((link) => ({
      classId: link.classId,
      isClassLead: Boolean(link.isClassLead),
      class: classPayload(link.classId)
    })),
    subjects: subjects.map((subject) => ({
      ...subject,
      class: classPayload(subject.classId)
    }))
  };

  return {
    teacher: dashboardTeacher,
    attendanceToday: attendanceRows.length,
    progressCount: resultRows.length
  };
}

function DbOfflineBanner() {
  return (
    <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(43,103,110,0.06)] p-8">
      <div className="flex flex-col items-center py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fef2f2]">
          <WifiOff className="h-7 w-7 text-[#ef4444]" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-[#1a1c1c]">Database Unreachable</h2>
        <p className="mt-2 text-sm text-[#6f7979]">Unable to load teacher dashboard data. Please refresh.</p>
      </div>
    </div>
  );
}

const getCachedTeacherDashboardData = unstable_cache(
  async (userId: string, dayKey: string) => {
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: {
        user: { select: { fullName: true } },
        classAssignments: {
          include: {
            class: {
              include: { _count: { select: { students: true } } }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        subjects: {
          select: {
            id: true,
            name: true,
            code: true,
            classId: true,
            class: { select: { name: true, section: true, _count: { select: { students: true } } } }
          },
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!teacher) {
      return {
        teacher: null,
        attendanceToday: 0
      };
    }

    const startOfDay = new Date(`${dayKey}T00:00:00.000Z`);
    const endOfDay = new Date(`${dayKey}T23:59:59.999Z`);

    const classIds = Array.from(new Set([
      ...teacher.classAssignments.map((item) => item.classId),
      ...teacher.subjects.map((subject) => subject.classId)
    ]));

    const [attendanceToday, progressCount] = await Promise.all([
      prisma.attendance.count({
        where: {
          markedById: teacher.id,
          date: { gte: startOfDay, lte: endOfDay }
        }
      }),
      classIds.length
        ? prisma.result.count({
            where: {
              exam: {
                classId: { in: classIds }
              }
            }
          })
        : Promise.resolve(0)
    ]);

    return { teacher, attendanceToday, progressCount };
  },
  ['teacher-dashboard-page-data'],
  { revalidate: 30 }
);

export default async function TeacherDashboardPage() {
  const session = await requireAuth([UserRole.TEACHER, UserRole.ADMIN]);
  const dayKey = new Date().toISOString().slice(0, 10);
  let data: Awaited<ReturnType<typeof getTeacherDashboardDataViaSupabaseRest>> | null = null;
  try {
    data = process.env.FORCE_SUPABASE_REST_DATA_FALLBACK === '1'
      ? await getTeacherDashboardDataViaSupabaseRest(session.id, dayKey)
      : await getCachedTeacherDashboardData(session.id, dayKey) as Awaited<ReturnType<typeof getTeacherDashboardDataViaSupabaseRest>>;
  } catch (error) {
    if (!isDatabaseConnectionError(error)) return <DbOfflineBanner />;
    try {
      data = await getTeacherDashboardDataViaSupabaseRest(session.id, dayKey);
    } catch (fallbackError) {
      console.error('[teacher/dashboard] REST fallback failed', fallbackError);
      return <DbOfflineBanner />;
    }
  }

  const { teacher, attendanceToday, progressCount } = data;

  if (!teacher) {
    return (
      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(43,103,110,0.06)] p-8">
        <h2 className="font-headline text-3xl font-bold text-[#1a1c1c]">Teacher Profile Missing</h2>
        <p className="mt-2 text-sm text-[#6f7979]">Your account is active but no teacher profile is linked yet. Contact admin.</p>
      </div>
    );
  }

  const classMap = new Map<string, { name: string; section: string; students: number; isClassLead: boolean }>();
  for (const item of teacher.classAssignments) {
    classMap.set(item.classId, {
      name: item.class.name,
      section: item.class.section,
      students: item.class._count.students,
      isClassLead: item.isClassLead
    });
  }
  for (const subject of teacher.subjects) {
    if (classMap.has(subject.classId)) continue;
    classMap.set(subject.classId, {
      name: subject.class.name,
      section: subject.class.section,
      students: subject.class._count.students,
      isClassLead: false
    });
  }

  const teacherClasses = Array.from(classMap.values());
  const totalStudents = teacherClasses.reduce((sum, item) => sum + item.students, 0);

  const todayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
  const initials = teacher.user.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  const attendanceRate = totalStudents > 0 ? Math.min(100, Math.round((attendanceToday / totalStudents) * 100)) : 0;

  return (
    <div className="space-y-8 bg-[#F8FAFC] pb-28">
      <section className="relative overflow-hidden rounded-[24px] border border-[#0A5963] bg-[linear-gradient(135deg,#084750_0%,#0A5963_56%,#06353C_100%)] p-6 text-white shadow-[0_20px_36px_rgba(8,71,80,0.22)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/50" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full bg-white/12 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#F7D58B] ring-1 ring-white/10">
              Manarah Teacher
            </span>
            <p className="mt-3 text-sm font-medium text-[#CBE5E2]">{todayLabel}</p>
            <h1 className="mt-1 text-3xl font-extrabold leading-tight tracking-tight">
              Good Morning,<br />
              <span className="bg-gradient-to-r from-[#D5FFF8] to-[#F7D58B] bg-clip-text text-transparent">
                {teacher.user.fullName.split(' ')[0] || teacher.user.fullName}
              </span>
            </h1>
          </div>
          <div className="rounded-2xl bg-gradient-to-tr from-[#D9A253] to-[#14B8A6] p-px shadow-lg">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#084750] text-xl font-bold text-white">
              {initials.slice(0, 1)}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#F7D58B]" />
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#D5FFF8]">Quick Summary</p>
          </div>
          <p className="text-sm text-[#CBE5E2]">
            <span className="font-bold text-white">{teacherClasses.length} classes</span> | <span className="font-bold text-white">{totalStudents} students</span> | <span className="font-bold text-[#F7D58B]">{attendanceToday} attendance marks</span> today
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <Link href="/teacher/classes" prefetch={false} className="block rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 active:scale-[0.985]">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]"><BookOpen className="h-5 w-5" /></div>
          <p className="text-[26px] font-extrabold leading-none text-[#0F172A]">{teacherClasses.length}</p>
          <p className="mt-1 text-xs font-medium text-[#64748B]">Classes</p>
          <p className="mt-1 text-[10px] font-extrabold text-[#059669]">+1 this month</p>
        </Link>

        <Link href="/teacher/students" prefetch={false} className="block rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 active:scale-[0.985]">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAE8FF] text-[#9333EA]"><Users2 className="h-5 w-5" /></div>
          <p className="text-[26px] font-extrabold leading-none text-[#0F172A]">{totalStudents}</p>
          <p className="mt-1 text-xs font-medium text-[#64748B]">Students</p>
          <p className="mt-1 text-[10px] font-extrabold text-[#2563EB]">Stable enrollment</p>
        </Link>

        <Link href="/teacher/attendance" prefetch={false} className="block rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 active:scale-[0.985]">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#CCFBF1] text-[#0D9488]"><CheckCircle2 className="h-5 w-5" /></div>
          <p className="text-[26px] font-extrabold leading-none text-[#0F172A]">{attendanceToday}</p>
          <p className="mt-1 text-xs font-medium text-[#64748B]">Attendance Today</p>
          <p className="mt-1 text-[10px] font-extrabold text-[#0D9488]">{attendanceRate}% of students</p>
        </Link>

        <Link href="/teacher/progress" prefetch={false} className="block rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 active:scale-[0.985]">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFEDD5] text-[#EA580C]"><BarChart3 className="h-5 w-5" /></div>
          <p className="text-[26px] font-extrabold leading-none text-[#0F172A]">{progressCount}</p>
          <p className="mt-1 text-xs font-medium text-[#64748B]">Progress</p>
          <p className="mt-1 text-[10px] font-extrabold text-[#EA580C]">Assessments updated</p>
        </Link>
      </section>

      <div className="relative z-0">
        <Link href="/teacher/attendance" prefetch={false} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#084750] px-4 text-base font-extrabold text-white shadow-[0_16px_28px_rgba(8,71,80,0.28)] transition active:scale-95">
          <CalendarCheck2 className="h-5 w-5" />
          Mark Attendance
        </Link>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-[#0F172A]">My Classes</p>
          <span className="rounded-full bg-[#E2E8F0] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#475569]">{teacherClasses.length} active</span>
        </div>
        {teacherClasses.length === 0 ? (
          <p className="text-sm text-[#64748B]">No classes assigned yet.</p>
        ) : (
          <div className="space-y-3">
            {teacherClasses.map((item) => (
              <Link
                key={`${item.name}-${item.section}`}
                href="/teacher/classes"
                prefetch={false}
                className="group flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition duration-200 hover:bg-[#F8FAFC] active:scale-[0.99]"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4 pr-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#BEEFE7] bg-[#CCFBF1] text-[#0D9488]">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#0F172A]">{item.name} - {item.section}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                      <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[#64748B]">{item.students} students</span>
                      <span className="rounded-md bg-[#DCFCE7] px-2 py-0.5 font-extrabold text-[#047857]">{attendanceRate}% attendance</span>
                      {item.isClassLead ? <StatusBadge variant="info">Lead</StatusBadge> : null}
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                      <div className="h-full rounded-full bg-[#0D9488]" style={{ width: `${Math.max(12, attendanceRate)}%` }} />
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-[#94A3B8] transition group-hover:text-[#475569]" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-[#BEEFE7] bg-[#CCFBF1]/70 p-4">
        <div className="flex items-start gap-4">
          <TrendingUp className="h-4 w-4" />
          <div>
            <p className="mb-1 text-xs font-extrabold uppercase tracking-widest text-[#0F766E]">Weekly Focus</p>
            <p className="text-sm leading-snug text-[#475569]">Attendance consistency and exam readiness for the upcoming mid-terms.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
