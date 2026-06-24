import { type Prisma, UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { Card } from '@/components/ui';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTeacherAccessMapByUserId } from '@/lib/teacher-access';
import { TeacherMessagesClient, type RecipientOption, type SerializedMessage } from './teacher-messages-client';
import { WifiOff } from 'lucide-react';

export const dynamic = 'force-dynamic';

type InboxRow = Prisma.MessageRecipientGetPayload<{
  select: {
    id: true;
    isRead: true;
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
    subject: true;
    body: true;
    createdAt: true;
    recipients: { select: { userId: true, user: { select: { id: true; fullName: true } } } };
  };
}>;

type TeacherMessagesPageData = {
  inbox: InboxRow[];
  sent: SentRow[];
  recipients: RecipientOption[];
};

function isDatabaseConnectionError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'PrismaClientInitializationError' ||
      error.message.includes("Can't reach database server") ||
      error.message.includes('Timed out fetching a new connection') ||
      error.message.includes('Connection terminated unexpectedly'))
  );
}

function DbOfflineBanner() {
  return (
    <Card className="p-8">
      <div className="flex flex-col items-center py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fef2f2]">
          <WifiOff className="h-7 w-7 text-[#ef4444]" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-[#1F2937]">Database Unreachable</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Unable to load teacher messages right now. Please refresh once the connection recovers.</p>
      </div>
    </Card>
  );
}

const getCachedTeacherMessagesData = unstable_cache(
  async (userId: string) => {
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      select: {
        id: true,
        classAssignments: {
          select: {
            class: {
              select: {
                name: true,
                section: true,
                students: {
                  select: {
                    userId: true,
                    user: { select: { fullName: true } }
                  },
                  orderBy: { createdAt: 'desc' }
                }
              }
            }
          }
        }
      }
    });

    if (!teacher) {
      return null;
    }

    const [inbox, sent] = await prisma.$transaction([
      prisma.messageRecipient.findMany({
        where: { userId },
        select: {
          id: true,
          isRead: true,
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
        where: { senderId: userId },
        select: {
          id: true,
          subject: true,
          body: true,
          createdAt: true,
          recipients: {
            select: {
              userId: true,
              user: { select: { id: true, fullName: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    const recipientMap = new Map<string, RecipientOption>();
    for (const assignment of teacher.classAssignments) {
      const className = assignment.class ? `${assignment.class.name} - ${assignment.class.section}` : 'Student';
      for (const student of assignment.class?.students ?? []) {
        if (!student.userId) continue;
        recipientMap.set(student.userId, {
          userId: student.userId,
          fullName: student.user.fullName,
          className
        });
      }
    }

    return {
      inbox,
      sent,
      recipients: Array.from(recipientMap.values())
    } satisfies TeacherMessagesPageData;
  },
  ['teacher-messages-page-data'],
  { revalidate: 30 }
);

export default async function TeacherMessagesPage() {
  const session = await requireAuth([UserRole.TEACHER, UserRole.ADMIN]);

  let access: Awaited<ReturnType<typeof getTeacherAccessMapByUserId>> | null = null;
  let data: Awaited<ReturnType<typeof getCachedTeacherMessagesData>> | null = null;

  try {
    [access, data] = await Promise.all([
      getTeacherAccessMapByUserId(session.id),
      getCachedTeacherMessagesData(session.id)
    ]);
  } catch (error) {
    console.error('[teacher/messages] load failed', error);
    if (!isDatabaseConnectionError(error)) throw error;
  }

  if (session.role === 'TEACHER' && access && !access.MESSAGES) {
    return (
      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(43,103,110,0.06)] p-8">
        <h2 className="font-headline text-3xl font-bold text-[#1a1c1c]">Messages Access Disabled</h2>
        <p className="mt-2 text-sm text-[#6f7979]">Admin has disabled your in-app messages module.</p>
      </div>
    );
  }

  if (!data) {
    return <DbOfflineBanner />;
  }

  const { inbox, sent, recipients } = data;

  const toIso = (value: Date | string | null | undefined) => {
    if (!value) return new Date().toISOString();
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  };

  const receivedMessages: SerializedMessage[] = inbox
    .filter((item) => item.message?.sender?.id && item.message?.subject && item.message?.body)
    .map((item) => ({
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

  return <TeacherMessagesClient messages={serializedMessages} recipients={recipients} />;
}
