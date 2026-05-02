import { UserRole } from '@prisma/client';
import { revalidatePath, unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

const getCachedStudentNotificationsData = unstable_cache(
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
  ['student-notifications-page-data'],
  { revalidate: 30 }
);

async function markAllRead() {
  'use server';
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);
  await prisma.notification.updateMany({
    where: { userId: session.id, isRead: false },
    data: { isRead: true }
  });
  revalidatePath('/student/notifications');
}

export default async function StudentNotificationsPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);
  const { unread, items } = await getCachedStudentNotificationsData(session.id);
  const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));

  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1F2937]">Notifications</h2>
            <p className="mt-2 text-sm text-[#6B7280]">School updates and important alerts.</p>
          </div>
          <form action={markAllRead}>
            <button className="rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#1F2937] hover:bg-[#EBF2F5] transition-colors">
              Mark read
            </button>
          </form>
        </div>
        <div className="mt-4 inline-flex rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-bold text-[#D69E3F]">
          {unread} unread
        </div>
      </Card>

      <Card className="p-5 md:p-6">
        {items.length === 0 ? (
          <p className="text-sm text-[#6B7280]">No notifications.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className={`rounded-lg p-4 border ${item.isRead ? 'bg-white border-[#E5E7EB]' : 'bg-[#FEF3C7] border-[#FCD34D]'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-[#1F2937]">{item.title}</p>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] shrink-0">{item.type}</span>
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
