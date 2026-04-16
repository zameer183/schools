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
      <section className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#6e7778]">Student Hub</p>
        <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.03em] text-[#004649]">Class Schedule</h2>
        <p className="mt-2 text-[#5c6668]">
          {student?.class ? `Class: ${student.class.name} - ${student.class.section}` : 'No class assigned yet.'}
        </p>
      </section>

      <section className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <h3 className="font-headline text-2xl font-bold tracking-[-0.02em] text-[#004649]">Enrolled Subjects</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {!student?.class || student.class.subjects.length === 0 ? (
            <div className="rounded-2xl bg-[#f3f4f3] p-5 text-sm text-[#596364]">No schedule data available yet.</div>
          ) : (
            student.class.subjects.map((subject) => (
              <article key={subject.id} className="rounded-2xl border border-[#d4dee7] p-5">
                <p className="font-headline text-lg font-bold text-[#004649]">{subject.name}</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-xl bg-[#f3f4f3] px-3 py-2">
                    <span className="text-[#6e7778]">Code</span>
                    <span className="font-semibold text-[#1a1c1c]">{subject.code}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[#f3f4f3] px-3 py-2">
                    <span className="text-[#6e7778]">Teacher</span>
                    <span className="font-semibold text-[#1a1c1c]">{subject.teacher?.user.fullName ?? 'TBA'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[#f3f4f3] px-3 py-2">
                    <span className="text-[#6e7778]">Credit Hours</span>
                    <span className="font-semibold text-[#1a1c1c]">{subject.creditHours}</span>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}