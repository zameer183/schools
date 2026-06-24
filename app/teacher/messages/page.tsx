import { type Prisma, UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTeacherAccessMapByUserId } from '@/lib/teacher-access';
import { TeacherMessagesClient, type SerializedMessage, type RecipientOption } from './teacher-messages-client';

export const dynamic = 'force-dynamic';

type TeacherWithAssignments = Prisma.TeacherGetPayload<{
  include: {
    classAssignments: {
      include: {
        class: {
          include: { students: { include: { user: true } } };
        };
      };
    };
  };
}> | null;

type InboxRow = Prisma.MessageRecipientGetPayload<{
  include: { message: { include: { sender: { select: { id: true; fullName: true; role: true } } } } };
}>;

type SentRow = Prisma.MessageGetPayload<{
  include: { recipients: { include: { user: { select: { id: true; fullName: true } } } } };
}>;

export default async function TeacherMessagesPage() {
  const session = await requireAuth([UserRole.TEACHER, UserRole.ADMIN]);

  let access: Awaited<ReturnType<typeof getTeacherAccessMapByUserId>> | null = null;
  let teacher: TeacherWithAssignments = null;
  let inbox: InboxRow[] = [];
  let sent: SentRow[] = [];
  try {
    [access, teacher, inbox, sent] = await Promise.all([
      getTeacherAccessMapByUserId(session.id),
      prisma.teacher.findUnique({
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
      }),
      prisma.messageRecipient.findMany({
        where: { userId: session.id },
        include: { message: { include: { sender: { select: { id: true, fullName: true, role: true } } } } },
        orderBy: { message: { createdAt: 'desc' } },
        take: 20
      }),
      prisma.message.findMany({
        where: { senderId: session.id },
        include: { recipients: { include: { user: { select: { id: true, fullName: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ]);
  } catch {
    // Render empty messaging workspace instead of failing entire route.
  }

  if (session.role === 'TEACHER' && access && !access.MESSAGES) {
    return (
      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(43,103,110,0.06)] p-8">
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
  const uniqueRecipients: RecipientOption[] = Array.from(
    new Map(classStudents.map((s) => [s.userId, s])).values()
  );

  const toIso = (value: Date | string | null | undefined) => {
    if (!value) return new Date().toISOString();
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  };

  const receivedMessages: SerializedMessage[] = inbox
    .filter((item) => item.message?.sender?.id && item.message?.subject && item.message?.body)
    .map((item) => ({
      // Use actual message id so DELETE /api/messages?id=... removes recipient row correctly.
      id: item.message.id,
      subject: item.message.subject,
      body: item.message.body,
      senderId: item.message.sender.id,
      senderName: item.message.sender.fullName,
      senderRole: item.message.sender.role as string,
      createdAt: toIso(item.message.createdAt),
      isRead: item.isRead,
      direction: 'received' as const,
      recipients: undefined
    }));

  const sentMessages: SerializedMessage[] = sent
    .filter((msg) => msg.subject && msg.body)
    .map((msg) => ({
      id: msg.id,
      subject: msg.subject,
      body: msg.body,
      senderId: undefined,
      senderName: 'You',
      senderRole: session.role as string,
      createdAt: toIso(msg.createdAt),
      isRead: true,
      direction: 'sent' as const,
      recipients: msg.recipients
        .filter((r) => r.user?.id)
        .map((r) => ({ id: r.user.id, name: r.user.fullName }))
    }));

  const serializedMessages: SerializedMessage[] = [...receivedMessages, ...sentMessages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return <TeacherMessagesClient messages={serializedMessages} recipients={uniqueRecipients} />;
}
