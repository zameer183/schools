import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { hasTeacherAccessByUserId } from '@/lib/teacher-access';
import { progressCreateSchema } from '@/lib/validators';

async function getTeacherScope(userId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: {
      id: true,
      classAssignments: { select: { classId: true } },
      subjects: { select: { classId: true } }
    }
  });

  if (!teacher) return null;
  const classIds = Array.from(
    new Set([
      ...teacher.classAssignments.map((item) => item.classId),
      ...teacher.subjects.map((item) => item.classId)
    ])
  );

  return {
    teacherId: teacher.id,
    classIds
  };
}

export async function GET(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
  if (!auth.authorized) return auth.response;
  if (auth.session.role === UserRole.TEACHER) {
    const canAccess = await hasTeacherAccessByUserId(auth.session.id, 'PROGRESS');
    if (!canAccess) {
      return NextResponse.json({ error: 'Progress module access is disabled by admin.' }, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId') ?? undefined;
  const studentId = searchParams.get('studentId') ?? undefined;
  const date = searchParams.get('date') ?? undefined;

  if (auth.session.role === UserRole.TEACHER) {
    const scope = await getTeacherScope(auth.session.id);
    if (!scope) return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });

    const records = await prisma.studentProgress.findMany({
      where: {
        classId: classId ? classId : { in: scope.classIds },
        studentId,
        date: date ? new Date(date) : undefined,
        teacherId: scope.teacherId
      },
      include: {
        student: { include: { user: true } },
        class: true,
        teacher: { include: { user: true } }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(records);
  }

  if (auth.session.role === UserRole.STUDENT) {
    const student = await prisma.student.findUnique({ where: { userId: auth.session.id }, select: { id: true } });
    if (!student) return NextResponse.json([]);

    const records = await prisma.studentProgress.findMany({
      where: { studentId: student.id, date: date ? new Date(date) : undefined },
      include: { class: true, teacher: { include: { user: true } } },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(records);
  }

  if (auth.session.role === UserRole.PARENT) {
    const parent = await prisma.parent.findUnique({
      where: { userId: auth.session.id },
      select: { children: { select: { studentId: true } } }
    });
    if (!parent) return NextResponse.json([]);
    const childIds = parent.children.map((c) => c.studentId);
    const effectiveStudentId = studentId && childIds.includes(studentId) ? studentId : undefined;
    const studentFilter = effectiveStudentId ? { studentId: effectiveStudentId } : { studentId: { in: childIds } };
    const records = await prisma.studentProgress.findMany({
      where: { ...studentFilter, date: date ? new Date(date) : undefined },
      include: { student: { include: { user: true } }, class: true, teacher: { include: { user: true } } },
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(records);
  }

  const records = await prisma.studentProgress.findMany({
    where: {
      classId,
      studentId,
      date: date ? new Date(date) : undefined
    },
    include: {
      student: { include: { user: true } },
      class: true,
      teacher: { include: { user: true } }
    },
    orderBy: { date: 'desc' }
  });

  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;
  if (auth.session.role === UserRole.TEACHER) {
    const canAccess = await hasTeacherAccessByUserId(auth.session.id, 'PROGRESS');
    if (!canAccess) {
      return NextResponse.json({ error: 'Progress module access is disabled by admin.' }, { status: 403 });
    }
  }

  const parsed = progressCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? 'Invalid progress payload';
    return NextResponse.json({ error: firstIssue, details: parsed.error.flatten() }, { status: 400 });
  }

  let teacherId = '';

  if (auth.session.role === UserRole.TEACHER) {
    const scope = await getTeacherScope(auth.session.id);
    if (!scope) return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });

    if (!scope.classIds.includes(parsed.data.classId)) {
      return NextResponse.json({ error: 'You can only add progress for your assigned classes.' }, { status: 403 });
    }

    teacherId = scope.teacherId;
  } else {
    const anyTeacher = await prisma.teacher.findFirst({ select: { id: true } });
    if (!anyTeacher) return NextResponse.json({ error: 'No teacher profile found to map progress.' }, { status: 400 });
    teacherId = anyTeacher.id;
  }

  const student = await prisma.student.findUnique({ where: { id: parsed.data.studentId }, select: { classId: true } });
  if (!student || student.classId !== parsed.data.classId) {
    return NextResponse.json({ error: 'Student does not belong to selected class.' }, { status: 400 });
  }

  const progress = await prisma.studentProgress.upsert({
    where: {
      studentId_date: {
        studentId: parsed.data.studentId,
        date: new Date(parsed.data.date)
      }
    },
    update: {
      classId: parsed.data.classId,
      teacherId,
      lessonType: parsed.data.lessonType,
      juzzNumber: parsed.data.juzzNumber ?? null,
      lessonNumber: parsed.data.lessonNumber,
      ayahFrom: parsed.data.ayahFrom ?? null,
      ayahTo: parsed.data.ayahTo ?? null,
      notes: parsed.data.notes || null
    },
    create: {
      classId: parsed.data.classId,
      studentId: parsed.data.studentId,
      teacherId,
      date: new Date(parsed.data.date),
      lessonType: parsed.data.lessonType,
      juzzNumber: parsed.data.juzzNumber ?? null,
      lessonNumber: parsed.data.lessonNumber,
      ayahFrom: parsed.data.ayahFrom ?? null,
      ayahTo: parsed.data.ayahTo ?? null,
      notes: parsed.data.notes || null
    },
    include: {
      student: { include: { user: true } },
      class: true,
      teacher: { include: { user: true } }
    }
  });

  // Push the progress update to the target student as an in-app notification.
  await prisma.notification.create({
    data: {
      userId: progress.student.userId,
      title: 'Daily Progress Report Updated',
      body: `A new progress report has been submitted for ${parsed.data.date}.`,
      type: 'ACADEMIC'
    }
  });

  revalidatePath('/student');
  revalidatePath('/student/notifications');

  return NextResponse.json(progress, { status: 201 });
}
