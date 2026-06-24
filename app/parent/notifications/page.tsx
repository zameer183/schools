import { UserRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getParentContext } from '@/lib/parent-data';
import { PageHeader, KpiCard, Card, StatusBadge } from '@/components/ui';
import { Bell, AlertCircle, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function markAllRead() {
  'use server';
  const session = await requireAuth([UserRole.PARENT, UserRole.ADMIN]);
  const context = await getParentContext(session.id);
  await prisma.notification.updateMany({
    where: {
      isRead: false,
      OR: [{ userId: session.id }, ...(context ? [{ studentId: { in: context.childIds } }] : [])]
    },
    data: { isRead: true }
  });
  revalidatePath('/parent/notifications');
}

export default async function ParentNotificationsPage() {
  const session = await requireAuth([UserRole.PARENT, UserRole.ADMIN]);
  const context = await getParentContext(session.id);

  if (!context) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center text-center py-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FEE2E2]">
            <AlertCircle className="h-7 w-7 text-[#EF4444]" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[#1F2937]">Notifications Unavailable</h2>
          <p className="mt-1 max-w-sm text-sm text-[#6B7280]">Parent profile missing. Contact your administrator.</p>
        </div>
      </Card>
    );
  }

  const notificationWhere = {
    OR: [{ userId: session.id }, { studentId: { in: context.childIds } }]
  };

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: notificationWhere,
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        user: { select: { fullName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    prisma.notification.count({
      where: {
        ...notificationWhere,
        isRead: false
      }
    })
  ]);

  const readCount = notifications.filter((item) => item.isRead).length;
  const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="School updates and important alerts."
        action={
          <form action={markAllRead}>
            <button className="rounded-lg bg-white border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#1F2937] hover:bg-[#F9FAFB] transition-colors active:scale-[0.97]">
              Mark read
            </button>
          </form>
        }
        badge={
          <span className="inline-flex items-center rounded-full bg-[#F5E6CC] px-3 py-1 text-xs font-bold text-[#D69E3F]">
            {unreadCount} unread
          </span>
        }
      />

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <KpiCard variant="primary" icon={<Bell />} label="Total" value={notifications.length} />
        <KpiCard variant="accent" icon={<AlertCircle />} label="Unread" value={unreadCount} />
        <KpiCard variant="success" icon={<CheckCircle2 />} label="Read" value={readCount} />
      </section>

      <Card>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-10 w-10 text-[#E5E7EB]" />
            <p className="mt-2 text-sm text-[#9CA3AF]">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg p-3 sm:p-4 border transition-colors ${
                  item.isRead
                    ? 'bg-white border-[#E5E7EB] hover:bg-[#F9FAFB]'
                    : 'bg-[#FEF3C7] border-[#FCD34D]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-[#1F2937]">{item.title}</p>
                  <StatusBadge variant={item.isRead ? 'info' : 'pending'}>{item.type}</StatusBadge>
                </div>
                {item.body ? <p className="text-sm text-[#6B7280]">{item.body}</p> : null}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B7280]">
                  <span>{toDate(item.createdAt).toISOString().slice(0, 10)}</span>
                  <span className="inline-flex items-center gap-1">
                    For:
                    <span className="font-semibold text-[#1F2937]">
                      {item.student?.user.fullName ?? item.user.fullName}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
