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
    <div className="space-y-6">
      <section className="rounded-[1.2rem] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#6e7778]">Notifications</p>
        <h2 className="font-headline mt-1 text-4xl font-extrabold tracking-[-0.03em] text-[#124346] md:text-5xl">Communications Hub</h2>
        <p className="mt-2 text-[#596364]">Broadcast institutional notices and monitor delivery status.</p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-[#f3f4f3] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">Total Notifications</p><p className="font-headline mt-2 text-3xl font-extrabold text-[#124346]">{total}</p></div>
          <div className="rounded-xl bg-[#f3f4f3] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">Unread</p><p className="font-headline mt-2 text-3xl font-extrabold text-[#895100]">{unread}</p></div>
          <div className="rounded-xl bg-[#f3f4f3] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">Top Type</p><p className="font-headline mt-2 text-3xl font-extrabold text-[#124346]">{topType}</p></div>
        </div>
      </section>

      <section className="rounded-[1.2rem] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
        <h3 className="font-headline text-2xl font-bold tracking-[-0.02em] text-[#124346]">Create Broadcast</h3>
        <form action={broadcastNotification} className="mt-4 grid gap-4 md:grid-cols-2">
          <input name="title" required placeholder="Notification title" className="h-11 rounded-xl border border-[#c0c8c9] px-3" />
          <select name="type" className="h-11 rounded-xl border border-[#c0c8c9] px-3">{ALLOWED_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <select name="targetRole" className="h-11 rounded-xl border border-[#c0c8c9] px-3"><option value="ALL">All Roles</option><option value="ADMIN">Admin</option><option value="TEACHER">Teacher</option><option value="STUDENT">Student</option><option value="PARENT">Parent</option></select>
          <button className="h-11 rounded-xl bg-[#124346] px-4 font-semibold text-white">Send Broadcast</button>
          <textarea name="body" required placeholder="Write message..." className="md:col-span-2 min-h-28 rounded-xl border border-[#c0c8c9] p-3" />
        </form>
      </section>

      <section className="rounded-[1.2rem] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
        <h3 className="font-headline text-2xl font-bold tracking-[-0.02em] text-[#124346]">Recent Notifications</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f4f3] text-[#596364]"><tr><th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Title</th><th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Target</th><th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Type</th><th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Status</th><th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Date</th></tr></thead>
            <tbody>
              {recent.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-semibold text-[#1a1c1c]">{item.title}</td>
                  <td className="px-3 py-3">{item.user.fullName} ({item.user.role})</td>
                  <td className="px-3 py-3">{item.type}</td>
                  <td className="px-3 py-3">{item.isRead ? 'Read' : 'Unread'}</td>
                  <td className="px-3 py-3">{item.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recent.length === 0 ? <p className="mt-4 text-sm text-[#596364]">No notifications yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
