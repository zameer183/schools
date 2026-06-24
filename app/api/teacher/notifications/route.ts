import { NotificationType, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

type Priority = 'NORMAL' | 'IMPORTANT' | 'URGENT';
type RecipientType = 'ALL_ASSIGNED' | 'CLASS' | 'STUDENT';

const PRIORITY_TO_TYPE: Record<Priority, NotificationType> = {
  NORMAL: NotificationType.SYSTEM,
  IMPORTANT: NotificationType.ACADEMIC,
  URGENT: NotificationType.ATTENDANCE
};

async function getTeacherScopeByUserId(userId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: {
      id: true,
      classAssignments: {
        select: {
          classId: true,
          class: { select: { id: true, name: true, section: true } }
        }
      }
    }
  });

  if (!teacher) return null;

  const classIds = teacher.classAssignments.map((item) => item.classId);
  const classes = teacher.classAssignments.map((item) => item.class);

  const students = classIds.length
    ? await prisma.student.findMany({
        where: { classId: { in: classIds } },
        select: {
          id: true,
          admissionNo: true,
          classId: true,
          userId: true,
          user: { select: { fullName: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    : [];

  return {
    teacherId: teacher.id,
    classIds,
    classes,
    students
  };
}

export async function GET() {
  const auth = await ensureApiRole([UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  try {
    const scope = await getTeacherScopeByUserId(auth.session.id);
    if (!scope) {
      return NextResponse.json({ error: 'Teacher profile missing.' }, { status: 400 });
    }

    const [unreadCount, inbox, sentMessages] = await Promise.all([
      prisma.notification.count({ where: { userId: auth.session.id, isRead: false } }),
      prisma.notification.findMany({
        where: { userId: auth.session.id },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.message.findMany({
        where: { senderId: auth.session.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          recipients: {
            include: {
              user: {
                select: {
                  fullName: true,
                  studentProfile: {
                    select: { id: true, classId: true }
                  }
                }
              }
            }
          }
        }
      })
    ]);

    const allowedStudentIds = new Set(scope.students.map((s) => s.id));

    const history = sentMessages
      .map((message) => {
        const recipients = message.recipients.filter((recipient) => {
          const studentId = recipient.user.studentProfile?.id;
          return !!studentId && allowedStudentIds.has(studentId);
        });

        if (!recipients.length) return null;

        const unreadRecipients = recipients.filter((recipient) => !recipient.isRead).length;

        return {
          id: message.id,
          title: message.subject,
          body: message.body,
          createdAt: message.createdAt,
          recipientCount: recipients.length,
          unreadRecipients
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      unreadCount,
      inbox,
      classes: scope.classes,
      students: scope.students.map((student) => ({
        id: student.id,
        userId: student.userId,
        fullName: student.user.fullName,
        admissionNo: student.admissionNo,
        classId: student.classId
      })),
      history
    });
  } catch (error) {
    console.error('[api/teacher/notifications][GET]', error);
    return NextResponse.json({ error: 'Unable to load notifications.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const recipientTypeRaw = typeof body?.recipientType === 'string' ? body.recipientType.trim().toUpperCase() : '';
    const recipientType: RecipientType =
      recipientTypeRaw === 'ALL_ASSIGNED' || recipientTypeRaw === 'CLASS' || recipientTypeRaw === 'STUDENT'
        ? recipientTypeRaw
        : 'ALL_ASSIGNED';

    const classId = typeof body?.classId === 'string' ? body.classId.trim() : '';
    const studentId = typeof body?.studentId === 'string' ? body.studentId.trim() : '';
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const priorityRaw = typeof body?.priority === 'string' ? body.priority.trim().toUpperCase() : 'NORMAL';
    const priority: Priority = priorityRaw === 'IMPORTANT' || priorityRaw === 'URGENT' ? priorityRaw : 'NORMAL';

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required.' }, { status: 400 });
    }

    const scope = await getTeacherScopeByUserId(auth.session.id);
    if (!scope) {
      return NextResponse.json({ error: 'Teacher profile missing.' }, { status: 400 });
    }

    let recipients = scope.students;

    if (recipientType === 'CLASS') {
      if (!classId || !scope.classIds.includes(classId)) {
        return NextResponse.json({ error: 'Please select an assigned class.' }, { status: 400 });
      }
      recipients = scope.students.filter((student) => student.classId === classId);
    }

    if (recipientType === 'STUDENT') {
      const target = scope.students.find((student) => student.id === studentId);
      if (!target) {
        return NextResponse.json({ error: 'Please select a valid assigned student.' }, { status: 400 });
      }
      recipients = [target];
    }

    if (!recipients.length) {
      return NextResponse.json({ error: 'No eligible students found for this selection.' }, { status: 400 });
    }

    const dedupedRecipients = Array.from(new Map(recipients.map((recipient) => [recipient.userId, recipient])).values());
    const notificationType = PRIORITY_TO_TYPE[priority];

    const created = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: {
          senderId: auth.session.id,
          subject: title,
          body: message
        }
      });

      await tx.messageRecipient.createMany({
        data: dedupedRecipients.map((recipient) => ({
          messageId: createdMessage.id,
          userId: recipient.userId
        }))
      });

      await tx.notification.createMany({
        data: dedupedRecipients.map((recipient) => ({
          userId: recipient.userId,
          studentId: recipient.id,
          title,
          body: message,
          type: notificationType
        }))
      });

      return createdMessage;
    });

    return NextResponse.json({
      ok: true,
      messageId: created.id,
      recipientCount: dedupedRecipients.length
    });
  } catch (error) {
    console.error('[api/teacher/notifications][POST]', error);
    return NextResponse.json({ error: 'Unable to send notification.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await ensureApiRole([UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const mode = typeof body?.mode === 'string' ? body.mode : 'mark-all-read';

    if (mode === 'mark-one-read') {
      const id = typeof body?.id === 'string' ? body.id.trim() : '';
      if (!id) {
        return NextResponse.json({ error: 'Notification id is required.' }, { status: 400 });
      }
      await prisma.notification.updateMany({
        where: { id, userId: auth.session.id },
        data: { isRead: true }
      });
      return NextResponse.json({ ok: true });
    }

    await prisma.notification.updateMany({
      where: { userId: auth.session.id, isRead: false },
      data: { isRead: true }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/teacher/notifications][PATCH]', error);
    return NextResponse.json({ error: 'Unable to update notifications.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await ensureApiRole([UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const mode = typeof body?.mode === 'string' ? body.mode : 'inbox';
    const deleteAll = body?.all === true;
    const ids = Array.isArray(body?.ids)
      ? body.ids.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];

    if (mode === 'history') {
      const where = deleteAll
        ? { senderId: auth.session.id }
        : { senderId: auth.session.id, id: { in: ids } };

      if (!deleteAll && ids.length === 0) {
        return NextResponse.json({ error: 'Select at least one history item.' }, { status: 400 });
      }

      const deleted = await prisma.message.deleteMany({ where });
      return NextResponse.json({ ok: true, deletedCount: deleted.count });
    }

    const where = deleteAll
      ? { userId: auth.session.id }
      : { userId: auth.session.id, id: { in: ids } };

    if (!deleteAll && ids.length === 0) {
      return NextResponse.json({ error: 'Select at least one notification.' }, { status: 400 });
    }

    const deleted = await prisma.notification.deleteMany({ where });
    return NextResponse.json({ ok: true, deletedCount: deleted.count });
  } catch (error) {
    console.error('[api/teacher/notifications][DELETE]', error);
    return NextResponse.json({ error: 'Unable to delete notifications.' }, { status: 500 });
  }
}

