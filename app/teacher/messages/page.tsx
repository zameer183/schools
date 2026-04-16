import { revalidatePath } from 'next/cache';
import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function sendMessageAction(formData: FormData) {
  'use server';
  const session = await requireAuth([UserRole.TEACHER, UserRole.ADMIN]);
  const subject = String(formData.get('subject') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const recipientIds = formData.getAll('recipientIds').map((v) => String(v).trim()).filter(Boolean);
  if (!subject || !body || recipientIds.length === 0) return;
  await prisma.message.create({
    data: {
      senderId: session.id,
      subject,
      body,
      recipients: { createMany: { data: recipientIds.map((userId) => ({ userId })) } }
    }
  });
  revalidatePath('/teacher/messages');
}

export default async function TeacherMessagesPage() {
  const session = await requireAuth([UserRole.TEACHER, UserRole.ADMIN]);

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.id },
    include: {
      classAssignments: {
        include: {
          class: {
            include: { students: { include: { user: true }, orderBy: { createdAt: 'desc' } } }
          }
        }
      }
    }
  });

  const classStudents = teacher
    ? teacher.classAssignments.flatMap((item) =>
        item.class.students.map((s) => ({
          userId: s.userId,
          fullName: s.user.fullName,
          className: `${item.class.name} - ${item.class.section}`
        }))
      )
    : [];
  const uniqueRecipients = Array.from(new Map(classStudents.map((s) => [s.userId, s])).values());

  const inbox = await prisma.messageRecipient.findMany({
    where: { userId: session.id },
    include: { message: { include: { sender: { select: { fullName: true, role: true } } } } },
    orderBy: { message: { createdAt: 'desc' } },
    take: 20
  });

  const sent = await prisma.message.findMany({
    where: { senderId: session.id },
    include: { recipients: { include: { user: { select: { fullName: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  const allMessages = [
    ...inbox.map((item) => ({
      id: item.id,
      subject: item.message.subject,
      body: item.message.body,
      senderName: item.message.sender.fullName,
      senderRole: item.message.sender.role,
      createdAt: item.message.createdAt,
      isRead: item.isRead,
      direction: 'received' as const
    })),
    ...sent.map((msg) => ({
      id: msg.id,
      subject: msg.subject,
      body: msg.body,
      senderName: 'You',
      senderRole: session.role as string,
      createdAt: msg.createdAt,
      isRead: true,
      direction: 'sent' as const
    }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  function initials(name: string) {
    return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  }

  function timeAgo(date: Date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (diff < 172800000) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Communications Hub</h2>
        <p className="mt-1 text-sm text-[#6f7979]">Stay updated with your academic circle.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl bg-white border border-[#e2e8e8] p-4">
            <div className="flex items-center gap-2 rounded-xl bg-[#f5f7f5] px-3 py-2.5">
              <svg className="h-4 w-4 text-[#6f7979] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input placeholder="Search conversations..." className="bg-transparent text-sm text-[#1a1c1c] placeholder:text-[#6f7979] outline-none flex-1" />
            </div>

            {uniqueRecipients.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-3">Your Students</p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {uniqueRecipients.slice(0, 5).map((r) => (
                    <div key={r.userId} className="flex flex-col items-center gap-1 shrink-0">
                      <div className="w-12 h-12 rounded-full bg-[#004649]/10 flex items-center justify-center text-sm font-bold text-[#004649] border-2 border-white ring-2 ring-[#e2e8e8]">
                        {initials(r.fullName)}
                      </div>
                      <p className="text-[9px] text-[#6f7979] text-center max-w-[48px] truncate">{r.fullName.split(' ')[0]}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">Categories</p>
              <div className="space-y-1">
                {[
                  { label: 'All Messages', count: allMessages.length, active: true },
                  { label: 'Received', count: inbox.length, active: false },
                  { label: 'Sent', count: sent.length, active: false },
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

          <div className="rounded-xl bg-white border border-[#e2e8e8] overflow-hidden">
            {allMessages.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-[#f5f7f5] flex items-center justify-center mx-auto">
                  <svg className="h-6 w-6 text-[#6f7979]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                </div>
                <p className="font-semibold text-[#1a1c1c]">A Quiet Space</p>
                <p className="text-xs text-[#6f7979]">No messages yet. Send your first message to a student.</p>
                <p className="text-[9px] uppercase tracking-widest text-[#865300] font-bold bg-[#fff3e0] px-2 py-1 rounded-full inline-block">Communication Portal</p>
              </div>
            ) : (
              <div className="divide-y divide-[#e2e8e8]">
                {allMessages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 p-4 hover:bg-[#f5f7f5] cursor-pointer ${!msg.isRead && msg.direction === 'received' ? 'border-l-4 border-l-[#004649]' : ''}`}>
                    <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${msg.direction === 'sent' ? 'bg-[#e8f5e9] text-[#004649]' : 'bg-[#f5f7f5] text-[#1a1c1c]'}`}>
                      {initials(msg.senderName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#1a1c1c] truncate">{msg.senderName}</p>
                        <p className="text-[10px] text-[#6f7979] shrink-0">{timeAgo(msg.createdAt)}</p>
                      </div>
                      <p className="text-xs font-medium text-[#1a1c1c] truncate">{msg.subject}</p>
                      <p className="text-xs text-[#6f7979] truncate">{msg.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl bg-white border border-[#e2e8e8] p-6">
          <h3 className="font-bold text-[#1a1c1c] mb-1">New Message</h3>
          <p className="text-sm text-[#6f7979] mb-5">Send an update to your students.</p>
          <form action={sendMessageAction} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">Subject</label>
              <input
                name="subject"
                required
                placeholder="e.g. Assignment Reminder"
                className="h-11 w-full rounded-xl bg-[#f5f7f5] px-4 text-sm text-[#1a1c1c] placeholder:text-[#6f7979]/60 outline-none ring-[#004649]/20 transition focus:ring-2"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">Message</label>
              <textarea
                name="body"
                required
                rows={5}
                placeholder="Write your message here..."
                className="w-full rounded-xl bg-[#f5f7f5] px-4 py-3 text-sm text-[#1a1c1c] placeholder:text-[#6f7979]/60 outline-none ring-[#004649]/20 transition focus:ring-2 resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">Recipients — Your Students</label>
              {uniqueRecipients.length === 0 ? (
                <p className="text-sm text-[#6f7979]">No students found in your assigned classes.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {uniqueRecipients.map((r) => (
                    <label key={r.userId} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#e2e8e8] px-3 py-2.5 text-sm hover:bg-[#f5f7f5]">
                      <input type="checkbox" name="recipientIds" value={r.userId} className="accent-[#004649]" />
                      <div className="w-7 h-7 rounded-full bg-[#004649]/10 flex items-center justify-center text-xs font-bold text-[#004649]">
                        {initials(r.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[#1a1c1c] truncate">{r.fullName}</p>
                        <p className="text-[10px] text-[#6f7979] truncate">{r.className}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button className="flex items-center gap-2 rounded-xl bg-[#004649] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
