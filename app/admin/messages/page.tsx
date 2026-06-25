import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminMessagingWorkspace from './admin-messaging-workspace';

export const dynamic = 'force-dynamic';

type AdminMessagesPageProps = {
  searchParams?: Promise<{
    recipientId?: string;
  }>;
};

function toIsoString(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

const getCachedAdminMessagesData = unstable_cache(
  async (userId: string) => {
    const [students, classes, sentMessages, receivedMessages] = await Promise.all([
      prisma.student.findMany({
        include: { user: { select: { id: true, fullName: true } }, class: { select: { name: true, section: true } } },
        orderBy: { admissionNo: 'asc' },
        take: 1000
      }),
      prisma.class.findMany({ select: { id: true, name: true, section: true }, orderBy: [{ name: 'asc' }, { section: 'asc' }] }),
      prisma.message.findMany({
        include: {
          recipients: { include: { user: { select: { id: true, fullName: true, role: true } } } }
        },
        where: { senderId: userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.messageRecipient.findMany({
        where: { userId },
        include: {
          message: {
            include: {
              sender: { select: { id: true, fullName: true, role: true } }
            }
          }
        },
        orderBy: { message: { createdAt: 'desc' } },
        take: 80
      })
    ]);

    return { students, classes, sentMessages, receivedMessages };
  },
  ['admin-messages-page-data-v2'],
  { revalidate: 20 }
);

export default async function AdminMessagesPage({ searchParams }: AdminMessagesPageProps) {
  const session = await requireAuth([UserRole.ADMIN]);
  const params = (await searchParams) ?? {};
  const presetRecipientId = params.recipientId?.trim() ?? '';
  const { students, classes, sentMessages, receivedMessages } = await getCachedAdminMessagesData(session.id);

  const serializedSent = sentMessages.map((message) => ({
    id: message.id,
    subject: message.subject,
    body: message.body,
    createdAt: toIsoString(message.createdAt) ?? new Date().toISOString(),
    recipients: message.recipients.map((recipient) => ({
      isRead: recipient.isRead,
      user: {
        id: recipient.user.id,
        fullName: recipient.user.fullName,
        role: recipient.user.role
      }
    }))
  }));

  const serializedReceived = receivedMessages.map((row) => ({
    id: row.id,
    isRead: row.isRead,
    readAt: toIsoString(row.readAt),
    message: {
      id: row.message.id,
      subject: row.message.subject,
      body: row.message.body,
      createdAt: toIsoString(row.message.createdAt) ?? new Date().toISOString(),
      sender: {
        id: row.message.sender.id,
        fullName: row.message.sender.fullName,
        role: row.message.sender.role
      }
    }
  }));

  return (
    <AdminMessagingWorkspace
      students={students}
      classes={classes}
      receivedMessages={serializedReceived}
      sentMessages={serializedSent}
      presetRecipientId={presetRecipientId}
    />
  );
}
