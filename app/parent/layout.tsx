import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export const dynamic = 'force-dynamic';

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth([UserRole.PARENT, UserRole.ADMIN]);

  return (
    <DashboardShell role={UserRole.PARENT} fullName={session.fullName || 'Parent'}>
      {children}
    </DashboardShell>
  );
}
