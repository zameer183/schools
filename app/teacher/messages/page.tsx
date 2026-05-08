import { unstable_cache } from 'next/cache';
import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTeacherAccessMapByUserId } from '@/lib/teacher-access';
import { PageHeader } from '@/components/ui';
import { TeacherMessagesClient, type SerializedMessage, type RecipientOption } from './teacher-messages-client';

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
  const uniqueRecipients: RecipientOption[] = Array.from(
    new Map(classStudents.map((s) => [s.userId, s])).values()
  );

  const toIso = (value: Date | string) =>
    value instanceof Date ? value.toISOString() : new Date(value).toISOString();

  const serializedMessages: SerializedMessage[] = [
    ...inbox.map((item) => ({
      id: item.id,
      subject: item.message.subject,
      body: item.message.body,
      senderName: item.message.sender.fullName,
      senderRole: item.message.sender.role as string,
      createdAt: toIso(item.message.createdAt),
      isRead: item.isRead,
      direction: 'received' as const
    })),
    ...sent.map((msg) => ({
      id: msg.id,
      subject: msg.subject,
      body: msg.body,
      senderName: 'You',
      senderRole: session.role as string,
      createdAt: toIso(msg.createdAt),
      isRead: true,
      direction: 'sent' as const,
      recipientNames: msg.recipients.map((r) => r.user.fullName)
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communications Hub"
        subtitle="Stay updated with your academic circle."
      />
      <TeacherMessagesClient messages={serializedMessages} recipients={uniqueRecipients} />
    </div>
  );
}
