import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export const dynamic = 'force-dynamic';

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth([UserRole.TEACHER, UserRole.ADMIN]);
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { fullName: true, role: true } });

  return (
    <DashboardShell role={user?.role ?? UserRole.TEACHER} fullName={user?.fullName ?? 'Teacher'}>
      {children}
    </DashboardShell>
  );
}