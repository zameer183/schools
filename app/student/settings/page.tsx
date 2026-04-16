import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function StudentSettingsPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);

  const student = await prisma.student.findUnique({
    where: { userId: session.id },
    include: {
      user: { select: { fullName: true, email: true, phone: true } },
      class: { select: { name: true, section: true } }
    }
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Settings</h2>
        <p className="mt-2 text-[#5c6668]">Profile summary and account contact details.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
          <h3 className="font-semibold text-[#1a1c1c]">Profile</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl bg-[#f3f4f3] px-4 py-3">
              <p className="text-[#6e7778]">Name</p>
              <p className="font-semibold text-[#1a1c1c]">{student?.user.fullName ?? '-'}</p>
            </div>
            <div className="rounded-2xl bg-[#f3f4f3] px-4 py-3">
              <p className="text-[#6e7778]">Email</p>
              <p className="font-semibold text-[#1a1c1c]">{student?.user.email ?? '-'}</p>
            </div>
            <div className="rounded-2xl bg-[#f3f4f3] px-4 py-3">
              <p className="text-[#6e7778]">Phone</p>
              <p className="font-semibold text-[#1a1c1c]">{student?.user.phone ?? '-'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
          <h3 className="font-semibold text-[#1a1c1c]">Academic Link</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl bg-[#f3f4f3] px-4 py-3">
              <p className="text-[#6e7778]">Class</p>
              <p className="font-semibold text-[#1a1c1c]">{student?.class ? `${student.class.name} - ${student.class.section}` : 'Not assigned yet'}</p>
            </div>
            <div className="rounded-2xl bg-[#f3f4f3] px-4 py-3">
              <p className="text-[#6e7778]">Account Type</p>
              <p className="font-semibold text-[#1a1c1c]">Student Portal</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
