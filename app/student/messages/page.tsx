import { type Prisma, UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StudentMessagesChatClient, type StudentInboxItem, type StudentOutgoingMap } from './student-messages-chat-client';
import { Card } from '@/components/ui';
import { WifiOff } from 'lucide-react';

export const dynamic = 'force-dynamic';

type InboxRow = Prisma.MessageRecipientGetPayload<{
  select: {
    id: true;
    isRead: true;
    readAt: true;
    message: {
      select: {
        id: true;
        subject: true;
        body: true;
        createdAt: true;
        sender: { select: { id: true; fullName: true; role: true } };
      };
    };
  };
}>;

type SentRow = Prisma.MessageGetPayload<{
  select: {
    id: true;
    body: true;
    subject: true;
    createdAt: true;
    recipients: { select: { userId: true } };
  };
}>;

type AvailableRecipient = { id: string; fullName: string; role: 'ADMIN' | 'TEACHER' };

type StudentMessagesPageData = {
  inbox: InboxRow[];
  sent: SentRow[];
  studentClassId: string | null;
  availableRecipients: AvailableRecipient[];
};

function DbOfflineBanner() {
  return (
    <Card className="p-8">
      <div className="flex flex-col items-center py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fef2f2]">
          <WifiOff className="h-7 w-7 text-[#ef4444]" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-[#1F2937]">Database Unreachable</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Unable to load student messages right now. Please refresh once the connection recovers.</p>
      </div>
    </Card>
  );
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function isDatabaseConnectionError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'PrismaClientInitializationError' ||
      error.message.includes("Can't reach database server") ||
      error.message.includes('Timed out fetching a new connection') ||
      error.message.includes('Connection terminated unexpectedly'))
  );
}

const getCachedAvailableRecipients = unstable_cache(
  async (studentClassId: string | null) => {
    if (!studentClassId) {
      const admins = await prisma.user.findMany({
        where: { role: UserRole.ADMIN, isActive: true },
        select: { id: true, fullName: true, role: true }
      });
      return admins.map((admin) => ({ id: admin.id, fullName: admin.fullName, role: 'ADMIN' as const }));
    }

    const [classData, admins] = await Promise.all([
      prisma.class.findUnique({
        where: { id: studentClassId },
        select: {
          subjects: {
            select: {
              teacher: {
                select: {
                  user: { select: { id: true, fullName: true, role: true, isActive: true } }
                }
              }
            }
          },
          teacherLinks: {
            select: {
              teacher: {
                select: {
                  user: { select: { id: true, fullName: true, role: true, isActive: true } }
                }
              }
            }
          }
        }
      }),
      prisma.user.findMany({
        where: { role: UserRole.ADMIN, isActive: true },
        select: { id: true, fullName: true, role: true }
      })
    ]);

    const teacherMap = new Map<string, { id: string; fullName: string; role: 'TEACHER' }>();
    if (classData) {
      for (const subject of classData.subjects) {
        const user = subject.teacher?.user;
        if (user?.isActive) teacherMap.set(user.id, { id: user.id, fullName: user.fullName, role: 'TEACHER' });
      }
      for (const link of classData.teacherLinks) {
        const user = link.teacher?.user;
        if (user?.isActive) teacherMap.set(user.id, { id: user.id, fullName: user.fullName, role: 'TEACHER' });
      }
    }

    return [
      ...teacherMap.values(),
      ...admins.map((admin) => ({ id: admin.id, fullName: admin.fullName, role: 'ADMIN' as const }))
    ];
  },
  ['student-messages-available-recipients'],
  { revalidate: 60 }
);

export default async function StudentMessagesPage() {
  const session = await requireAuth([UserRole.STUDENT]);

  let data: StudentMessagesPageData | null = null;
  try {
    const [inbox, sent, student] = await Promise.all([
      prisma.messageRecipient.findMany({
        where: { userId: session.id },
        select: {
          id: true,
          isRead: true,
          readAt: true,
          message: {
            select: {
              id: true,
              subject: true,
              body: true,
              createdAt: true,
              sender: { select: { id: true, fullName: true, role: true } }
            }
          }
        },
        orderBy: { message: { createdAt: 'desc' } },
        take: 10
      }),
      prisma.message.findMany({
        where: { senderId: session.id },
        select: {
          id: true,
          body: true,
          subject: true,
          createdAt: true,
          recipients: { select: { userId: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.student.findUnique({
        where: { userId: session.id },
        select: { classId: true }
      })
    ]);

    let availableRecipients: AvailableRecipient[] = [];
    try {
      availableRecipients = await getCachedAvailableRecipients(student?.classId ?? null);
    } catch (error) {
      if (!isDatabaseConnectionError(error)) throw error;
    }

    data = {
      inbox,
      sent,
      studentClassId: student?.classId ?? null,
      availableRecipients
    };
  } catch (error) {
    if (!isDatabaseConnectionError(error)) throw error;
  }

  if (!data) {
    return <DbOfflineBanner />;
  }

  const { inbox, sent, availableRecipients } = data;

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
      const userId = recipient.userId;
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

  return <StudentMessagesChatClient initialInbox={serializedInbox} initialOutgoing={initialOutgoing} availableTeachers={availableRecipients} />;
}
