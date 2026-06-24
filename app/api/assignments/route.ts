import { AssignmentStatus, SubmissionStatus, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { hasTeacherAccessByUserId } from '@/lib/teacher-access';
import { assignmentCreateSchema } from '@/lib/validators';

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
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT]);
  if (!auth.authorized) return auth.response;
  if (auth.session.role === UserRole.TEACHER) {
    const canAccess = await hasTeacherAccessByUserId(auth.session.id, 'ASSIGNMENTS');
    if (!canAccess) {
      return NextResponse.json({ error: 'Assignments module access is disabled by admin.' }, { status: 403 });
    }
  }

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
      include: {
        class: { select: { name: true, section: true } },
        subject: { select: { name: true } },
        _count: { select: { submissions: true } }
      },
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
  if (auth.session.role === UserRole.TEACHER) {
    const canAccess = await hasTeacherAccessByUserId(auth.session.id, 'ASSIGNMENTS');
    if (!canAccess) {
      return NextResponse.json({ error: 'Assignments module access is disabled by admin.' }, { status: 403 });
    }
  }

  const body = await request.json();
  const parsed = assignmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? 'Invalid assignment payload';
    return NextResponse.json({ error: firstIssue, details: parsed.error.flatten() }, { status: 400 });
  }

  let teacherId: string | null = null;
  let scopeTeacherId: string | null = null;
  let teacherClassIds: string[] = [];

  if (auth.session.role === UserRole.TEACHER) {
    const teacherScope = await getTeacherScope(auth.session.id);
    if (!teacherScope) return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });

    teacherClassIds = teacherScope.classIds;
    scopeTeacherId = teacherScope.teacherId;

    if (!teacherScope.classIds.includes(parsed.data.classId)) {
      return NextResponse.json({ error: 'You can only create assignments for your assigned classes.' }, { status: 403 });
    }
  }

  let subject = parsed.data.subjectId
    ? await prisma.subject.findUnique({
        where: { id: parsed.data.subjectId },
        select: { id: true, classId: true, teacherId: true, name: true, code: true }
      })
    : null;

  if (subject && subject.classId !== parsed.data.classId) {
    return NextResponse.json({ error: 'Selected subject does not belong to selected class.' }, { status: 400 });
  }

  if (!subject) {
    // Subject optional flow: use an existing class subject, otherwise create a generic subject.
    subject = await prisma.subject.findFirst({
      where: {
        classId: parsed.data.classId,
        ...(scopeTeacherId ? { OR: [{ teacherId: scopeTeacherId }, { teacherId: null }] } : {})
      },
      select: { id: true, classId: true, teacherId: true, name: true, code: true },
      orderBy: { createdAt: 'asc' }
    });

    if (!subject) {
      const fallbackCode = `GEN-${parsed.data.classId.slice(0, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      subject = await prisma.subject.create({
        data: {
          name: 'General',
          code: fallbackCode,
          classId: parsed.data.classId,
          teacherId: scopeTeacherId ?? undefined,
          creditHours: 1
        },
        select: { id: true, classId: true, teacherId: true, name: true, code: true }
      });
    }
  }

  if (auth.session.role === UserRole.TEACHER) {
    if (subject.teacherId && subject.teacherId !== scopeTeacherId) {
      return NextResponse.json({ error: 'You are not assigned to this subject.' }, { status: 403 });
    }
    if (teacherClassIds.length > 0 && !teacherClassIds.includes(subject.classId)) {
      return NextResponse.json({ error: 'Subject class is outside your assigned classes.' }, { status: 403 });
    }
    teacherId = scopeTeacherId;
  } else {
    teacherId = subject.teacherId;
    if (!teacherId) {
      return NextResponse.json({ error: 'Assign a teacher to this subject before creating assignment.' }, { status: 400 });
    }
  }

  if (!teacherId) {
    return NextResponse.json({ error: 'Teacher is required to create assignment.' }, { status: 400 });
  }

  const assignment = await prisma.assignment.create({
    data: {
      ...parsed.data,
      subjectId: subject.id,
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

  if (auth.session.role === UserRole.STUDENT) {
    const me = await prisma.student.findUnique({ where: { userId: auth.session.id }, select: { id: true } });
    if (!me || me.id !== studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const submission = await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    update: { content, status: SubmissionStatus.SUBMITTED, submittedAt: new Date() },
    create: { assignmentId, studentId, content, status: SubmissionStatus.SUBMITTED }
  });

  return NextResponse.json(submission, { status: 201 });
}
