import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader, Card } from '@/components/ui';
import { User, Mail, Phone, BookOpen } from 'lucide-react';

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
      <PageHeader
        title="Settings"
        subtitle="Profile summary and account details."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D1FAE5]">
              <User className="h-4 w-4 text-[#10B981]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F2937]">Profile</h3>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-widest">Name</p>
              <p className="text-sm font-semibold text-[#1F2937] mt-1">{student?.user.fullName ?? '-'}</p>
            </div>
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-widest">Email</p>
              <p className="text-sm font-semibold text-[#1F2937] mt-1 break-all">{student?.user.email ?? '-'}</p>
            </div>
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-widest">Phone</p>
              <p className="text-sm font-semibold text-[#1F2937] mt-1">{student?.user.phone ?? '-'}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0EBEC]">
              <BookOpen className="h-4 w-4 text-[#1F5A5C]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F2937]">Academic Info</h3>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-widest">Class</p>
              <p className="text-sm font-semibold text-[#1F2937] mt-1">{student?.class ? `${student.class.name} — ${student.class.section}` : 'Not assigned'}</p>
            </div>
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-widest">Account</p>
              <p className="text-sm font-semibold text-[#1F5A5C]">Student</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
