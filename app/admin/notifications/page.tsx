import { NotificationType, UserRole } from '@prisma/client';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminNotificationsWorkspace from './admin-notifications-workspace';

export const dynamic = 'force-dynamic';
const ALLOWED_TYPES: NotificationType[] = ['SYSTEM', 'ACADEMIC', 'FINANCIAL', 'ATTENDANCE', 'MESSAGE'];

function toSafeDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

const getCachedAdminNotificationsData = unstable_cache(
  async () => {
    const [total, unread, recentRaw] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({ where: { isRead: false } }),
      prisma.notification.findMany({
        include: { user: { select: { role: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ]);

    return { total, unread, recentRaw };
  },
  ['admin-notifications-page-data'],
  { revalidate: 30, tags: ['admin-notifications'] }
);

async function broadcastNotification(formData: FormData) {
  'use server';
  await requireAuth([UserRole.ADMIN]);

  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const typeRaw = String(formData.get('type') ?? 'SYSTEM').toUpperCase() as NotificationType;
  const targetRoleRaw = String(formData.get('targetRole') ?? 'ALL').toUpperCase();

  if (!title || !body || !ALLOWED_TYPES.includes(typeRaw)) return;
  const where = targetRoleRaw === 'ALL' ? undefined : { role: targetRoleRaw as UserRole };
  const users = await prisma.user.findMany({ where, select: { id: true } });
  if (!users.length) return;

  await prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, title, body, type: typeRaw, isRead: false }))
  });
  revalidateTag('admin-notifications');
  revalidatePath('/admin/notifications');
}

export default async function AdminNotificationsPage() {
  await requireAuth([UserRole.ADMIN]);

  const { total, unread, recentRaw } = await getCachedAdminNotificationsData().catch((error) => {
    console.error('[admin/notifications] failed to load notifications data', error);
    return {
      total: 0,
      unread: 0,
      recentRaw: [] as Awaited<ReturnType<typeof getCachedAdminNotificationsData>>['recentRaw']
    };
  });

  const grouped = new Map<
    string,
    {
    id: string;
    title: string;
    subtitle: string;
    type: NotificationType;
    createdAt: Date;
    anyUnread: boolean;
    roles: Set<UserRole>;
  }
  >();

  for (const item of recentRaw) {
    const createdAt = toSafeDate(item.createdAt);
    if (!createdAt) continue;

    // Group same broadcast rows together (created in same minute, same content/type)
    const minuteBucket = Math.floor(createdAt.getTime() / 60000);
    const key = `${item.title}|${item.body}|${item.type}|${minuteBucket}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.roles.add(item.user.role);
      existing.anyUnread = existing.anyUnread || !item.isRead;
      if (createdAt > existing.createdAt) existing.createdAt = createdAt;
      continue;
    }

    grouped.set(key, {
      id: item.id,
      title: item.title,
      subtitle: item.body,
      type: item.type,
      createdAt,
      anyUnread: !item.isRead,
      roles: new Set([item.user.role])
    });
  }

  const recent = Array.from(grouped.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20)
    .map((item) => {
      const target =
        item.roles.size > 1
          ? 'ALL'
          : Array.from(item.roles)[0] ?? 'ALL';
      return {
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        type: item.type,
        createdAt: item.createdAt.toISOString(),
        status: item.anyUnread ? ('Unread' as const) : ('Sent' as const),
        target
      };
    });

  const readRate = total > 0 ? Math.round(((total - unread) / total) * 100) : 0;

  return (
    <AdminNotificationsWorkspace
      stats={{
        total,
        unread,
        sent: total,
        readRate
      }}
      notifications={recent}
      composeAction={broadcastNotification}
    />
  );
}
