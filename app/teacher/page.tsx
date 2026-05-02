import Link from 'next/link';
import { AssignmentStatus, UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTeacherAccessMapByTeacherId, TEACHER_ACCESS_MODULES } from '@/lib/teacher-access';
import { PageHeader, KpiCard, Card, StatusBadge, SectionTitle } from '@/components/ui';
import { BookOpen, Users2, ClipboardList, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

const getCachedTeacherDashboardData = unstable_cache(
  async (userId: string, startOfDayIso: string, endOfDayIso: string) => {
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
        assignments: [],
        publishedAssignments: 0,
        attendanceToday: 0
      };
    }

    const startOfDay = new Date(startOfDayIso);
    const endOfDay = new Date(endOfDayIso);

    const [accessMap, assignments, publishedAssignments, attendanceToday] = await Promise.all([
      getTeacherAccessMapByTeacherId(teacher.id),
      prisma.assignment.findMany({
        where: { teacherId: teacher.id },
        include: {
          class: { select: { name: true, section: true } },
          subject: { select: { name: true } },
          _count: { select: { submissions: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.assignment.count({ where: { teacherId: teacher.id, status: AssignmentStatus.PUBLISHED } }),
      prisma.attendance.count({
        where: {
          markedById: teacher.id,
          date: { gte: startOfDay, lte: endOfDay }
        }
      })
    ]);

    return { teacher, accessMap, assignments, publishedAssignments, attendanceToday };
  },
  ['teacher-dashboard-page-data'],
  { revalidate: 30 }
);

export default async function TeacherDashboardPage() {
  const session = await requireAuth([UserRole.TEACHER, UserRole.ADMIN]);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const { teacher, accessMap, assignments, publishedAssignments, attendanceToday } = await getCachedTeacherDashboardData(
    session.id,
    startOfDay.toISOString(),
    endOfDay.toISOString()
  );

  if (!teacher) {
    return (
      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-8">
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good day, ${teacher.user.fullName}`}
        subtitle="Here's your classroom overview for today."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard variant="primary" icon={<BookOpen />} label="Classes" value={teacherClasses.length} />
        <KpiCard variant="success" icon={<Users2 />} label="Students" value={totalStudents} />
        <KpiCard variant="accent" icon={<ClipboardList />} label="Assignments" value={publishedAssignments} />
        <KpiCard variant="primary" icon={<CheckCircle2 />} label="Attendance Today" value={attendanceToday} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5E6CC]">
                <ClipboardList className="h-4 w-4 text-[#D69E3F]" />
              </div>
              <p className="text-sm font-bold text-[#1F2937]">Recent Assignments</p>
            </div>
            <Link href="/teacher/assignments" className="text-xs font-semibold text-[#D69E3F] hover:underline">
              Manage
            </Link>
          </div>
          {assignments.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No assignments created yet.</p>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-[#1F2937]">{assignment.title}</p>
                    <p className="text-xs text-[#6B7280]">{assignment.class.name} - {assignment.class.section} · {assignment.subject.name}</p>
                  </div>
                  <StatusBadge variant={assignment.status === 'PUBLISHED' ? 'success' : 'pending'}>
                    {assignment.status}
                  </StatusBadge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0EBEC]">
                <BookOpen className="h-4 w-4 text-[#1F5A5C]" />
              </div>
              <p className="text-sm font-bold text-[#1F2937]">My Classes</p>
            </div>
            <Link href="/teacher/attendance" className="text-xs font-semibold text-[#1F5A5C] hover:underline">
              Mark attendance
            </Link>
          </div>
          {teacherClasses.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No classes assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {teacherClasses.map((item) => (
                <div key={`${item.name}-${item.section}`} className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#1F2937]">{item.name} - {item.section}</p>
                    {item.isClassLead && (
                      <StatusBadge variant="info">Lead</StatusBadge>
                    )}
                  </div>
                  <p className="text-xs text-[#6B7280] mt-0.5">Students: {item.students}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D1FAE5]">
              <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F2937]">Access Granted By Admin</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {TEACHER_ACCESS_MODULES.map((module) => {
              const enabled = accessMap?.[module] ?? false;
              return (
                <div key={module} className={`rounded-lg px-3 py-2 text-sm font-semibold ${enabled ? 'bg-[#D1FAE5] text-[#10B981]' : 'bg-[#FEE2E2] text-[#EF4444]'}`}>
                  {module.replace(/_/g, ' ')}: {enabled ? 'Enabled' : 'Disabled'}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
