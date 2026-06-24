import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export const dynamic = 'force-dynamic';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);

  return (
    <DashboardShell role={UserRole.STUDENT} fullName={session.fullName || 'Student'}>
      {children}
    </DashboardShell>
  );
}
