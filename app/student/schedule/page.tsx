import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function StudentSchedulePage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);

  const student = await prisma.student.findUnique({
    where: { userId: session.id },
    include: {
      class: {
        include: {
          subjects: {
            include: {
              teacher: { include: { user: { select: { fullName: true } } } }
            },
            orderBy: { name: 'asc' }
          }
        }
      }
    }
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h2 className="font-headline text-4xl font-extrabold tracking-tight text-slate-900">Class Schedule</h2>
        <p className="mt-2 text-slate-600">
          {student?.class ? `Class: ${student.class.name} - ${student.class.section}` : 'Class not assigned yet.'}
        </p>
      </section>

      <section className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h3 className="font-headline text-2xl font-bold text-slate-900">Subjects</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {!student?.class || student.class.subjects.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No schedule data available.</p>
          ) : (
            student.class.subjects.map((subject) => (
              <div key={subject.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">{subject.name}</p>
                <p className="text-sm text-slate-600">Code: {subject.code}</p>
                <p className="text-sm text-slate-600">Teacher: {subject.teacher?.user.fullName ?? 'TBA'}</p>
                <p className="text-sm text-slate-600">Credit Hours: {subject.creditHours}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}