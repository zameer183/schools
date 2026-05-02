import { UserRole } from '@prisma/client';
import { revalidatePath, unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader, Card, StatusBadge } from '@/components/ui';
import { Bell } from 'lucide-react';

export const dynamic = 'force-dynamic';

const getCachedTeacherNotificationsData = unstable_cache(
  async (userId: string) => {
    const [unread, items] = await Promise.all([
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ]);

    return { unread, items };
  },
  ['teacher-notifications-page-data'],
  { revalidate: 30 }
);

async function markAllRead() {
  'use server';
  const session = await requireAuth([UserRole.TEACHER, UserRole.ADMIN]);
  await prisma.notification.updateMany({
    where: { userId: session.id, isRead: false },
    data: { isRead: true }
  });
  revalidatePath('/teacher/notifications');
}

export default async function TeacherNotificationsPage() {
  const session = await requireAuth([UserRole.TEACHER, UserRole.ADMIN]);
  const { unread, items } = await getCachedTeacherNotificationsData(session.id);
  const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Announcements and alerts for your classes."
        action={
          <form action={markAllRead}>
            <button className="rounded-lg bg-white border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#1F2937] hover:bg-[#F9FAFB] transition-colors active:scale-[0.97]">
              Mark read
            </button>
          </form>
        }
        badge={
          <span className="inline-flex items-center rounded-full bg-[#F5E6CC] px-3 py-1 text-xs font-bold text-[#D69E3F]">
            {unread} unread
          </span>
        }
      />

      <Card>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-10 w-10 text-[#E5E7EB]" />
            <p className="mt-2 text-sm text-[#9CA3AF]">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className={`rounded-lg p-4 border transition-colors ${item.isRead ? 'bg-white border-[#E5E7EB] hover:bg-[#F9FAFB]' : 'bg-[#FEF3C7] border-[#FCD34D]'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-[#1F2937]">{item.title}</p>
                  <StatusBadge variant={item.isRead ? 'info' : 'pending'}>
                    {item.type}
                  </StatusBadge>
                </div>
                <p className="text-sm text-[#6B7280]">{item.body}</p>
                <p className="mt-2 text-xs text-[#6B7280]">{toDate(item.createdAt).toISOString().slice(0, 10)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
