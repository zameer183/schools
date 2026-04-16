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

export default async function StudentDashboardPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);

  const student = await prisma.student.findUnique({
    where: { userId: session.id },
    include: {
      user: { select: { fullName: true } },
      class: { select: { id: true, name: true, section: true } }
    }
  });

  if (!student) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h2 className="font-headline text-4xl font-extrabold text-slate-900">Student Profile Missing</h2>
        <p className="mt-3 text-slate-600">Your account is active but no student profile is linked yet. Contact admin.</p>
      </div>
    );
  }

  const [attendanceRows, resultRows, feeRows, unreadNotifications, subjects, totalAssignments, submittedAssignments] = await Promise.all([
    prisma.attendance.groupBy({
      by: ['status'],
      where: { studentId: student.id },
      _count: { _all: true }
    }),
    prisma.result.findMany({
      where: { studentId: student.id },
      include: {
        subject: { select: { name: true } },
        exam: { select: { title: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    }),
    prisma.fee.findMany({
      where: { studentId: student.id },
      include: { payments: { select: { amountPaid: true } } },
      orderBy: { dueDate: 'asc' }
    }),
    prisma.notification.count({
      where: {
        isRead: false,
        OR: [{ userId: session.id }, { studentId: student.id }]
      }
    }),
    student.classId
      ? prisma.subject.findMany({
          where: { classId: student.classId },
          include: { teacher: { include: { user: { select: { fullName: true } } } } },
          orderBy: { name: 'asc' },
          take: 6
        })
      : Promise.resolve([]),
    student.classId ? prisma.assignment.count({ where: { classId: student.classId, status: AssignmentStatus.PUBLISHED } }) : Promise.resolve(0),
    prisma.assignmentSubmission.count({ where: { studentId: student.id } })
  ]);

  const totalAttendance = attendanceRows.reduce((sum, row) => sum + row._count._all, 0);
  const presentAttendance = attendanceRows
    .filter((row) => row.status === 'PRESENT')
    .reduce((sum, row) => sum + row._count._all, 0);
  const attendancePercent = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0;

  const totalFees = feeRows.reduce((sum, fee) => sum + Number(fee.amount) - Number(fee.discount), 0);
  const totalPaid = feeRows.reduce(
    (sum, fee) => sum + fee.payments.reduce((paymentSum, p) => paymentSum + Number(p.amountPaid), 0),
    0
  );
  const outstanding = Math.max(totalFees - totalPaid, 0);

  const averageMarks =
    resultRows.length > 0 ? Math.round(resultRows.reduce((sum, row) => sum + Number(row.marksObtained), 0) / resultRows.length) : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Student</p>
        <h2 className="font-headline mt-2 text-4xl font-black text-slate-900">Welcome, {student.user.fullName}</h2>
        <p className="mt-2 text-slate-600">
          Class: {student.class ? `${student.class.name} - ${student.class.section}` : 'Not assigned yet'}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Attendance" value={`${attendancePercent}%`} hint={`${presentAttendance}/${totalAttendance} records present`} />
        <StatCard title="Assignments" value={`${submittedAssignments}/${totalAssignments}`} hint="Submitted vs published" />
        <StatCard title="Average Marks" value={`${averageMarks}`} hint="Latest exam results" />
        <StatCard title="Outstanding Fee" value={`PKR ${outstanding.toLocaleString()}`} hint={`${unreadNotifications} unread notifications`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Subjects</h3>
            <Link href="/student/schedule" className="text-sm font-semibold text-teal-800 hover:text-teal-900">
              View schedule
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {subjects.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No subjects assigned yet.</p>
            ) : (
              subjects.map((subject) => (
                <div key={subject.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">{subject.name}</p>
                  <p className="text-sm text-slate-600">{subject.teacher?.user.fullName ?? 'Teacher pending'}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Latest Results</h3>
            <Link href="/student/results" className="text-sm font-semibold text-teal-800 hover:text-teal-900">
              Open all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {resultRows.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No results published yet.</p>
            ) : (
              resultRows.map((result) => (
                <div key={result.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                  <div>
                    <p className="font-semibold text-slate-900">{result.subject.name}</p>
                    <p className="text-sm text-slate-600">{result.exam.title}</p>
                  </div>
                  <p className="text-lg font-bold text-teal-900">{Math.round(Number(result.marksObtained))}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}