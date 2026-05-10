import { requireAuth, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import SecurityClient from './security-client';

export const dynamic = 'force-dynamic';

type State = { ok: boolean; message: string };

async function saveSecurityAction(userId: string, prev: State, formData: FormData): Promise<State> {
  'use server';

  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  // If none of the password fields are filled, nothing to do
  if (!currentPassword && !newPassword && !confirmPassword) {
    return { ok: true, message: 'No changes to save.' };
  }

  if (newPassword.length < 6) {
    return { ok: false, message: 'New password must be at least 6 characters.' };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, message: 'Password confirmation does not match.' };
  }

  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!currentUser) return { ok: false, message: 'Admin user not found.' };

  const isCurrentValid = await verifyPassword(currentPassword, currentUser.passwordHash);
  if (!isCurrentValid) return { ok: false, message: 'Current password is incorrect.' };

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hash(newPassword, 12) },
  });

  return { ok: true, message: 'Password updated successfully.' };
}

export default async function SecurityPage() {
  const session = await requireAuth([UserRole.ADMIN]);

  const admin = await prisma.user.findUnique({
    where: { id: session.id },
    select: { createdAt: true },
  });

  const createdAtLabel = admin
    ? new Date(admin.createdAt).toLocaleDateString('en-CA')
    : '—';

  return (
    <SecurityClient
      createdAtLabel={createdAtLabel}
      action={saveSecurityAction.bind(null, session.id)}
    />
  );
}
