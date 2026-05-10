import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import ProfileClient from './profile-client';

export const dynamic = 'force-dynamic';

type State = { ok: boolean; message: string };

async function saveProfileAction(userId: string, prev: State, formData: FormData): Promise<State> {
  'use server';

  const fullName = String(formData.get('fullName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const phone = String(formData.get('phone') ?? '').trim();
  const avatarDataUrl = String(formData.get('avatarDataUrl') ?? '').trim();

  if (!fullName || !email) return { ok: false, message: 'Name and email are required.' };

  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!currentUser) return { ok: false, message: 'Admin user not found.' };

  const duplicate = await prisma.user.findFirst({
    where: { email, NOT: { id: userId } },
    select: { id: true },
  });
  if (duplicate) return { ok: false, message: 'Email already in use by another account.' };

  await prisma.user.update({
    where: { id: userId },
    data: {
      fullName,
      email,
      phone: phone || null,
      avatarUrl: avatarDataUrl || currentUser.avatarUrl || null,
    },
  });

  return { ok: true, message: 'Profile saved successfully.' };
}

export default async function ProfilePage() {
  const session = await requireAuth([UserRole.ADMIN]);

  const admin = await prisma.user.findUnique({
    where: { id: session.id },
    select: { fullName: true, email: true, phone: true, avatarUrl: true, createdAt: true },
  });

  if (!admin) {
    return (
      <div className="rounded-2xl bg-white p-6 text-sm text-[#6f7979]">Admin profile not found.</div>
    );
  }

  return (
    <ProfileClient
      admin={{
        fullName: admin.fullName,
        email: admin.email,
        phone: admin.phone ?? '',
        avatarUrl: admin.avatarUrl ?? '',
        createdAtLabel: new Date(admin.createdAt).toLocaleDateString('en-CA'),
      }}
      action={saveProfileAction.bind(null, session.id)}
    />
  );
}
