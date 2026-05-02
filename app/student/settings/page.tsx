import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

const getCachedStudentSettingsData = unstable_cache(
  async (userId: string) =>
    prisma.student.findUnique({
      where: { userId },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        class: { select: { name: true, section: true } }
      }
    }),
  ['student-settings-page-data'],
  { revalidate: 30 }
);

export default async function StudentSettingsPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);
  const student = await getCachedStudentSettingsData(session.id);

  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1F2937]">Settings</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Profile summary and account details.</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 md:p-8">
          <h3 className="text-lg font-semibold text-[#1F2937]">Profile</h3>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg bg-[#F5F1E8] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-widest">Name</p>
              <p className="text-sm font-semibold text-[#1F2937] mt-1">{student?.user.fullName ?? '-'}</p>
            </div>
            <div className="rounded-lg bg-[#F5F1E8] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-widest">Email</p>
              <p className="text-sm font-semibold text-[#1F2937] mt-1">{student?.user.email ?? '-'}</p>
            </div>
            <div className="rounded-lg bg-[#F5F1E8] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-widest">Phone</p>
              <p className="text-sm font-semibold text-[#1F2937] mt-1">{student?.user.phone ?? '-'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 md:p-8">
          <h3 className="text-lg font-semibold text-[#1F2937]">Academic Info</h3>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg bg-[#F5F1E8] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-widest">Class</p>
              <p className="text-sm font-semibold text-[#1F2937] mt-1">{student?.class ? `${student.class.name} — ${student.class.section}` : 'Not assigned'}</p>
            </div>
            <div className="rounded-lg bg-[#F5F1E8] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-widest">Account</p>
              <p className="text-sm font-semibold text-[#1F2937] mt-1">Student</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
