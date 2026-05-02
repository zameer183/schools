import { revalidatePath, unstable_cache } from 'next/cache';
import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTeacherAccessMapByUserId } from '@/lib/teacher-access';
import { PageHeader, Card } from '@/components/ui';
import { Mail, Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

const getCachedTeacherMessagesData = unstable_cache(
  async (userId: string) => {
    const [access, teacher, inbox, sent] = await Promise.all([
      getTeacherAccessMapByUserId(userId),
      prisma.teacher.findUnique({
        where: { userId },
        include: {
          classAssignments: {
            include: {
              class: {
                include: { students: { include: { user: true }, orderBy: { createdAt: 'desc' } } }
              }
            }
          }
        }
      }),
      prisma.messageRecipient.findMany({
        where: { userId },
        include: { message: { include: { sender: { select: { fullName: true, role: true } } } } },
        orderBy: { message: { createdAt: 'desc' } },
        take: 20
      }),
      prisma.message.findMany({
        where: { senderId: userId },
        include: { recipients: { include: { user: { select: { fullName: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    return { access, teacher, inbox, sent };
  },
  ['teacher-messages-page-data'],
  { revalidate: 30 }
);

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
  const { access, teacher, inbox, sent } = await getCachedTeacherMessagesData(session.id);
  if (session.role === 'TEACHER' && access && !access.MESSAGES) {
    return (
      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,70,73,0.06)] p-8">
        <h2 className="font-headline text-3xl font-bold text-[#1a1c1c]">Messages Access Disabled</h2>
        <p className="mt-2 text-sm text-[#6f7979]">Admin has disabled your in-app messages module.</p>
      </div>
    );
  }
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

  const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));

  const allMessages = [
    ...inbox.map((item) => ({
      id: item.id,
      subject: item.message.subject,
      body: item.message.body,
      senderName: item.message.sender.fullName,
      senderRole: item.message.sender.role,
      createdAt: toDate(item.message.createdAt),
      isRead: item.isRead,
      direction: 'received' as const
    })),
    ...sent.map((msg) => ({
      id: msg.id,
      subject: msg.subject,
      body: msg.body,
      senderName: 'You',
      senderRole: session.role as string,
      createdAt: toDate(msg.createdAt),
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
    <div className="space-y-6">
      <PageHeader
        title="Communications Hub"
        subtitle="Stay updated with your academic circle."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <div className="flex items-center gap-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-2.5">
              <Search className="h-4 w-4 text-[#6B7280] shrink-0" />
              <input placeholder="Search conversations..." className="bg-transparent text-sm text-[#1F2937] placeholder:text-[#6B7280] outline-none flex-1" />
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
                  <div key={cat.label} className={`flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer ${cat.active ? 'bg-[#f0f2f5]' : 'hover:bg-[#f3f4f5]'}`}>
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
          </Card>

          <Card>
            {allMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg className="h-10 w-10 text-[#E5E7EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                <p className="mt-2 text-sm font-semibold text-[#1F2937]">A Quiet Space</p>
                <p className="mt-1 text-xs text-[#6B7280]">No messages yet. Send your first message to a student.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E7EB]">
                {allMessages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 p-3 sm:p-4 hover:bg-[#F9FAFB] cursor-pointer transition-colors ${!msg.isRead && msg.direction === 'received' ? 'border-l-4 border-l-[#004649]' : ''}`}>
                    <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${msg.direction === 'sent' ? 'bg-[#E0EBEC] text-[#1F5A5C]' : 'bg-[#F3F4F5] text-[#1F2937]'}`}>
                      {initials(msg.senderName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#1F2937] truncate">{msg.senderName}</p>
                        <p className="text-[10px] text-[#6B7280] shrink-0">{timeAgo(msg.createdAt)}</p>
                      </div>
                      <p className="text-xs font-medium text-[#1F2937] truncate">{msg.subject}</p>
                      <p className="text-xs text-[#6B7280] truncate">{msg.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5E6CC]">
              <Mail className="h-4 w-4 text-[#D69E3F]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F2937]">New Message</h3>
          </div>
          <p className="text-sm text-[#6B7280] mb-5">Send an update to your students.</p>
          <form action={sendMessageAction} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">Subject</label>
              <input
                name="subject"
                required
                placeholder="e.g. Assignment Reminder"
                className="h-11 w-full rounded-xl bg-[#edeeef] border-none px-4 text-sm text-[#1a1c1c] placeholder:text-[#6f7979]/60 outline-none focus:ring-2 focus:ring-[#004649]/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">Message</label>
              <textarea
                name="body"
                required
                rows={5}
                placeholder="Write your message here..."
                className="w-full rounded-xl bg-[#edeeef] border-none px-4 py-3 text-sm text-[#1a1c1c] placeholder:text-[#6f7979]/60 outline-none focus:ring-2 focus:ring-[#004649]/20 resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-2">Recipients - Your Students</label>
              {uniqueRecipients.length === 0 ? (
                <p className="text-sm text-[#6f7979]">No students found in your assigned classes.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto sm:grid-cols-2">
                  {uniqueRecipients.map((r) => (
                    <label key={r.userId} className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-[#f3f4f5] px-3 py-2.5 text-sm hover:bg-[#f3f4f5]">
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
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] shadow-[0_8px_20px_rgba(0,70,73,0.12)] active:scale-[0.98] transition-all px-6 py-2.5 text-sm font-bold text-white sm:w-auto">
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
