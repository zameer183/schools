import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StudentMessagesChatClient, type StudentInboxItem, type StudentOutgoingMap, type AvailableTeacher } from './student-messages-chat-client';

export const dynamic = 'force-dynamic';

function toIsoString(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export default async function StudentMessagesPage() {
  const session = await requireAuth([UserRole.STUDENT]);

  const [inbox, sent, student] = await Promise.all([
    prisma.messageRecipient.findMany({
      where: { userId: session.id },
      include: { message: { include: { sender: { select: { id: true, fullName: true, role: true } } } } },
      orderBy: { message: { createdAt: 'desc' } },
      take: 50
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
      take: 50
    }),
    prisma.student.findUnique({
      where: { userId: session.id },
      select: {
        classId: true,
        class: {
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
        }
      }
    })
  ]);

  const teacherMap = new Map<string, string>();
  if (student?.class) {
    for (const sub of student.class.subjects) {
      if (sub.teacher) teacherMap.set(sub.teacher.user.id, sub.teacher.user.fullName);
    }
    for (const ta of student.class.teacherLinks) {
      teacherMap.set(ta.teacher.user.id, ta.teacher.user.fullName);
    }
  }
  const teachers = Array.from(teacherMap.entries()).map(([id, fullName]) => ({ id, fullName }));

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

  return <StudentMessagesChatClient initialInbox={serializedInbox} initialOutgoing={initialOutgoing} availableTeachers={teachers} />;
}
