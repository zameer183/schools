import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { hasTeacherAccessByUserId } from '@/lib/teacher-access';

export async function POST(request: Request) {
  try {
    const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
    if (!auth.authorized) return auth.response;

    if (auth.session.role === UserRole.TEACHER) {
      const canAccess = await hasTeacherAccessByUserId(auth.session.id, 'ATTENDANCE');
      if (!canAccess) {
        return NextResponse.json({ error: 'Attendance module access is disabled by admin.' }, { status: 403 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const classId = typeof body?.classId === 'string' ? body.classId : '';
    const date = typeof body?.date === 'string' ? body.date : '';
    const status = typeof body?.status === 'string' ? body.status.toUpperCase() : '';
    const customMessage = typeof body?.message === 'string' ? body.message.trim() : '';
    const requestedStudentIds = Array.isArray(body?.studentIds)
      ? body.studentIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];

    if (!classId || !date || !status) {
      return NextResponse.json({ error: 'classId, date, and status are required' }, { status: 400 });
    }

    if (!['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid attendance status' }, { status: 400 });
    }

    if (auth.session.role === UserRole.TEACHER) {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: auth.session.id },
        select: {
          classAssignments: { select: { classId: true } },
          subjects: { select: { classId: true } }
        }
      });

      if (!teacher) return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });

      const allowedClassIds = Array.from(new Set([
        ...teacher.classAssignments.map((item) => item.classId),
        ...teacher.subjects.map((item) => item.classId)
      ]));

      if (!allowedClassIds.includes(classId)) {
        return NextResponse.json({ error: 'You can only send messages for your assigned classes.' }, { status: 403 });
      }
    }

    const classMeta = await prisma.class.findUnique({
      where: { id: classId },
      select: { name: true, section: true }
    });

    let recipientIds: string[] = [];
    if (requestedStudentIds.length > 0) {
      const matchedStudents = await prisma.student.findMany({
        where: { id: { in: requestedStudentIds }, classId },
        select: { userId: true }
      });
      recipientIds = Array.from(new Set(matchedStudents.map((s) => s.userId)));
    } else {
      const attendanceRows = await prisma.attendance.findMany({
        where: {
          classId,
          status: status as 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
          date: new Date(date)
        },
        include: {
          student: { include: { user: { select: { id: true } } } }
        }
      });
      recipientIds = Array.from(new Set(attendanceRows.map((row) => row.student.user.id)));
    }

    if (recipientIds.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No students found for selected status.' });
    }

    const defaultText = `Attendance status update (${status}) for ${classMeta?.name ?? 'Class'} - ${classMeta?.section ?? ''} on ${date}.`;
    const bodyText = customMessage || defaultText;

    await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          senderId: auth.session.id,
          subject: `Attendance ${status} - ${date}`,
          body: bodyText
        },
        select: { id: true }
      });

      await tx.messageRecipient.createMany({
        data: recipientIds.map((userId) => ({ messageId: msg.id, userId })),
        skipDuplicates: true
      });

      await tx.notification.createMany({
        data: recipientIds.map((userId) => ({
          userId,
          title: `Attendance ${status}`,
          body: bodyText,
          type: 'ATTENDANCE',
          isRead: false
        }))
      });
    });

    return NextResponse.json({ sent: recipientIds.length });
  } catch (error) {
    console.error('[api/attendance/status-message][POST]', error);
    return NextResponse.json({ error: 'Unable to send attendance messages right now.' }, { status: 500 });
  }
}
