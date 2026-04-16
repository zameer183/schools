import Link from 'next/link';
import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function StudentAssignmentsPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);

  const student = await prisma.student.findUnique({ where: { userId: session.id }, select: { id: true, classId: true } });

  if (!student?.classId) {
    return (
      <div className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Assignments</h2>
        <p className="mt-2 text-[#5c6668]">No class assigned yet. Please contact your administrator.</p>
      </div>
    );
  }

  const assignments = await prisma.assignment.findMany({
    where: { classId: student.classId },
    include: {
      subject: { select: { name: true } },
      teacher: { include: { user: { select: { fullName: true } } } },
      submissions: { where: { studentId: student.id } }
    },
    orderBy: { dueDate: 'asc' }
  });

  const pending = assignments.filter((a) => !a.submissions[0] && new Date(a.dueDate) > new Date()).length;
  const submitted = assignments.filter((a) => a.submissions[0]).length;
  const overdue = assignments.filter((a) => !a.submissions[0] && new Date(a.dueDate) < new Date()).length;

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-6 border border-[#e2e8e8]">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Assignments</h2>
        <p className="mt-1 text-sm text-[#6f7979]">Track all class assignments and your submission status.</p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-[#fff3e0] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#865300]">Pending</p>
            <p className="mt-1 text-2xl font-bold text-[#1a1c1c]">{pending}</p>
          </div>
          <div className="rounded-xl bg-[#e8f5e9] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#004649]">Submitted</p>
            <p className="mt-1 text-2xl font-bold text-[#1a1c1c]">{submitted}</p>
          </div>
          <div className="rounded-xl bg-[#fce4ec] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#ba1a1a]">Overdue</p>
            <p className="mt-1 text-2xl font-bold text-[#1a1c1c]">{overdue}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 border border-[#e2e8e8]">
        <h3 className="font-semibold text-[#1a1c1c] mb-4">All Assignments</h3>
        <div className="space-y-3">
          {assignments.length === 0 ? (
            <div className="rounded-2xl bg-[#f3f4f3] p-5 text-sm text-[#596364]">No assignments available yet.</div>
          ) : (
            assignments.map((assignment) => {
              const mine = assignment.submissions[0];
              const isOverdue = !mine && new Date(assignment.dueDate) < new Date();
              const statusLabel = mine ? 'Submitted' : isOverdue ? 'Overdue' : 'Pending';
              const statusColor = mine
                ? 'bg-[#e8f5e9] text-[#004649]'
                : isOverdue
                ? 'bg-[#fce4ec] text-[#ba1a1a]'
                : 'bg-[#fff3e0] text-[#865300]';

              return (
                <Link key={assignment.id} href={`/student/assignments/${assignment.id}`} className="block">
                  <article className="rounded-xl border border-[#e2e8e8] p-5 hover:bg-[#f5f7f5] hover:border-[#004649]/30 transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1a1c1c] group-hover:text-[#004649] transition-colors">{assignment.title}</p>
                        <p className="text-xs text-[#6f7979] mt-0.5">{assignment.subject.name} · {assignment.teacher.user.fullName}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                          {statusLabel}
                        </span>
                        <svg className="h-4 w-4 text-[#6f7979] group-hover:text-[#004649] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-[#6f7979]">
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                        </svg>
                        Due {assignment.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span>· Max {assignment.maxMarks} pts</span>
                      {mine?.marksObtained != null && (
                        <span className="text-[#004649] font-semibold">· {mine.marksObtained} pts earned</span>
                      )}
                    </div>
                  </article>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
