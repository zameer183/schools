import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminMessagingWorkspace from './admin-messaging-workspace';

export const dynamic = 'force-dynamic';

type AdminMessagesPageProps = {
  searchParams?: Promise<{
    recipientId?: string;
    page?: string;
  }>;
};

function toIsoString(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

const getCachedAdminMessagesData = unstable_cache(
  async (userId: string, page: number) => {
    const pageSize = 50;
    const skip = (page - 1) * pageSize;
    const [classes, teachers, students, sentMessages, receivedMessages] = await Promise.all([
      prisma.class.findMany({
        select: {
          id: true,
          name: true,
          section: true,
          _count: { select: { students: true } }
        },
        orderBy: [{ name: 'asc' }, { section: 'asc' }]
      }),
      prisma.teacher.findMany({
        where: { user: { isActive: true } },
        select: {
          id: true,
          userId: true,
          employeeCode: true,
          user: { select: { id: true, fullName: true, email: true } },
          subjects: { select: { name: true } },
          classAssignments: {
            select: {
              class: { select: { name: true, section: true } }
            }
          }
        },
        orderBy: { user: { fullName: 'asc' } }
      }),
      prisma.student.findMany({
        where: { user: { isActive: true } },
        select: {
          id: true,
          userId: true,
          admissionNo: true,
          classId: true,
          user: { select: { id: true, fullName: true } },
          class: { select: { id: true, name: true, section: true } }
        },
        orderBy: [
          { class: { name: 'asc' } },
          { user: { fullName: 'asc' } }
        ]
      }),
      prisma.message.findMany({
        include: {
          recipients: { include: { user: { select: { id: true, fullName: true, role: true } } } }
        },
        where: { senderId: userId },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip
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
        take: pageSize,
        skip
      })
    ]);

    return { classes, teachers, students, sentMessages, receivedMessages };
  },
  ['admin-messages-page-data-v4'],
  { revalidate: 20 }
);

export default async function AdminMessagesPage({ searchParams }: AdminMessagesPageProps) {
  const session = await requireAuth([UserRole.ADMIN]);
  const params = (await searchParams) ?? {};
  const presetRecipientId = params.recipientId?.trim() ?? '';
  const page = Math.max(1, parseInt(params.page ?? '1') || 1);

  let rawData: Awaited<ReturnType<typeof getCachedAdminMessagesData>> = {
    classes: [],
    teachers: [],
    students: [],
    sentMessages: [],
    receivedMessages: []
  };

  try {
    rawData = await getCachedAdminMessagesData(session.id, page);
  } catch (error) {
    console.error('[admin/messages] data loading error:', error);
  }

  const { classes, teachers, students, sentMessages, receivedMessages } = rawData;

  const serializedTeachers = teachers.map((teacher) => ({
    id: teacher.id,
    userId: teacher.userId,
    fullName: teacher.user.fullName,
    email: teacher.user.email,
    employeeCode: teacher.employeeCode,
    subjects: teacher.subjects.map((s) => s.name),
    classes: teacher.classAssignments.map((ca) => `${ca.class.name} - ${ca.class.section}`)
  }));

  const serializedStudents = students.map((student) => ({
    id: student.id,
    userId: student.userId,
    admissionNo: student.admissionNo,
    classId: student.classId,
    fullName: student.user.fullName,
    className: student.class ? `${student.class.name} - ${student.class.section}` : 'Unassigned Class',
    section: student.class?.section ?? ''
  }));

  const serializedClasses = classes.map((c) => ({
    id: c.id,
    name: c.name,
    section: c.section,
    studentCount: c._count.students
  }));

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
      classes={serializedClasses}
      teachers={serializedTeachers}
      students={serializedStudents}
      receivedMessages={serializedReceived}
      sentMessages={serializedSent}
      presetRecipientId={presetRecipientId}
      page={page}
    />
  );
}
