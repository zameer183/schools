import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminRolesWorkspace from './admin-roles-workspace';

export const dynamic = 'force-dynamic';

const ROLE_META = {
  ADMIN: { label: 'Admin', description: 'Full system access', tier: 'Superuser' },
  TEACHER: { label: 'Teacher', description: 'Academic management', tier: 'Departmental' },
  STUDENT: { label: 'Student', description: 'Learning workspace access', tier: 'Operational' },
  PARENT: { label: 'Parent', description: 'Guardian oversight and finance visibility', tier: 'Financial' }
} as const;

const getCachedRoleCounts = unstable_cache(
  async () =>
    prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true }
    }),
  ['admin-roles-page-data'],
  { revalidate: 30 }
);

export default async function AdminRolesPage() {
  await requireAuth([UserRole.ADMIN]);

  const usersByRole = await getCachedRoleCounts();
  const roleMap = new Map(usersByRole.map((r) => [r.role, r._count._all]));

  const roles = (Object.keys(ROLE_META) as UserRole[]).map((role) => ({
    key: role,
    label: ROLE_META[role].label,
    description: ROLE_META[role].description,
    tier: ROLE_META[role].tier,
    userCount: roleMap.get(role) ?? 0
  }));

  return <AdminRolesWorkspace roles={roles} />;
}
