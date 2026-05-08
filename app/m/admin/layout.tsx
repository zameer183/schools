import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { BottomNav } from '@/components/m-admin/bottom-nav';

export const dynamic = 'force-dynamic';

export default async function MobileAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAuth([UserRole.ADMIN]);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-[#F7F8F8] pb-[72px]">
      {children}
      <BottomNav />
    </div>
  );
}
