import Link from 'next/link';
import { AssignmentStatus, UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BookOpen, CalendarCheck2, ChevronRight, Users, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TeacherDashboardPage() {
  const session = await requireAuth([UserRole.TEACHER, UserRole.ADMIN]);

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.id },
    include: {
      user: { select: { fullName: true } },
      classAssignments: {
        include: {
          class: {
            include: {
              _count: { select: { students: true } }
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      },
      subjects: {
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' }
      }
    }
  });

  if (!teacher) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <h2 className="font-headline text-2xl font-extrabold text-[#004649]">Teacher Profile Missing</h2>
        <p className="mt-3 text-[#3f4849]">Your account is active but no teacher profile is linked yet. Contact admin.</p>
      </div>
    );
  }

  const classIds = teacher.classAssignments.map((item) => item.classId);
  const totalStudents = teacher.classAssignments.reduce((sum, item) => sum + item.class._count.students, 0);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [assignments, publishedAssignments, attendanceToday] = await Promise.all([
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

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-headline text-3xl font-extrabold text-[#004649]">
          Good morning, {teacher.user.fullName.split(' ')[0]}
        </h2>
        <p className="mt-1 text-sm text-[#3f4849]">{today} — Your day at a glance.</p>
        <div className="mt-4 flex gap-3">
          <Link
            href="/teacher/attendance"
            className="inline-flex items-center gap-2 rounded-xl bg-[#004649] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            <CalendarCheck2 className="h-4 w-4" />
            Mark Attendance
          </Link>
          <Link
            href="/teacher/assignments"
            className="inline-flex items-center gap-2 rounded-xl border border-[#bfc8c9]/40 bg-white px-4 py-2.5 text-sm font-semibold text-[#191c1d] transition hover:bg-[#f3f4f5]"
          >
            <BookOpen className="h-4 w-4" />
            Upload Notes
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="bg-white rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="p-2 bg-[#004649]/5 text-[#004649] rounded-lg w-fit mb-3">
            <BookOpen className="h-5 w-5" />
          </div>
          <p className="font-headline text-3xl font-extrabold text-[#191c1d]">{teacher.classAssignments.length}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f7979]">Classes</p>
          <p className="mt-1 text-[11px] text-[#6f7979]">Under your supervision</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="p-2 bg-[#865300]/5 text-[#865300] rounded-lg w-fit mb-3">
            <Users className="h-5 w-5" />
          </div>
          <p className="font-headline text-3xl font-extrabold text-[#191c1d]">{totalStudents}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f7979]">Students</p>
          <p className="mt-1 text-[11px] text-[#6f7979]">In assigned classes</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="p-2 bg-[#004649]/5 text-[#004649] rounded-lg w-fit mb-3">
            <BookOpen className="h-5 w-5" />
          </div>
          <p className="font-headline text-3xl font-extrabold text-[#191c1d]">{teacher.subjects.length}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f7979]">Subjects</p>
          <p className="mt-1 text-[11px] text-[#6f7979]">Assigned subjects</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="p-2 bg-[#865300]/5 text-[#865300] rounded-lg w-fit mb-3">
            <CalendarCheck2 className="h-5 w-5" />
          </div>
          <p className="font-headline text-3xl font-extrabold text-[#191c1d]">{attendanceToday}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f7979]">Today</p>
          <p className="mt-1 text-[11px] text-[#6f7979]">Attendance records</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-headline text-lg font-bold text-[#004649]">Upcoming Assignments</h3>
            <Link href="/teacher/assignments" className="inline-flex items-center gap-1 text-xs font-bold text-[#865300]">
              Manage <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {assignments.length === 0 ? (
              <p className="rounded-xl bg-[#f3f4f5] p-4 text-sm text-[#3f4849]">No assignments created yet.</p>
            ) : (
              assignments.map((assignment) => {
                const statusColor =
                  assignment.status === 'PUBLISHED' ? 'bg-[#afedf2]/40 text-[#004649]' :
                  assignment.status === 'DRAFT' ? 'bg-[#ffddb8]/40 text-[#865300]' :
                  'bg-[#edeeef] text-[#6f7979]';
                return (
                  <div key={assignment.id} className="flex items-start gap-3 py-3 border-b border-[#edeeef] last:border-0">
                    <div className="mt-0.5 w-1 h-8 rounded-full bg-[#004649] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#191c1d] truncate">{assignment.title}</p>
                      <p className="text-[11px] text-[#6f7979]">
                        {assignment.class.name} - {assignment.class.section} · {assignment.subject.name}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${statusColor}`}>
                      {assignment.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-headline text-lg font-bold text-[#004649]">My Classes</h3>
            <Link href="/teacher/attendance" className="inline-flex items-center gap-1 text-xs font-bold text-[#865300]">
              Mark attendance <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-4">
            {teacher.classAssignments.length === 0 ? (
              <p className="rounded-xl bg-[#f3f4f5] p-4 text-sm text-[#3f4849]">No classes assigned yet.</p>
            ) : (
              teacher.classAssignments.map((item) => (
                <div key={item.classId} className="rounded-xl bg-[#f3f4f5] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6f7979]">Class</p>
                      <p className="font-headline text-base font-bold text-[#191c1d] mt-0.5">
                        {item.class.name} - {item.class.section}
                      </p>
                    </div>
                    {item.isClassLead && (
                      <span className="rounded-full bg-[#afedf2]/40 px-2 py-1 text-[10px] font-bold text-[#004649]">Lead</span>
                    )}
                  </div>
                  <p className="text-sm text-[#3f4849] mt-2">Students: {item.class._count.students}</p>
                  <Link
                    href="/teacher/attendance"
                    className="mt-3 flex h-9 w-full items-center justify-center rounded-lg border border-[#bfc8c9]/40 text-xs font-bold uppercase tracking-[0.1em] text-[#004649] transition hover:bg-white"
                  >
                    Class View
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
