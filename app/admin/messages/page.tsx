import { UserRole } from '@prisma/client';
import { revalidatePath, unstable_cache } from 'next/cache';
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
        orderBy: { user: { fullName: 'asc' } }
      }),
      prisma.class.findMany({ orderBy: [{ name: 'asc' }, { section: 'asc' }] }),
      prisma.message.findMany({
        include: {
          recipients: { include: { user: { select: { id: true, fullName: true, role: true } } } }
        },
        where: { senderId: userId },
        orderBy: { createdAt: 'desc' },
        take: 80
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
        take: 120
      })
    ]);

    return { students, classes, sentMessages, receivedMessages };
  },
  ['admin-messages-page-data-v2'],
  { revalidate: 20 }
);

async function sendAdminMessage(formData: FormData) {
  'use server';

  try {
    const session = await requireAuth([UserRole.ADMIN]);
    const subject = String(formData.get('subject') ?? '').trim();
    const body = String(formData.get('body') ?? '').trim();
    const targetModeRaw = String(formData.get('targetMode') ?? 'individual_student');
    const targetMode = targetModeRaw as 'individual_student' | 'individual_teacher' | 'class' | 'announcement';
    const classId = String(formData.get('classId') ?? '').trim();
    const studentRecipientId = String(formData.get('studentRecipientId') ?? '').trim();
    const teacherRecipientId = String(formData.get('teacherRecipientId') ?? '').trim();

    if (!subject || !body) return;

    let recipients: string[] = [];

    if (targetMode === 'individual_student') {
      if (!studentRecipientId) return;
      recipients = [studentRecipientId];
    } else if (targetMode === 'individual_teacher') {
      if (!teacherRecipientId) return;
      recipients = [teacherRecipientId];
    } else if (targetMode === 'class') {
      if (!classId) return;
      const classStudents = await prisma.student.findMany({ where: { classId }, select: { userId: true } });
      recipients = classStudents.map((item) => item.userId);
    } else if (targetMode === 'announcement') {
      const students = await prisma.user.findMany({
        where: { role: UserRole.STUDENT, isActive: true },
        select: { id: true }
      });
      recipients = students.map((item) => item.id);
    } else {
      return;
    }

    const uniqueRecipients = Array.from(new Set(recipients)).filter((id): id is string => Boolean(id));
    if (!uniqueRecipients.length) return;

    await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: {
          senderId: session.id,
          subject,
          body
        },
        select: { id: true }
      });

      await tx.messageRecipient.createMany({
        data: uniqueRecipients.map((userId) => ({ messageId: createdMessage.id, userId })),
        skipDuplicates: true
      });

      if (targetMode === 'announcement') {
        await tx.notification.createMany({
          data: uniqueRecipients.map((userId) => ({
            userId,
            title: subject,
            body,
            type: 'SYSTEM',
            isRead: false
          }))
        });
      }
    });
  } catch (error) {
    console.error('[admin/messages] sendAdminMessage failed', error);
  } finally {
    revalidatePath('/admin/messages');
  }
}

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
      composeAction={sendAdminMessage}
    />
  );
}
