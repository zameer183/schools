import { Wallet, GraduationCap, Mail, CheckCircle2, Settings } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const TYPE_META = {
  SYSTEM:     { icon: Settings,       bg: 'bg-[#6B7280]/20',  fg: 'text-[#6B7280]', accent: false },
  ACADEMIC:   { icon: GraduationCap,  bg: 'bg-[#1B4D4B]/10',  fg: 'text-[#1B4D4B]', accent: false },
  FINANCIAL:  { icon: Wallet,         bg: 'bg-[#E68A00]/20',  fg: 'text-[#854F0B]', accent: true  },
  ATTENDANCE: { icon: CheckCircle2,   bg: 'bg-[#1B4D4B]/10',  fg: 'text-[#1B4D4B]', accent: false },
  MESSAGE:    { icon: Mail,           bg: 'bg-[#653B28]/15',  fg: 'text-[#653B28]', accent: false }
} as const;

export default async function MobileAdminNotificationsPage() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      user: { select: { fullName: true, role: true, email: true } }
    }
  });

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between px-4 pt-5 pb-3">
        <div>
          <h1 className="text-lg font-semibold text-[#111]">Notifications</h1>
          <p className="text-[10px] text-[#6B7280]">{unread} unread · {notifications.length} total</p>
        </div>
        <button className="text-[10px] font-medium text-[#1B4D4B]">Mark all read</button>
      </header>

      <div className="flex gap-1.5 overflow-x-auto px-4 pb-3">
        <span className="rounded-full bg-[#1B4D4B] px-3 py-1.5 text-[10px] font-medium text-white">All</span>
        <span className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-[10px] text-[#6B7280]">Academic</span>
        <span className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-[10px] text-[#6B7280]">Financial</span>
        <span className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-[10px] text-[#6B7280]">Message</span>
        <span className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-[10px] text-[#6B7280]">System</span>
      </div>

      <ul className="flex flex-col gap-2 px-4 pb-4">
        {notifications.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[#E5E7EB] py-10 text-center text-xs text-[#6B7280]">
            No notifications yet
          </li>
        ) : (
          notifications.map((n) => {
            const meta = TYPE_META[n.type as keyof typeof TYPE_META] ?? TYPE_META.SYSTEM;
            const Icon = meta.icon;
            const ago = relativeTime(n.createdAt);

            return (
              <li
                key={n.id}
                className={
                  meta.accent
                    ? 'flex gap-3 rounded-r-xl border border-[#E5E7EB] border-l-[3px] border-l-[#E68A00] bg-white p-3'
                    : 'flex gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3'
                }
              >
                <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>
                  <Icon className={`h-4 w-4 ${meta.fg}`} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#111]">{n.title}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[#6B7280]">{n.body}</p>
                  <p className="mt-1 text-[9px] text-[#6B7280]">
                    {n.type} · for {n.user.email} · {ago}
                  </p>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

function relativeTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
