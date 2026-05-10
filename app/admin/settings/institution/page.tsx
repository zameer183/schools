import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import InstitutionClient from './institution-client';

export const dynamic = 'force-dynamic';

export default async function InstitutionPage() {
  const session = await requireAuth([UserRole.ADMIN]);

  const admin = await prisma.user.findUnique({
    where: { id: session.id },
    select: { email: true, phone: true },
  });

  return (
    <InstitutionClient
      data={{
        supportEmail: admin?.email ?? '',
        supportPhone: admin?.phone ?? '',
      }}
    />
  );
}
