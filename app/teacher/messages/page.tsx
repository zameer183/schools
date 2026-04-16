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
      <section className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h2 className="font-headline text-4xl font-extrabold tracking-tight text-slate-900">Messages</h2>
        <p className="mt-2 text-slate-600">Send updates to your class students and review incoming messages.</p>

        <form action={sendMessageAction} className="mt-6 grid gap-4">
          <input
            name="subject"
            required
            className="h-11 rounded-xl border border-slate-300 px-3"
            placeholder="Message subject"
          />
          <textarea
            name="body"
            required
            className="min-h-28 rounded-xl border border-slate-300 p-3"
            placeholder="Write your message"
          />
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-700">Recipients (your students)</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {uniqueRecipients.length === 0 ? (
                <p className="text-sm text-slate-500">No students found in your assigned classes.</p>
              ) : (
                uniqueRecipients.map((recipient) => (
                  <label key={recipient.userId} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <input type="checkbox" name="recipientIds" value={recipient.userId} />
                    <span>{recipient.fullName}</span>
                    <span className="text-slate-500">({recipient.className})</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div>
            <button className="h-11 rounded-xl bg-[#0f5954] px-5 font-semibold text-white">Send Message</button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h3 className="font-headline text-2xl font-bold text-slate-900">Inbox</h3>
        <div className="mt-4 space-y-3">
          {inbox.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No messages received yet.</p>
          ) : (
            inbox.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-slate-900">{item.message.subject}</h4>
                  <span className="text-xs text-slate-500">{item.message.createdAt.toISOString().slice(0, 10)}</span>
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">
                  From: {item.message.sender.fullName} ({item.message.sender.role})
                </p>
                <p className="mt-2 text-sm text-slate-700">{item.message.body}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}