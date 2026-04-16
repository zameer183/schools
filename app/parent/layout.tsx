import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export const dynamic = 'force-dynamic';

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth([UserRole.PARENT, UserRole.ADMIN]);
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { fullName: true, role: true } });

  return (
    <DashboardShell role={user?.role ?? UserRole.PARENT} fullName={user?.fullName ?? 'Parent'}>
      {children}
    </DashboardShell>
  );
}
