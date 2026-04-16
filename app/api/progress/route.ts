import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { progressCreateSchema } from '@/lib/validators';

async function getTeacherScope(userId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: { id: true, classAssignments: { select: { classId: true } } }
  });

  if (!teacher) return null;
  return {
    teacherId: teacher.id,
    classIds: teacher.classAssignments.map((item) => item.classId)
  };
}

export async function GET(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
  if (!auth.authorized) return auth.response;

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

  return NextResponse.json(progress, { status: 201 });
}
