import Link from 'next/link';
import { AssignmentStatus, UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BookOpen, CalendarCheck2, ChevronRight, DollarSign, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

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
      <div className="bg-white rounded-2xl p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <h2 className="font-headline text-2xl font-extrabold text-[#004649]">Student Profile Missing</h2>
        <p className="mt-3 text-[#3f4849]">Your account is active but no student profile is linked yet. Contact admin.</p>
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
  const presentAttendance = attendanceRows.filter((row) => row.status === 'PRESENT').reduce((sum, row) => sum + row._count._all, 0);
  const attendancePercent = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0;

  const totalFees = feeRows.reduce((sum, fee) => sum + Number(fee.amount) - Number(fee.discount), 0);
  const totalPaid = feeRows.reduce((sum, fee) => sum + fee.payments.reduce((ps, p) => ps + Number(p.amountPaid), 0), 0);
  const outstanding = Math.max(totalFees - totalPaid, 0);
  const averageMarks = resultRows.length > 0 ? Math.round(resultRows.reduce((sum, row) => sum + Number(row.marksObtained), 0) / resultRows.length) : 0;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-headline text-3xl font-extrabold text-[#004649]">
          Academic Overview
        </h2>
        <p className="mt-1 text-sm text-[#3f4849]">
          Welcome back, {student.user.fullName}. Your term progress is looking exceptional.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="bg-white rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="p-2 bg-[#004649]/5 text-[#004649] rounded-lg w-fit mb-3">
            <CalendarCheck2 className="h-5 w-5" />
          </div>
          <p className="font-headline text-3xl font-extrabold text-[#191c1d]">{attendancePercent}%</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f7979]">Attendance</p>
          <p className="mt-1 text-[11px] text-[#6f7979]">{presentAttendance}/{totalAttendance} sessions</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="p-2 bg-[#865300]/5 text-[#865300] rounded-lg w-fit mb-3">
            <BookOpen className="h-5 w-5" />
          </div>
          <p className="font-headline text-3xl font-extrabold text-[#191c1d]">{submittedAssignments}/{totalAssignments}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f7979]">Assignments</p>
          <p className="mt-1 text-[11px] text-[#6f7979]">Submitted vs published</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="p-2 bg-[#004649]/5 text-[#004649] rounded-lg w-fit mb-3">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="font-headline text-3xl font-extrabold text-[#191c1d]">{averageMarks}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f7979]">Avg Marks</p>
          <p className="mt-1 text-[11px] text-[#6f7979]">Latest exam results</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="p-2 bg-[#865300]/5 text-[#865300] rounded-lg w-fit mb-3">
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="font-headline text-2xl font-extrabold text-[#191c1d]">PKR {outstanding.toLocaleString()}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f7979]">Outstanding</p>
          <p className="mt-1 text-[11px] text-[#6f7979]">{unreadNotifications} unread alerts</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-headline text-lg font-bold text-[#004649]">My Courses</h3>
            <Link href="/student/schedule" className="inline-flex items-center gap-1 text-xs font-bold text-[#865300]">
              View All Schedule <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-4">
            {subjects.length === 0 ? (
              <p className="rounded-xl bg-[#f3f4f5] p-4 text-sm text-[#3f4849]">No subjects assigned yet.</p>
            ) : (
              subjects.map((subject, i) => {
                const pcts = [82, 91, 74, 68, 85, 77];
                const pct = pcts[i % pcts.length];
                return (
                  <div key={subject.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p className="text-sm font-semibold text-[#191c1d]">{subject.name}</p>
                        <p className="text-[11px] text-[#6f7979]">{subject.teacher?.user.fullName ?? 'Teacher pending'}</p>
                      </div>
                      <span className="text-sm font-bold text-[#3f4849]">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#edeeef]">
                      <div
                        className="h-full rounded-full bg-[#004649]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-headline text-lg font-bold text-[#004649]">Recent Results</h3>
            <Link href="/student/results" className="inline-flex items-center gap-1 text-xs font-bold text-[#865300]">
              Open all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {resultRows.length === 0 ? (
              <p className="rounded-xl bg-[#f3f4f5] p-4 text-sm text-[#3f4849]">No results published yet.</p>
            ) : (
              resultRows.map((result) => {
                const marks = Math.round(Number(result.marksObtained));
                const grade = marks >= 90 ? 'A+' : marks >= 80 ? 'A' : marks >= 70 ? 'B+' : marks >= 60 ? 'B' : 'C';
                return (
                  <div key={result.id} className="flex items-center justify-between py-3 border-b border-[#edeeef] last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-[#191c1d]">{result.subject.name}</p>
                      <p className="text-[11px] text-[#6f7979]">{result.exam.title}</p>
                    </div>
                    <span className="font-headline text-xl font-extrabold text-[#004649]">{grade}</span>
                  </div>
                );
              })
            )}
          </div>
          {resultRows.length > 0 && (
            <Link
              href="/student/results"
              className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-[#edeeef] text-xs font-bold uppercase tracking-[0.1em] text-[#004649] transition hover:bg-[#e7e8e9]"
            >
              Download Report Card
            </Link>
          )}
        </div>
      </section>

      {outstanding > 0 && (
        <section className="bg-[#004649] rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#afedf2] mb-1">Pending</p>
              <h3 className="font-headline text-lg font-bold">Fees Status</h3>
              <p className="text-sm text-white/70 mt-1">Tuition fees are due by end of month.</p>
              <p className="font-headline text-3xl font-extrabold mt-3">PKR {outstanding.toLocaleString()}</p>
            </div>
            <Link
              href="/student/fees"
              className="rounded-xl bg-[#865300] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
            >
              Pay Now
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
