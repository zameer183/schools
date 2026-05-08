import Link from 'next/link';
import { ChevronRight, Bell, Shield, Building2, Pencil } from 'lucide-react';
import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SignOutButton } from '@/components/m-admin/sign-out-button';

export const dynamic = 'force-dynamic';

export default async function MobileAdminProfilePage() {
  const session = await requireAuth([UserRole.ADMIN]);

  const unreadNotifications = await prisma.notification.count({
    where: { userId: session.id, isRead: false }
  });

  const initials = (session.fullName || 'System Admin')
    .split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <div className="flex flex-col">
      <header className="rounded-b-3xl bg-[#1B4D4B] px-4 pt-7 pb-14 text-white">
        <p className="text-sm font-medium">Profile</p>
      </header>

      <section className="-mt-12 mx-4 flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E68A00] text-lg font-medium text-[#4A1B0C]">
          {initials || 'SA'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-[#111]">{session.fullName || 'System Admin'}</p>
          <p className="mt-0.5 truncate text-[10px] text-[#6B7280]">{session.email} · Manarah Institute</p>
          <span className="mt-1 inline-block rounded-md bg-[#1B4D4B]/10 px-2 py-0.5 text-[9px] font-medium text-[#1B4D4B]">
            {session.role} role
          </span>
        </div>
        <Link href="/admin/settings" className="text-[#6B7280]">
          <Pencil className="h-4 w-4" />
        </Link>
      </section>

      <p className="mt-4 px-4 text-[10px] uppercase tracking-wider text-[#6B7280]">Account</p>
      <div className="mx-4 mt-2 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
        <Link href="/admin/institute" className="flex items-center gap-3 border-b border-[#F3F4F6] px-3 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1B4D4B]/10">
            <Building2 className="h-3.5 w-3.5 text-[#1B4D4B]" />
          </span>
          <span className="flex-1 text-xs text-[#111]">Institute settings</span>
          <ChevronRight className="h-3.5 w-3.5 text-[#6B7280]" />
        </Link>

        <Link href="/m/admin/notifications" className="flex items-center gap-3 border-b border-[#F3F4F6] px-3 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E68A00]/20">
            <Bell className="h-3.5 w-3.5 text-[#854F0B]" />
          </span>
          <span className="flex-1 text-xs text-[#111]">Notifications</span>
          {unreadNotifications > 0 ? (
            <span className="rounded-md bg-[#1B4D4B] px-2 py-0.5 text-[9px] text-white">{unreadNotifications}</span>
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[#6B7280]" />
          )}
        </Link>

        <Link href="/admin/roles" className="flex items-center gap-3 px-3 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#653B28]/15">
            <Shield className="h-3.5 w-3.5 text-[#653B28]" />
          </span>
          <span className="flex-1 text-xs text-[#111]">Security & roles</span>
          <ChevronRight className="h-3.5 w-3.5 text-[#6B7280]" />
        </Link>
      </div>

      <p className="mt-4 px-4 text-[10px] uppercase tracking-wider text-[#6B7280]">Preferences</p>
      <div className="mx-4 mt-2 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
        <div className="flex items-center gap-3 border-b border-[#F3F4F6] px-3 py-3">
          <span className="flex-1 text-xs text-[#111]">Language</span>
          <span className="text-[10px] text-[#6B7280]">English</span>
        </div>
        <div className="flex items-center gap-3 px-3 py-3">
          <span className="flex-1 text-xs text-[#111]">Dark mode</span>
          <span className="relative inline-block h-5 w-9 rounded-full bg-[#1B4D4B]">
            <span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white" />
          </span>
        </div>
      </div>

      <div className="mx-4 my-5">
        <SignOutButton />
      </div>
    </div>
  );
}
