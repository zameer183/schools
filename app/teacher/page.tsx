import Link from 'next/link';
import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTeacherAccessMapByTeacherId, TEACHER_ACCESS_MODULES } from '@/lib/teacher-access';
import { StatusBadge } from '@/components/ui';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  TrendingUp,
  Users2,
  WifiOff
} from 'lucide-react';

export const dynamic = 'force-dynamic';

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
        accessMap: null,
        attendanceToday: 0
      };
    }

    const startOfDay = new Date(`${dayKey}T00:00:00.000Z`);
    const endOfDay = new Date(`${dayKey}T23:59:59.999Z`);

    const [accessMap, attendanceToday] = await Promise.all([
      getTeacherAccessMapByTeacherId(teacher.id),
      prisma.attendance.count({
        where: {
          markedById: teacher.id,
          date: { gte: startOfDay, lte: endOfDay }
        }
      })
    ]);

    return { teacher, accessMap, attendanceToday };
  },
  ['teacher-dashboard-page-data'],
  { revalidate: 30 }
);

export default async function TeacherDashboardPage() {
  const session = await requireAuth([UserRole.TEACHER, UserRole.ADMIN]);
  const dayKey = new Date().toISOString().slice(0, 10);
  let data: Awaited<ReturnType<typeof getCachedTeacherDashboardData>> | null = null;
  try {
    data = await getCachedTeacherDashboardData(session.id, dayKey);
  } catch {
    return <DbOfflineBanner />;
  }

  const { teacher, accessMap, attendanceToday } = data;

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
  const progressCount = await prisma.result.count({
    where: {
      exam: {
        classId: { in: Array.from(classMap.keys()) }
      }
    }
  }).catch(() => 0);

  const todayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
  const initials = teacher.user.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  const attendanceRate = totalStudents > 0 ? Math.min(100, Math.round((attendanceToday / totalStudents) * 100)) : 0;

  const moduleIcons: Record<string, React.ReactNode> = {
    ACADEMICS: <BookOpen className="h-5 w-5" />,
    STUDENTS: <Users2 className="h-5 w-5" />,
    ATTENDANCE: <CalendarCheck2 className="h-5 w-5" />,
    STAFF_ATTENDANCE: <CheckCircle2 className="h-5 w-5" />,
    ASSIGNMENTS: <ClipboardList className="h-5 w-5" />,
    PROGRESS: <BarChart3 className="h-5 w-5" />,
    MESSAGES: <MessageSquare className="h-5 w-5" />,
    EXAMS: <ClipboardList className="h-5 w-5" />,
    FEES: <ClipboardList className="h-5 w-5" />
  };

  return (
    <div className="space-y-8 bg-[#F8FAFC] pb-28">
      <section className="relative overflow-hidden rounded-[24px] border border-[#1E293B] bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#1E1B4B] p-6 text-white shadow-[0_20px_36px_rgba(15,23,42,0.18)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/50" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full bg-[#0D9488]/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#5EEAD4]">
              Manarah Teacher
            </span>
            <p className="mt-3 text-sm font-medium text-[#94A3B8]">{todayLabel}</p>
            <h1 className="mt-1 text-3xl font-extrabold leading-tight tracking-tight">
              Good Morning,<br />
              <span className="bg-gradient-to-r from-[#99F6E4] to-[#C7D2FE] bg-clip-text text-transparent">
                {teacher.user.fullName.split(' ')[0] || teacher.user.fullName}
              </span>
            </h1>
          </div>
          <div className="rounded-2xl bg-gradient-to-tr from-[#4F46E5] to-[#0D9488] p-px shadow-lg">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1E293B] text-xl font-bold text-white">
              {initials.slice(0, 1)}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#2DD4BF]" />
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#CBD5E1]">Quick Summary</p>
          </div>
          <p className="text-sm text-[#CBD5E1]">
            <span className="font-bold text-white">{teacherClasses.length} classes</span> | <span className="font-bold text-white">{totalStudents} students</span> | <span className="font-bold text-[#5EEAD4]">{attendanceToday} attendance marks</span> today
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <Link href="/teacher/classes" className="block rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 active:scale-[0.985]">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]"><BookOpen className="h-5 w-5" /></div>
          <p className="text-[26px] font-extrabold leading-none text-[#0F172A]">{teacherClasses.length}</p>
          <p className="mt-1 text-xs font-medium text-[#64748B]">Classes</p>
          <p className="mt-1 text-[10px] font-extrabold text-[#059669]">+1 this month</p>
        </Link>

        <Link href="/teacher/students" className="block rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 active:scale-[0.985]">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAE8FF] text-[#9333EA]"><Users2 className="h-5 w-5" /></div>
          <p className="text-[26px] font-extrabold leading-none text-[#0F172A]">{totalStudents}</p>
          <p className="mt-1 text-xs font-medium text-[#64748B]">Students</p>
          <p className="mt-1 text-[10px] font-extrabold text-[#2563EB]">Stable enrollment</p>
        </Link>

        <Link href="/teacher/attendance" className="block rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 active:scale-[0.985]">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#CCFBF1] text-[#0D9488]"><CheckCircle2 className="h-5 w-5" /></div>
          <p className="text-[26px] font-extrabold leading-none text-[#0F172A]">{attendanceToday}</p>
          <p className="mt-1 text-xs font-medium text-[#64748B]">Attendance Today</p>
          <p className="mt-1 text-[10px] font-extrabold text-[#0D9488]">{attendanceRate}% of students</p>
        </Link>

        <Link href="/teacher/progress" className="block rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 active:scale-[0.985]">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFEDD5] text-[#EA580C]"><BarChart3 className="h-5 w-5" /></div>
          <p className="text-[26px] font-extrabold leading-none text-[#0F172A]">{progressCount}</p>
          <p className="mt-1 text-xs font-medium text-[#64748B]">Progress</p>
          <p className="mt-1 text-[10px] font-extrabold text-[#EA580C]">Assessments updated</p>
        </Link>
      </section>

      <div className="sticky bottom-20 z-30 md:bottom-4">
        <Link href="/teacher/attendance" className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#0D9488] px-4 text-base font-extrabold text-white shadow-[0_16px_28px_rgba(79,70,229,0.22)] transition active:scale-95">
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

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-[#0F172A]">Modules</h3>
        <div className="grid grid-cols-3 gap-3">
          {TEACHER_ACCESS_MODULES.map((module) => {
            const enabled = accessMap?.[module] ?? false;
            return (
              <div
                key={module}
                className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition active:bg-[#F8FAFC] ${
                  enabled ? 'border-[#E2E8F0] bg-white' : 'border-[#E2E8F0] bg-white/70'
                }`}
              >
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${enabled ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'bg-[#F1F5F9] text-[#94A3B8]'}`}>
                  {moduleIcons[module] ?? <ClipboardList className="h-5 w-5" />}
                </div>
                <p className={`text-[9px] font-extrabold uppercase leading-tight tracking-tight ${enabled ? 'text-[#64748B]' : 'text-[#94A3B8]'}`}>{module.replace(/_/g, ' ')}</p>
              </div>
            );
          })}
        </div>
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
