import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { AdminShell } from '@/components/admin/admin-shell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth([UserRole.ADMIN]);

  return <AdminShell fullName={session.fullName || 'System Admin'}>{children}</AdminShell>;
}
