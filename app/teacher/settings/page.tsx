import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function TeacherSettingsPage() {
  const session = await requireAuth([UserRole.TEACHER, UserRole.ADMIN]);

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.id },
    include: {
      user: { select: { fullName: true, email: true, phone: true } },
      subjects: { select: { name: true, code: true }, orderBy: { name: 'asc' } },
      classAssignments: { include: { class: { select: { name: true, section: true } } }, orderBy: { createdAt: 'asc' } }
    }
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#6e7778]">Teacher Hub</p>
        <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.03em] text-[#004649]">Settings</h2>
        <p className="mt-2 text-[#5c6668]">Profile summary and assigned academic scope.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <h3 className="font-headline text-2xl font-bold text-[#004649]">Profile</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl bg-[#f3f4f3] px-4 py-3">
              <p className="text-[#6e7778]">Name</p>
              <p className="font-semibold text-[#1a1c1c]">{teacher?.user.fullName ?? '-'}</p>
            </div>
            <div className="rounded-2xl bg-[#f3f4f3] px-4 py-3">
              <p className="text-[#6e7778]">Email</p>
              <p className="font-semibold text-[#1a1c1c]">{teacher?.user.email ?? '-'}</p>
            </div>
            <div className="rounded-2xl bg-[#f3f4f3] px-4 py-3">
              <p className="text-[#6e7778]">Phone</p>
              <p className="font-semibold text-[#1a1c1c]">{teacher?.user.phone ?? '-'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <h3 className="font-headline text-2xl font-bold text-[#004649]">Teaching Scope</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl bg-[#f3f4f3] px-4 py-3">
              <p className="text-[#6e7778]">Classes</p>
              <p className="font-semibold text-[#1a1c1c]">
                {teacher?.classAssignments.length ? teacher.classAssignments.map((item) => `${item.class.name} - ${item.class.section}`).join(', ') : 'No classes assigned'}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f3f4f3] px-4 py-3">
              <p className="text-[#6e7778]">Subjects</p>
              <p className="font-semibold text-[#1a1c1c]">
                {teacher?.subjects.length ? teacher.subjects.map((subject) => `${subject.name} (${subject.code})`).join(', ') : 'No subjects assigned'}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
