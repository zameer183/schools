import { NotificationType, UserRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
const ALLOWED_TYPES: NotificationType[] = ['SYSTEM', 'ACADEMIC', 'FINANCIAL', 'ATTENDANCE', 'MESSAGE'];

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
  revalidatePath('/admin/notifications');
}

export default async function AdminNotificationsPage() {
  const [total, unread, byType, recent] = await Promise.all([
    prisma.notification.count(),
    prisma.notification.count({ where: { isRead: false } }),
    prisma.notification.groupBy({ by: ['type'], _count: { _all: true } }),
    prisma.notification.findMany({
      include: { user: { select: { fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
  ]);

  const topType = byType.sort((a, b) => b._count._all - a._count._all)[0]?.type ?? 'N/A';

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Notifications</h2>
        <p className="mt-1 text-sm text-[#6f7979]">Broadcast institutional notices and monitor delivery status.</p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-[#f5f7f5] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Total</p>
            <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{total}</p>
          </div>
          <div className="rounded-lg bg-[#f5f7f5] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Unread</p>
            <p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{unread}</p>
          </div>
          <div className="rounded-lg bg-[#f5f7f5] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Top Type</p>
            <p className="mt-2 text-2xl font-bold text-[#1a1c1c]">{topType}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h3 className="font-semibold text-[#1a1c1c] mb-4">Create Broadcast</h3>
        <form action={broadcastNotification} className="grid gap-3 sm:grid-cols-2">
          <input
            name="title"
            required
            placeholder="Notification title"
            className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649]"
          />
          <select name="type" className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649]">
            {ALLOWED_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select name="targetRole" className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649]">
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="TEACHER">Teacher</option>
            <option value="STUDENT">Student</option>
            <option value="PARENT">Parent</option>
          </select>
          <button className="h-10 rounded-lg bg-[#004649] px-4 text-sm font-semibold text-white hover:bg-[#005a5e]">
            Send Broadcast
          </button>
          <textarea
            name="body"
            required
            placeholder="Write message..."
            className="sm:col-span-2 min-h-24 rounded-lg border border-[#d4dee7] p-3 text-sm outline-none focus:border-[#004649]"
          />
        </form>
      </div>

      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h3 className="font-semibold text-[#1a1c1c] mb-4">Recent Notifications</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8e8]">
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Title</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Target</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Type</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Status</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8e8]">
              {recent.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 font-medium text-[#1a1c1c]">{item.title}</td>
                  <td className="py-3 text-[#6f7979]">{item.user.fullName} ({item.user.role})</td>
                  <td className="py-3 text-[#6f7979]">{item.type}</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.isRead ? 'bg-[#f5f7f5] text-[#6f7979]' : 'bg-[#e8f5e9] text-[#004649]'}`}>
                      {item.isRead ? 'Read' : 'Unread'}
                    </span>
                  </td>
                  <td className="py-3 text-[#6f7979]">{item.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recent.length === 0 ? <p className="mt-4 text-sm text-[#6f7979]">No notifications yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
