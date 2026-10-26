import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ChevronLeft, Calendar, BookOpen, FileText } from 'lucide-react';
import Link from 'next/link';
import { StudentReportDetailActions } from './student-report-actions';

export const dynamic = 'force-dynamic';

type StudentDetailPageProps = {
  params: Promise<{ studentId: string }>;
};

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(value: number) {
  return `₨ ${Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
  const { studentId } = await params;

  const [student, attendance, fees, payments, progress, results] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true, class: true }
    }),
    prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      take: 30,
      select: { date: true, status: true }
    }),
    prisma.fee.findMany({
      where: { studentId },
      orderBy: { dueDate: 'desc' },
      select: { id: true, title: true, amount: true, discount: true, dueDate: true, status: true }
    }),
    prisma.payment.findMany({
      where: { fee: { studentId } },
      include: { fee: { select: { title: true } } },
      orderBy: { paidAt: 'desc' },
      take: 10
    }),
    prisma.studentProgress.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      take: 10,
      select: { date: true, lessonType: true, juzzNumber: true, lessonNumber: true, notes: true }
    }),
    prisma.result.findMany({
      where: { studentId },
      include: { exam: { select: { title: true, examDate: true, totalMarks: true } }, subject: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  if (!student) notFound();

  const className = student.class ? `${student.class.name} ${student.class.section}` : '—';
  const admissionNo = student.admissionNo;

  const feeCounts = {
    paid: fees.filter((f) => f.status === 'PAID').length,
    pending: fees.filter((f) => f.status === 'PENDING').length,
    partial: fees.filter((f) => f.status === 'PARTIAL').length,
    overdue: fees.filter((f) => f.status === 'OVERDUE').length
  };

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);

  const attendanceCounts = {
    present: attendance.filter((a) => a.status === 'PRESENT').length,
    absent: attendance.filter((a) => a.status === 'ABSENT').length,
    late: attendance.filter((a) => a.status === 'LATE').length
  };

  const latestProgress = progress[0];

  return (
    <div className="space-y-4 pb-44 sm:pb-6">
      {/* ── Header ── */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <Link href="/admin/reports" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-[#1F5A5C] hover:text-[#1b5e62]">
          <ChevronLeft className="h-4 w-4" />
          Back to Reports
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a] sm:text-3xl">{student.user.fullName}</h1>
          <p className="mt-2 text-sm text-[#64748b]">
            {className} • Admission: {admissionNo}
          </p>
        </div>
      </div>

      {/* ── Fee Summary ── */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <h2 className="text-lg font-bold text-[#0f172a] mb-4">Fee Summary</h2>

        {/* Status Grid */}
        <div className="grid gap-3 mb-6 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-xl bg-[#f0fdf4] p-4">
            <p className="text-xs text-[#64748b] mb-2">Paid</p>
            <p className="text-2xl font-bold text-[#15803d]">{feeCounts.paid}</p>
          </div>
          <div className="rounded-xl bg-[#fef2f2] p-4">
            <p className="text-xs text-[#64748b] mb-2">Pending</p>
            <p className="text-2xl font-bold text-[#b91c1c]">{feeCounts.pending}</p>
          </div>
          <div className="rounded-xl bg-[#fff7ed] p-4">
            <p className="text-xs text-[#64748b] mb-2">Partial</p>
            <p className="text-2xl font-bold text-[#b45309]">{feeCounts.partial}</p>
          </div>
          <div className="rounded-xl bg-[#fef2f2] p-4">
            <p className="text-xs text-[#64748b] mb-2">Overdue</p>
            <p className="text-2xl font-bold text-[#dc2626]">{feeCounts.overdue}</p>
          </div>
        </div>

        {/* Total Collected */}
        <div className="rounded-xl bg-[#f4f7f7] p-4">
          <p className="text-xs text-[#64748b]">Total Collected</p>
          <p className="mt-1.5 text-xl font-bold text-[#0f172a]">{formatMoney(totalCollected)}</p>
        </div>
      </div>

      {/* ── Attendance Summary ── */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-[#1F5A5C]" />
          <h2 className="text-lg font-bold text-[#0f172a]">Attendance (Last 30 Days)</h2>
        </div>

        <div className="grid gap-3 grid-cols-3">
          <div className="rounded-xl bg-[#f0fdf4] p-4 text-center">
            <p className="text-xs text-[#64748b] mb-2">Present</p>
            <p className="text-2xl font-bold text-[#15803d]">{attendanceCounts.present}</p>
          </div>
          <div className="rounded-xl bg-[#fef2f2] p-4 text-center">
            <p className="text-xs text-[#64748b] mb-2">Absent</p>
            <p className="text-2xl font-bold text-[#dc2626]">{attendanceCounts.absent}</p>
          </div>
          <div className="rounded-xl bg-[#fff7ed] p-4 text-center">
            <p className="text-xs text-[#64748b] mb-2">Late</p>
            <p className="text-2xl font-bold text-[#b45309]">{attendanceCounts.late}</p>
          </div>
        </div>
      </div>

      {/* ── Hifz Progress ── */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-[#1F5A5C]" />
          <h2 className="text-lg font-bold text-[#0f172a]">Hifz Progress</h2>
        </div>

        {progress.length === 0 ? (
          <p className="text-xs text-center text-[#64748b] py-6">No progress records found.</p>
        ) : (
          <>
            {/* Latest Summary */}
            {latestProgress && (
              <div className="mb-6 rounded-xl bg-[#f4f7f7] p-4">
                <p className="text-xs text-[#64748b] mb-2">Latest Lesson</p>
                <p className="font-semibold text-[#0f172a]">
                  {latestProgress.lessonType === 'JUZZ' && latestProgress.juzzNumber
                    ? `Juzz ${latestProgress.juzzNumber}`
                    : `Lesson ${latestProgress.lessonNumber}`}
                </p>
                <div className="mt-2 flex gap-3 text-xs text-[#64748b]">
                  <span>{latestProgress.lessonType} lesson #{latestProgress.lessonNumber}</span>
                </div>
              </div>
            )}

            {/* Progress Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="bg-[#f3f4f5] border-b border-[#e2e8e8]">
                    <th className="py-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#64748b]">Date</th>
                    <th className="py-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#64748b]">Lesson</th>
                    <th className="py-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#64748b]">Tajweedi</th>
                    <th className="py-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#64748b]">Hifz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8e8]">
                  {progress.map((p) => (
                    <tr key={p.date.toString()} className="hover:bg-[#f9fafb]">
                      <td className="py-2 px-3 text-xs text-[#64748b]">{formatDate(p.date)}</td>
                      <td className="py-2 px-3 text-[#0f172a]">
                        {p.lessonType === 'JUZZ' && p.juzzNumber ? `Juzz ${p.juzzNumber}` : `Lesson ${p.lessonNumber}`}
                      </td>
                      <td className="py-2 px-3 text-[#64748b]">—</td>
                      <td className="py-2 px-3 text-[#64748b]">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Exam Results ── */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-[#1F5A5C]" />
          <h2 className="text-lg font-bold text-[#0f172a]">Exam Results</h2>
        </div>

        {results.length === 0 ? (
          <p className="text-xs text-center text-[#64748b] py-6">No exam results found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="bg-[#f3f4f5] border-b border-[#e2e8e8]">
                  <th className="py-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#64748b]">Exam</th>
                  <th className="py-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#64748b]">Subject</th>
                  <th className="py-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#64748b]">Marks</th>
                  <th className="py-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#64748b]">Grade</th>
                  <th className="py-2 px-3 text-left text-xs font-bold uppercase tracking-widest text-[#64748b]">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8e8]">
                {results.map((r) => (
                  <tr key={r.id} className="hover:bg-[#f9fafb]">
                    <td className="py-2 px-3 font-medium text-[#0f172a]">{r.exam.title}</td>
                    <td className="py-2 px-3 text-[#445050]">{r.subject.name}</td>
                    <td className="py-2 px-3 font-semibold text-[#1F5A5C]">
                      {r.marksObtained}/{r.exam.totalMarks}
                    </td>
                    <td className="py-2 px-3 text-[#64748b]">{r.grade || '—'}</td>
                    <td className="py-2 px-3 text-xs text-[#64748b]">{formatDate(r.exam.examDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Action Bar (sticky mobile) ── */}
      <div className="fixed bottom-[88px] sm:static left-0 right-0 z-40 border-t border-[#e2e8e8] bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] sm:rounded-2xl sm:shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:border-none">
        <StudentReportDetailActions
          studentId={studentId}
          whatsApp={student.user.phone ?? null}
          guardianPhone={student.emergencyContact ?? null}
          studentName={student.user.fullName}
          className={className}
          admissionNo={admissionNo}
          pendingCount={feeCounts.pending}
          overdueCount={feeCounts.overdue}
          paidCount={feeCounts.paid}
          totalCollected={totalCollected}
          presentCount={attendanceCounts.present}
          absentCount={attendanceCounts.absent}
          lateCount={attendanceCounts.late}
          latestLesson={
            latestProgress
              ? latestProgress.lessonType === 'JUZZ' && latestProgress.juzzNumber
                ? `Juzz ${latestProgress.juzzNumber}`
                : `Lesson ${latestProgress.lessonNumber}`
              : 'None'
          }
          latestTajweeditotal={0}
          latestHifzTotal={0}
          examCount={results.length}
        />
      </div>
    </div>
  );
}
