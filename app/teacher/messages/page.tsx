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
  const recipientIds = formData
    .getAll('recipientIds')
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!subject || !body || recipientIds.length === 0) return;

  await prisma.message.create({
    data: {
      senderId: session.id,
      subject,
      body,
      recipients: {
        createMany: {
          data: recipientIds.map((userId) => ({ userId }))
        }
      }
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
            include: {
              students: {
                include: { user: true },
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        }
      }
    }
  });

  const classStudents = teacher
    ? teacher.classAssignments.flatMap((item) =>
        item.class.students.map((student) => ({
          userId: student.userId,
          fullName: student.user.fullName,
          className: `${item.class.name} - ${item.class.section}`
        }))
      )
    : [];

  const uniqueRecipients = Array.from(new Map(classStudents.map((s) => [s.userId, s])).values());

  const inbox = await prisma.messageRecipient.findMany({
    where: { userId: session.id },
    include: {
      message: {
        include: {
          sender: { select: { fullName: true, role: true } }
        }
      }
    },
    orderBy: { message: { createdAt: 'desc' } },
    take: 20
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
        <h2 className="text-2xl font-bold text-[#1a1c1c]">Messages</h2>
        <p className="mt-2 text-[#5c6668]">Send updates to your class students and review incoming messages.</p>

        <form action={sendMessageAction} className="mt-6 grid gap-4">
          <input
            name="subject"
            required
            className="h-11 rounded-xl border border-[#c0c8c9] bg-[#f9fafa] px-3 text-sm text-[#1a1c1c] placeholder:text-[#6e7778] focus:border-[#004649] focus:outline-none"
            placeholder="Message subject"
          />
          <textarea
            name="body"
            required
            className="min-h-28 rounded-xl border border-[#c0c8c9] bg-[#f9fafa] p-3 text-sm text-[#1a1c1c] placeholder:text-[#6e7778] focus:border-[#004649] focus:outline-none"
            placeholder="Write your message"
          />
          <div className="rounded-2xl border border-[#d4dee7] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">Recipients — Your Students</p>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {uniqueRecipients.length === 0 ? (
                <p className="text-sm text-[#5c6668]">No students found in your assigned classes.</p>
              ) : (
                uniqueRecipients.map((recipient) => (
                  <label key={recipient.userId} className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#d4dee7] px-3 py-2.5 text-sm hover:bg-[#f3f4f3]">
                    <input type="checkbox" name="recipientIds" value={recipient.userId} className="accent-[#004649]" />
                    <span className="font-medium text-[#1a1c1c]">{recipient.fullName}</span>
                    <span className="text-[#6e7778]">({recipient.className})</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div>
            <button className="h-11 rounded-xl bg-[#004649] px-6 font-semibold text-white hover:bg-[#005a5e]">Send Message</button>
          </div>
        </form>
      </section>

      <section className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
        <h3 className="font-semibold text-[#1a1c1c]">Inbox</h3>
        <div className="mt-5 space-y-3">
          {inbox.length === 0 ? (
            <div className="rounded-2xl bg-[#f3f4f3] p-5 text-sm text-[#596364]">No messages received yet.</div>
          ) : (
            inbox.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[#d4dee7] p-5">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-semibold text-[#1a1c1c]">{item.message.subject}</h4>
                  <span className="shrink-0 text-xs text-[#6e7778]">{item.message.createdAt.toISOString().slice(0, 10)}</span>
                </div>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6e7778]">
                  From: {item.message.sender.fullName} · {item.message.sender.role}
                </p>
                <p className="mt-2 text-sm text-[#596364]">{item.message.body}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}