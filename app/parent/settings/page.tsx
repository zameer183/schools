import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader, Card } from '@/components/ui';
import { User, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ParentSettingsPage() {
  const session = await requireAuth([UserRole.PARENT, UserRole.ADMIN]);

  const parent = await prisma.parent.findUnique({
    where: { userId: session.id },
    include: { user: { select: { fullName: true, email: true, phone: true } } }
  });

  const u = parent?.user;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Profile summary and account details." />

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
              <p className="text-sm font-semibold text-[#1F2937] mt-1">{u?.fullName ?? '-'}</p>
            </div>
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-widest">Email</p>
              <p className="text-sm font-semibold text-[#1F2937] mt-1 break-all">{u?.email ?? '-'}</p>
            </div>
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-widest">Phone</p>
              <p className="text-sm font-semibold text-[#1F2937] mt-1">{u?.phone ?? '-'}</p>
            </div>
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-widest">Occupation</p>
              <p className="text-sm font-semibold text-[#1F2937] mt-1">{parent?.occupation ?? '-'}</p>
            </div>
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-widest">
                Relation to Child
              </p>
              <p className="text-sm font-semibold text-[#1F2937] mt-1">{parent?.relationToChild ?? '-'}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0EBEC]">
              <ShieldCheck className="h-4 w-4 text-[#1F5A5C]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F2937]">Account Type</h3>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-widest">Role</p>
              <p className="text-sm font-semibold text-[#1F5A5C] mt-1">Parent / Guardian</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-[#6B7280]">
            To update your profile details, contact the school administrator.
          </p>
        </Card>
      </div>
    </div>
  );
}
