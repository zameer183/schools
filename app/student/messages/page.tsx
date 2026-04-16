import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function StudentMessagesPage() {
  const session = await requireAuth([UserRole.STUDENT]);

  const inbox = await prisma.messageRecipient.findMany({
    where: { userId: session.id },
    include: { message: { include: { sender: { select: { fullName: true, role: true } } } } },
    orderBy: { message: { createdAt: 'desc' } },
    take: 30
  });

  function initials(name: string) {
    return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  }

  function timeAgo(date: Date) {
    const diff = Date.now() - date.getTime();
    if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (diff < 172800000) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const unread = inbox.filter((m) => !m.isRead).length;
  const academic = inbox.filter((m) => m.message.sender.role === 'TEACHER').length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Communications Hub</h2>
        <p className="mt-1 text-sm text-[#6f7979]">Stay updated with your academic circle.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 rounded-xl bg-white border border-[#e2e8e8] p-4 space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-[#f5f7f5] px-3 py-2.5">
            <svg className="h-4 w-4 text-[#6f7979] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input placeholder="Search conversations..." className="bg-transparent text-sm text-[#1a1c1c] placeholder:text-[#6f7979] outline-none flex-1" />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">Categories</p>
            <div className="space-y-1">
              {[
                { label: 'All Messages', count: inbox.length, active: true },
                { label: 'Academic', count: academic, active: false },
                { label: 'Finance', count: inbox.length - academic, active: false },
              ].map((cat) => (
                <div key={cat.label} className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer ${cat.active ? 'bg-[#f0f2f0]' : 'hover:bg-[#f5f7f5]'}`}>
                  <span className="text-sm font-medium text-[#1a1c1c]">{cat.label}</span>
                  {cat.count > 0 && (
                    <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${cat.active ? 'bg-[#004649] text-white' : 'text-[#6f7979]'}`}>
                      {cat.count}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl bg-white border border-[#e2e8e8] overflow-hidden">
          {inbox.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#f5f7f5] flex items-center justify-center mx-auto">
                <svg className="h-7 w-7 text-[#6f7979]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#865300] bg-[#fff3e0] px-3 py-1 rounded-full">Communication Portal</span>
              </div>
              <h3 className="text-2xl font-bold text-[#1a1c1c]">No messages yet.</h3>
              <p className="text-sm text-[#6f7979] max-w-xs mx-auto leading-relaxed">
                Start a conversation with faculty or students to begin your scholarly collaboration. Your inbox is currently clear and ready for meaningful connection.
              </p>
              <div className="pt-2 space-y-2">
                <button className="flex items-center justify-center gap-2 w-full max-w-xs mx-auto rounded-xl bg-[#004649] py-3 text-sm font-bold text-white hover:opacity-90 transition">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                  </svg>
                  New Conversation
                </button>
                <button className="flex items-center justify-center gap-2 w-full max-w-xs mx-auto rounded-xl border border-[#e2e8e8] py-3 text-sm font-semibold text-[#1a1c1c] hover:bg-[#f5f7f5] transition">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                  </svg>
                  Directory
                </button>
              </div>
              <div className="mt-4 rounded-xl bg-[#f5f7f5] p-4 text-left max-w-xs mx-auto">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#865300] mb-1">Pro Tip</p>
                <p className="text-xs text-[#6f7979] leading-relaxed">You can filter your upcoming messages by faculty, study groups, or administrative updates.</p>
              </div>
            </div>
          ) : (
            <div>
              <div className="px-5 py-4 border-b border-[#e2e8e8]">
                <h3 className="font-semibold text-[#1a1c1c]">Inbox</h3>
                {unread > 0 && <p className="text-xs text-[#6f7979]">{unread} unread message{unread > 1 ? 's' : ''}</p>}
              </div>
              <div className="divide-y divide-[#e2e8e8]">
                {inbox.map((item) => (
                  <div key={item.id} className={`flex gap-3 p-4 hover:bg-[#f5f7f5] cursor-pointer ${!item.isRead ? 'border-l-4 border-l-[#004649]' : ''}`}>
                    <div className="w-11 h-11 rounded-full bg-[#004649]/10 flex items-center justify-center text-sm font-bold text-[#004649] shrink-0">
                      {initials(item.message.sender.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#1a1c1c] truncate">{item.message.sender.fullName}</p>
                        <p className="text-[10px] text-[#6f7979] shrink-0">{timeAgo(item.message.createdAt)}</p>
                      </div>
                      <p className="text-xs font-medium text-[#1a1c1c] truncate">{item.message.subject}</p>
                      <p className="text-xs text-[#6f7979] truncate">{item.message.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
