import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function StudentAssignmentsPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);

  const student = await prisma.student.findUnique({ where: { userId: session.id }, select: { id: true, classId: true } });

  if (!student?.classId) {
    return (
      <div className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#6e7778]">Student Hub</p>
        <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.03em] text-[#004649]">Assignments</h2>
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

  const submitted = assignments.filter((a) => a.submissions.length > 0).length;
  const pending = assignments.length - submitted;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#6e7778]">Student Hub</p>
        <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.03em] text-[#004649]">Assignments</h2>
        <p className="mt-2 text-[#5c6668]">Track all class assignments and your submission status.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">Total Assignments</p>
          <p className="font-headline mt-2 text-3xl font-extrabold text-[#004649]">{assignments.length}</p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">Submitted</p>
          <p className="font-headline mt-2 text-3xl font-extrabold text-emerald-700">{submitted}</p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">Pending</p>
          <p className="font-headline mt-2 text-3xl font-extrabold text-[#895100]">{pending}</p>
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <h3 className="font-headline text-2xl font-bold tracking-[-0.02em] text-[#004649]">Assignment List</h3>
        <div className="mt-5 space-y-4">
          {assignments.length === 0 ? (
            <div className="rounded-2xl bg-[#f3f4f3] p-5 text-sm text-[#596364]">No assignments available yet.</div>
          ) : (
            assignments.map((assignment) => {
              const mine = assignment.submissions[0];
              const isOverdue = !mine && new Date(assignment.dueDate) < new Date();
              return (
                <article key={assignment.id} className="rounded-2xl border border-[#d4dee7] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-headline text-lg font-bold text-[#004649]">{assignment.title}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${mine ? 'bg-emerald-100 text-emerald-700' : isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                      {mine ? 'Submitted' : isOverdue ? 'Overdue' : 'Pending'}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <div className="rounded-xl bg-[#f3f4f3] px-3 py-2">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6e7778]">Subject</span>
                      <span className="font-semibold text-[#1a1c1c]">{assignment.subject.name}</span>
                    </div>
                    <div className="rounded-xl bg-[#f3f4f3] px-3 py-2">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6e7778]">Teacher</span>
                      <span className="font-semibold text-[#1a1c1c]">{assignment.teacher.user.fullName}</span>
                    </div>
                    <div className="rounded-xl bg-[#f3f4f3] px-3 py-2">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6e7778]">Due Date</span>
                      <span className="font-semibold text-[#1a1c1c]">{assignment.dueDate.toISOString().slice(0, 10)}</span>
                    </div>
                  </div>
                  {assignment.description ? (
                    <p className="mt-3 text-sm text-[#596364]">{assignment.description}</p>
                  ) : null}
                  {mine ? (
                    <p className="mt-3 text-sm font-medium text-emerald-700">
                      Submitted on {mine.submittedAt.toISOString().slice(0, 10)} · Status: {mine.status}
                    </p>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
