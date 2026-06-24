import { type Prisma, UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StudentMessagesChatClient, type StudentInboxItem, type StudentOutgoingMap } from './student-messages-chat-client';

export const dynamic = 'force-dynamic';

type InboxRow = Prisma.MessageRecipientGetPayload<{
  include: { message: { include: { sender: { select: { id: true; fullName: true; role: true } } } } };
}>;

type SentRow = Prisma.MessageGetPayload<{
  include: { recipients: { include: { user: { select: { id: true } } } } };
}>;

function toIsoString(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export default async function StudentMessagesPage() {
  const session = await requireAuth([UserRole.STUDENT]);

  let inbox: InboxRow[] = [];
  let sent: SentRow[] = [];
  let student: { classId: string | null } | null = null;
  try {
    [inbox, sent, student] = await Promise.all([
      prisma.messageRecipient.findMany({
        where: { userId: session.id },
        include: { message: { include: { sender: { select: { id: true, fullName: true, role: true } } } } },
        orderBy: { message: { createdAt: 'desc' } },
        take: 20
      }),
      prisma.message.findMany({
        where: { senderId: session.id },
        include: {
          recipients: {
            include: {
              user: { select: { id: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.student.findUnique({
        where: { userId: session.id },
        select: { classId: true }
      })
    ]);
  } catch {
    // Render an empty state instead of crashing the whole server component.
  }

  const teacherMap = new Map<string, string>();
  if (student?.classId) {
    try {
      const enrichedClass = await prisma.class.findUnique({
        where: { id: student.classId },
        select: {
          subjects: {
            select: {
              teacher: {
                select: { user: { select: { id: true, fullName: true, isActive: true } } }
              }
            }
          },
          teacherLinks: {
            select: {
              teacher: {
                select: { user: { select: { id: true, fullName: true, isActive: true } } }
              }
            }
          }
        }
      });

      if (enrichedClass) {
        for (const sub of enrichedClass.subjects) {
          if (sub.teacher?.user.isActive) teacherMap.set(sub.teacher.user.id, sub.teacher.user.fullName);
        }
        for (const ta of enrichedClass.teacherLinks) {
          if (ta.teacher?.user.isActive) teacherMap.set(ta.teacher.user.id, ta.teacher.user.fullName);
        }
      }
    } catch {
      // Fallback for environments where isActive is unavailable at runtime.
      const fallbackClass = await prisma.class.findUnique({
        where: { id: student.classId },
        select: {
          subjects: {
            select: {
              teacher: {
                select: { user: { select: { id: true, fullName: true } } }
              }
            }
          },
          teacherLinks: {
            select: {
              teacher: {
                select: { user: { select: { id: true, fullName: true } } }
              }
            }
          }
        }
      });

      if (fallbackClass) {
        for (const sub of fallbackClass.subjects) {
          if (sub.teacher?.user) teacherMap.set(sub.teacher.user.id, sub.teacher.user.fullName);
        }
        for (const ta of fallbackClass.teacherLinks) {
          if (ta.teacher?.user) teacherMap.set(ta.teacher.user.id, ta.teacher.user.fullName);
        }
      }
    }
  }
  const teachers = Array.from(teacherMap.entries()).map(([id, fullName]) => ({ id, fullName, role: 'TEACHER' as const }));
  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN, isActive: true },
    select: { id: true, fullName: true }
  }).catch(() => [] as Array<{ id: string; fullName: string }>);
  const availableRecipients = [
    ...teachers,
    ...admins.map((admin) => ({ id: admin.id, fullName: admin.fullName, role: 'ADMIN' as const }))
  ];

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

  return <StudentMessagesChatClient initialInbox={serializedInbox} initialOutgoing={initialOutgoing} availableTeachers={availableRecipients} />;
}
