import Link from 'next/link';
import { AssignmentStatus, UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
      <div className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Student Profile Missing</h2>
        <p className="mt-2 text-sm text-[#6f7979]">Your account is active but no student profile is linked yet. Contact admin.</p>
      </div>
    );
  }

  const [attendanceRows, resultRows, feeRows, subjects, totalAssignments, submittedAssignments] = await Promise.all([
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
      include: { payments: { select: { amountPaid: true } } }
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

  return (
    <div className="space-y-4">
      {/* Welcome card */}
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6f7979]">STUDENT</p>
        <h1 className="mt-1 text-3xl font-bold text-[#1a1c1c]">Welcome, {student.user.fullName}</h1>
        {student.class && (
          <p className="mt-1 text-sm text-[#6f7979]">Class: {student.class.name} - {student.class.section}</p>
        )}
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">ATTENDANCE</p>
          <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{attendancePercent}%</p>
          <p className="mt-1 text-xs text-[#6f7979]">{presentAttendance}/{totalAttendance} records present</p>
        </div>
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">ASSIGNMENTS</p>
          <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{submittedAssignments}/{totalAssignments}</p>
          <p className="mt-1 text-xs text-[#6f7979]">Submitted vs published</p>
        </div>
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">AVERAGE MARKS</p>
          <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{averageMarks}</p>
          <p className="mt-1 text-xs text-[#6f7979]">Latest exam results</p>
        </div>
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">OUTSTANDING FEE</p>
          <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">PKR {outstanding.toLocaleString()}</p>
          <p className="mt-1 text-xs text-[#6f7979]">0 unread notifications</p>
        </div>
      </div>

      {/* Subjects + Latest Results */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#1a1c1c]">Subjects</h3>
            <Link href="/student/schedule" className="text-xs font-semibold text-[#004649] hover:underline">
              View schedule
            </Link>
          </div>
          {subjects.length === 0 ? (
            <p className="text-sm text-[#6f7979]">No subjects assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {subjects.map((subject) => (
                <div key={subject.id} className="rounded-lg bg-[#f5f7f5] px-4 py-3">
                  <p className="text-sm font-semibold text-[#1a1c1c]">{subject.name}</p>
                  <p className="text-xs text-[#6f7979]">{subject.teacher?.user.fullName ?? 'TBA'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white border border-[#e2e8e8] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#1a1c1c]">Latest Results</h3>
            <Link href="/student/results" className="text-xs font-semibold text-[#004649] hover:underline">
              Open all
            </Link>
          </div>
          {resultRows.length === 0 ? (
            <p className="text-sm text-[#6f7979]">No results published yet.</p>
          ) : (
            <div className="divide-y divide-[#e2e8e8]">
              {resultRows.map((result) => (
                <div key={result.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1a1c1c]">{result.subject.name}</p>
                    <p className="text-xs text-[#6f7979]">{result.exam.title}</p>
                  </div>
                  <span className="text-sm font-bold text-[#004649]">{result.grade}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
