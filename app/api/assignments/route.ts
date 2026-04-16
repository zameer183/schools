import { AssignmentStatus, SubmissionStatus, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { assignmentCreateSchema } from '@/lib/validators';

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
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId') ?? undefined;

  if (auth.session.role === UserRole.TEACHER) {
    const teacherScope = await getTeacherScope(auth.session.id);
    if (!teacherScope) return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });

    const assignments = await prisma.assignment.findMany({
      where: {
        teacherId: teacherScope.teacherId,
        classId: classId ?? undefined
      },
      include: { class: true, subject: true, submissions: true, files: true },
      orderBy: { dueDate: 'asc' }
    });

    return NextResponse.json(assignments);
  }

  if (auth.session.role === UserRole.STUDENT) {
    const student = await prisma.student.findUnique({ where: { userId: auth.session.id }, select: { classId: true } });
    if (!student?.classId) return NextResponse.json([]);

    const assignments = await prisma.assignment.findMany({
      where: { classId: student.classId },
      include: { class: true, subject: true, submissions: true, files: true },
      orderBy: { dueDate: 'asc' }
    });

    return NextResponse.json(assignments);
  }

  const assignments = await prisma.assignment.findMany({
    where: { classId },
    include: { class: true, subject: true, submissions: true, files: true },
    orderBy: { dueDate: 'asc' }
  });

  return NextResponse.json(assignments);
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  const body = await request.json();
  const parsed = assignmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? 'Invalid assignment payload';
    return NextResponse.json({ error: firstIssue, details: parsed.error.flatten() }, { status: 400 });
  }

  const subject = await prisma.subject.findUnique({
    where: { id: parsed.data.subjectId },
    select: { id: true, classId: true, teacherId: true }
  });

  if (!subject) return NextResponse.json({ error: 'Selected subject is invalid.' }, { status: 400 });
  if (subject.classId !== parsed.data.classId) {
    return NextResponse.json({ error: 'Selected subject does not belong to selected class.' }, { status: 400 });
  }

  let teacherId: string | null = null;

  if (auth.session.role === UserRole.TEACHER) {
    const teacherScope = await getTeacherScope(auth.session.id);
    if (!teacherScope) return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });

    if (!teacherScope.classIds.includes(parsed.data.classId)) {
      return NextResponse.json({ error: 'You can only create assignments for your assigned classes.' }, { status: 403 });
    }

    if (subject.teacherId && subject.teacherId !== teacherScope.teacherId) {
      return NextResponse.json({ error: 'You are not assigned to this subject.' }, { status: 403 });
    }

    teacherId = teacherScope.teacherId;
  } else {
    teacherId = subject.teacherId;
    if (!teacherId) {
      return NextResponse.json({ error: 'Assign a teacher to this subject before creating assignment.' }, { status: 400 });
    }
  }

  const assignment = await prisma.assignment.create({
    data: {
      ...parsed.data,
      dueDate: new Date(parsed.data.dueDate),
      teacherId,
      status: AssignmentStatus.PUBLISHED
    }
  });

  return NextResponse.json(assignment, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await ensureApiRole([UserRole.STUDENT, UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { assignmentId, content, studentId } = await request.json();

  const submission = await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    update: { content, status: SubmissionStatus.SUBMITTED, submittedAt: new Date() },
    create: { assignmentId, studentId, content, status: SubmissionStatus.SUBMITTED }
  });

  return NextResponse.json(submission, { status: 201 });
}