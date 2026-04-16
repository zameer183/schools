import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getParentContext } from '@/lib/parent-data';

export const dynamic = 'force-dynamic';

export default async function ParentNotificationsPage() {
  const session = await requireAuth([UserRole.PARENT, UserRole.ADMIN]);
  const context = await getParentContext(session.id);

  if (!context) {
    return (
      <div className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <h2 className="font-headline text-3xl font-extrabold text-[#004649]">Notifications</h2>
        <p className="mt-2 text-[#5c6668]">Parent profile missing.</p>
      </div>
    );
  }

  const notifications = await prisma.notification.findMany({
    where: {
      OR: [{ userId: session.id }, { studentId: { in: context.childIds } }]
    },
    include: {
      student: { include: { user: { select: { fullName: true } } } },
      user: { select: { fullName: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 40
  });

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#6e7778]">Parent Hub</p>
        <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.03em] text-[#004649]">Notifications</h2>
        <p className="mt-2 text-[#5c6668]">Unread alerts: {unreadCount}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <p className="text-sm text-[#6e7778]">Total Alerts</p>
          <p className="mt-2 text-3xl font-black text-[#004649]">{notifications.length}</p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <p className="text-sm text-[#6e7778]">Unread</p>
          <p className="mt-2 text-3xl font-black text-[#895100]">{unreadCount}</p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <p className="text-sm text-[#6e7778]">Read</p>
          <p className="mt-2 text-3xl font-black text-[#1b5e62]">{notifications.length - unreadCount}</p>
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <h3 className="font-headline text-2xl font-bold text-[#004649]">Recent Alerts</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f4f3] text-[#5c6668]">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Audience</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((notification) => (
                <tr key={notification.id} className="border-b border-[#eef1f1]">
                  <td className="px-3 py-3">{notification.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-[#1a1c1c]">{notification.title}</p>
                    <p className="text-xs text-[#5c6668]">{notification.body}</p>
                  </td>
                  <td className="px-3 py-3">{notification.student?.user.fullName ?? notification.user.fullName}</td>
                  <td className="px-3 py-3">{notification.type}</td>
                  <td className="px-3 py-3 font-semibold text-[#004649]">{notification.isRead ? 'READ' : 'UNREAD'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {notifications.length === 0 ? <p className="mt-4 text-sm text-[#5c6668]">No notifications available yet.</p> : null}
      </section>
    </div>
  );
}
