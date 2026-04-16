import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function StudentAssignmentsPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);

  const student = await prisma.student.findUnique({ where: { userId: session.id }, select: { id: true, classId: true } });

  if (!student?.classId) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h2 className="font-headline text-4xl font-extrabold text-slate-900">Assignments</h2>
        <p className="mt-2 text-slate-600">No class assigned yet.</p>
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

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h2 className="font-headline text-4xl font-extrabold tracking-tight text-slate-900">Assignments</h2>
        <p className="mt-2 text-slate-600">Track class assignments and submission status.</p>
      </section>

      <section className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <div className="space-y-3">
          {assignments.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No assignments available.</p>
          ) : (
            assignments.map((assignment) => {
              const mine = assignment.submissions[0];
              return (
                <article key={assignment.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">{assignment.title}</h3>
                    <span className="text-xs text-slate-500">Due: {assignment.dueDate.toISOString().slice(0, 10)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Subject: {assignment.subject.name}</p>
                  <p className="text-sm text-slate-600">Teacher: {assignment.teacher.user.fullName}</p>
                  <p className="mt-2 text-sm text-slate-700">{assignment.description}</p>
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    Submission: {mine ? `${mine.status} (${mine.submittedAt.toISOString().slice(0, 10)})` : 'Not submitted yet'}
                  </p>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}