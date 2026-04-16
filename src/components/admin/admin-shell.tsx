import { UserRole } from '@prisma/client';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export function AdminShell({
  fullName,
  children
}: {
  fullName: string;
  children: React.ReactNode;
}) {
  return (
    <DashboardShell role={UserRole.ADMIN} fullName={fullName}>
      {children}
    </DashboardShell>
  );
}
