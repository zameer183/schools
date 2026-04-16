import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminShell } from '@/components/admin/admin-shell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth([UserRole.ADMIN]);
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { fullName: true } });

  return <AdminShell fullName={user?.fullName ?? 'System Admin'}>{children}</AdminShell>;
}
