import Link from 'next/link';
import { AssignmentStatus, UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-3 text-4xl font-black text-teal-900">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{hint}</p>
    </div>
  );
}

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
              _count: {
                select: { students: true }
              }
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
      <div className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h2 className="font-headline text-4xl font-extrabold text-slate-900">Teacher Profile Missing</h2>
        <p className="mt-3 text-slate-600">Your account is active but no teacher profile is linked yet. Contact admin.</p>
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
      take: 6
    }),
    prisma.assignment.count({ where: { teacherId: teacher.id, status: AssignmentStatus.PUBLISHED } }),
    prisma.attendance.count({
      where: {
        markedById: teacher.id,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Teacher</p>
        <h2 className="font-headline mt-2 text-4xl font-black text-slate-900">Welcome, {teacher.user.fullName}</h2>
        <p className="mt-2 text-slate-600">Manage attendance, assignments, and student progress from this dashboard.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Assigned Classes" value={`${teacher.classAssignments.length}`} hint="Classes under your supervision" />
        <StatCard title="Total Students" value={`${totalStudents}`} hint="Students in assigned classes" />
        <StatCard title="Subjects" value={`${teacher.subjects.length}`} hint="Subjects assigned to you" />
        <StatCard title="Attendance Today" value={`${attendanceToday}`} hint="Records marked today" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Your Classes</h3>
            <Link href="/teacher/attendance" className="text-sm font-semibold text-teal-800 hover:text-teal-900">
              Mark attendance
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {teacher.classAssignments.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No classes assigned yet.</p>
            ) : (
              teacher.classAssignments.map((item) => (
                <div key={item.classId} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">
                    {item.class.name} - {item.class.section}
                  </p>
                  <p className="text-sm text-slate-600">{item.class._count.students} students</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Assignments</h3>
            <Link href="/teacher/assignments" className="text-sm font-semibold text-teal-800 hover:text-teal-900">
              Manage
            </Link>
          </div>
          <p className="mt-2 text-sm text-slate-600">Published: {publishedAssignments}</p>
          <div className="mt-4 space-y-3">
            {assignments.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No assignments created yet.</p>
            ) : (
              assignments.map((assignment) => (
                <div key={assignment.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">{assignment.title}</p>
                  <p className="text-sm text-slate-600">
                    {assignment.class.name} - {assignment.class.section} | {assignment.subject.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">Submissions: {assignment._count.submissions}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {classIds.length === 0 ? null : (
        <section className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
          <h3 className="text-xl font-bold text-slate-900">Quick Actions</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/teacher/attendance" className="rounded-xl bg-teal-900 px-4 py-2 text-sm font-semibold text-white">
              Open Attendance
            </Link>
            <Link href="/teacher/assignments" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
              Create Assignment
            </Link>
            <Link href="/teacher/messages" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
              Send Message
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}