import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export const dynamic = 'force-dynamic';

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth([UserRole.TEACHER]);

  return (
    <DashboardShell role={(session.role as UserRole) ?? UserRole.TEACHER} fullName={session.fullName || 'Teacher'}>
      {children}
    </DashboardShell>
  );
}
