import { UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { requireAuth, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SettingsWorkspace from './settings-workspace';

export const dynamic = 'force-dynamic';

type SaveState = { ok: boolean; message: string };

async function saveSettingsAction(userId: string, prev: SaveState, formData: FormData): Promise<SaveState> {
  'use server';

  const fullName = String(formData.get('fullName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const phone = String(formData.get('phone') ?? '').trim();
  const avatarDataUrl = String(formData.get('avatarDataUrl') ?? '').trim();
  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (!fullName || !email) return { ok: false, message: 'Name and email are required.' };

  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!currentUser) return { ok: false, message: 'Admin user not found.' };

  const duplicate = await prisma.user.findFirst({
    where: { email, NOT: { id: userId } },
    select: { id: true }
  });
  if (duplicate) return { ok: false, message: 'Email already in use by another account.' };

  if (newPassword || confirmPassword || currentPassword) {
    if (newPassword.length < 6) return { ok: false, message: 'New password must be at least 6 characters.' };
    if (newPassword !== confirmPassword) return { ok: false, message: 'Password confirmation does not match.' };
    const isCurrentValid = await verifyPassword(currentPassword, currentUser.passwordHash);
    if (!isCurrentValid) return { ok: false, message: 'Current password is incorrect.' };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      fullName,
      email,
      phone: phone || null,
      avatarUrl: avatarDataUrl || currentUser.avatarUrl || null,
      ...(newPassword ? { passwordHash: await hash(newPassword, 12) } : {})
    }
  });

  return { ok: true, message: 'Settings saved successfully.' };
}

export default async function AdminSettingsPage() {
  const session = await requireAuth([UserRole.ADMIN]);

  const [admin, userCounts, teacherCount, studentCount, totalStorage] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      select: { fullName: true, email: true, phone: true, avatarUrl: true, createdAt: true }
    }),
    prisma.user.count(),
    prisma.teacher.count(),
    prisma.student.count(),
    prisma.fileAsset.aggregate({ _sum: { sizeInBytes: true } })
  ]);

  if (!admin) {
    return <div className="rounded-2xl bg-white p-6 text-sm text-[#6f7979]">Admin profile not found.</div>;
  }

  const storageMb = (Number(totalStorage._sum.sizeInBytes ?? 0) / (1024 * 1024)).toFixed(1);

  return (
    <SettingsWorkspace
      admin={{
        fullName: admin.fullName,
        email: admin.email,
        phone: admin.phone ?? '',
        avatarUrl: admin.avatarUrl ?? '',
        createdAtLabel: new Date(admin.createdAt).toLocaleDateString('en-CA')
      }}
      system={{
        totalUsers: userCounts,
        totalStorageMb: storageMb,
        activeTeachers: teacherCount,
        activeStudents: studentCount
      }}
      action={saveSettingsAction.bind(null, session.id)}
    />
  );
}

