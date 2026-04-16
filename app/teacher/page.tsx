import Link from 'next/link';
import { AssignmentStatus, UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
            include: { _count: { select: { students: true } } }
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
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-8">
        <h2 className="text-2xl font-bold text-[#1a1c1c]">Teacher Profile Missing</h2>
        <p className="mt-2 text-sm text-[#6f7979]">Your account is active but no teacher profile is linked yet. Contact admin.</p>
      </div>
    );
  }

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

  return (
    <div className="space-y-4">
      {/* Welcome card */}
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6f7979]">TEACHER</p>
        <h1 className="mt-1 text-3xl font-bold text-[#1a1c1c]">Good day, {teacher.user.fullName}</h1>
        <p className="mt-1 text-sm text-[#6f7979]">Here&apos;s your classroom overview for today.</p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">CLASSES</p>
          <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{teacher.classAssignments.length}</p>
          <p className="mt-1 text-xs text-[#6f7979]">Assigned classes</p>
        </div>
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">STUDENTS</p>
          <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{totalStudents}</p>
          <p className="mt-1 text-xs text-[#6f7979]">In your classes</p>
        </div>
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">ASSIGNMENTS</p>
          <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{publishedAssignments}</p>
          <p className="mt-1 text-xs text-[#6f7979]">Published</p>
        </div>
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">TODAY</p>
          <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{attendanceToday}</p>
          <p className="mt-1 text-xs text-[#6f7979]">Attendance records</p>
        </div>
      </div>

      {/* Assignments + Classes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#1a1c1c]">Recent Assignments</h3>
            <Link href="/teacher/assignments" className="text-xs font-semibold text-[#004649] hover:underline">
              Manage
            </Link>
          </div>
          {assignments.length === 0 ? (
            <p className="text-sm text-[#6f7979]">No assignments created yet.</p>
          ) : (
            <div className="divide-y divide-[#e2e8e8]">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1a1c1c]">{assignment.title}</p>
                    <p className="text-xs text-[#6f7979]">{assignment.class.name} - {assignment.class.section} · {assignment.subject.name}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                    assignment.status === 'PUBLISHED' ? 'bg-[#e8f5e9] text-[#004649]' :
                    'bg-[#fff3e0] text-[#865300]'
                  }`}>
                    {assignment.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white border border-[#e2e8e8] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#1a1c1c]">My Classes</h3>
            <Link href="/teacher/attendance" className="text-xs font-semibold text-[#004649] hover:underline">
              Mark attendance
            </Link>
          </div>
          {teacher.classAssignments.length === 0 ? (
            <p className="text-sm text-[#6f7979]">No classes assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {teacher.classAssignments.map((item) => (
                <div key={item.classId} className="rounded-lg bg-[#f5f7f5] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#1a1c1c]">{item.class.name} - {item.class.section}</p>
                    {item.isClassLead && (
                      <span className="rounded-full bg-[#e8f5e9] px-2 py-0.5 text-[10px] font-bold text-[#004649]">Lead</span>
                    )}
                  </div>
                  <p className="text-xs text-[#6f7979] mt-0.5">Students: {item.class._count.students}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
