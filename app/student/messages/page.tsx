import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StudentMessagesChatClient, type StudentInboxItem, type StudentOutgoingMap } from './student-messages-chat-client';

export const dynamic = 'force-dynamic';

function toIsoString(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

const getCachedStudentMessagesData = unstable_cache(
  async (userId: string) => {
    const [inbox, sent] = await Promise.all([
      prisma.messageRecipient.findMany({
        where: { userId },
        include: { message: { include: { sender: { select: { id: true, fullName: true, role: true } } } } },
        orderBy: { message: { createdAt: 'desc' } },
        take: 100
      }),
      prisma.message.findMany({
        where: { senderId: userId },
        include: {
          recipients: {
            include: {
              user: {
                select: { id: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      })
    ]);
    return { inbox, sent };
  },
  ['student-messages-page-data'],
  { revalidate: 30 }
);

export default async function StudentMessagesPage() {
  const session = await requireAuth([UserRole.STUDENT]);
  const { inbox, sent } = await getCachedStudentMessagesData(session.id);

  const serializedInbox: StudentInboxItem[] = inbox.map((item) => ({
    id: item.id,
    isRead: item.isRead,
    readAt: toIsoString(item.readAt),
    message: {
      id: item.message.id,
      subject: item.message.subject,
      body: item.message.body,
      createdAt: toIsoString(item.message.createdAt) ?? new Date().toISOString(),
      sender: {
        id: item.message.sender.id,
        fullName: item.message.sender.fullName,
        role: item.message.sender.role
      }
    }
  }));

  const initialOutgoing: StudentOutgoingMap = {};
  for (const item of sent) {
    const createdAt = toIsoString(item.createdAt);
    if (!createdAt) continue;
    for (const recipient of item.recipients) {
      const userId = recipient.user.id;
      if (!initialOutgoing[userId]) {
        initialOutgoing[userId] = [];
      }
      initialOutgoing[userId].push({
        id: item.id,
        body: item.body,
        subject: item.subject,
        createdAt,
        direction: 'out'
      });
    }
  }

  return <StudentMessagesChatClient initialInbox={serializedInbox} initialOutgoing={initialOutgoing} />;
}
