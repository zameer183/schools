import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

const EXAM_TYPES = ['One Juzz', '5 Juzz', '10 Juzz', 'Full Revision', 'Custom'] as const;

function encodeExamTitle(title: string, examType?: string) {
  const cleanTitle = title.trim();
  const cleanType = (examType ?? '').trim();
  if (!cleanType) return cleanTitle;
  return `[${cleanType}] ${cleanTitle}`;
}

function parseExamTitle(rawTitle: string) {
  const value = rawTitle.trim();
  const match = value.match(/^\[(.+?)\]\s*(.*)$/);
  if (!match) {
    return { title: value, examType: 'Custom' };
  }
  return { examType: match[1].trim(), title: (match[2] ?? '').trim() || value };
}

function normalizeExamResponse<T extends { title: string; examDate: Date; createdBy?: { user?: { fullName?: string | null } | null } | null }>(exam: T) {
  const parsed = parseExamTitle(exam.title);
  return {
    ...exam,
    title: parsed.title,
    examType: parsed.examType,
    dueDate: exam.examDate,
    teacherName: exam.createdBy?.user?.fullName ?? '-'
  };
}

export async function GET() {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
  if (!auth.authorized) return auth.response;

  const exams = await prisma.exam.findMany({
    include: { class: true, subject: true, createdBy: { include: { user: true } } },
    orderBy: { examDate: 'desc' }
  });

  return NextResponse.json(exams.map((exam) => normalizeExamResponse(exam)));
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;

  const title = String(payload.title ?? '').trim();
  const classId = String(payload.classId ?? '').trim();
  const subjectId = String(payload.subjectId ?? '').trim();
  const dueDateRaw = String(payload.dueDate ?? payload.examDate ?? '').trim();
  const examTypeRaw = String(payload.examType ?? '').trim();
  const totalMarks = Number(payload.totalMarks ?? 0);
  const passingMarks = Number(payload.passingMarks ?? 0);
  const createdByTeacherIdRaw = String(payload.createdByTeacherId ?? '').trim();

  if (!title || !classId || !subjectId || !dueDateRaw) {
    return NextResponse.json({ error: 'Title, class, subject, and due date are required.' }, { status: 400 });
  }

  if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
    return NextResponse.json({ error: 'Total marks must be greater than 0.' }, { status: 400 });
  }

  if (!Number.isFinite(passingMarks) || passingMarks < 0 || passingMarks > totalMarks) {
    return NextResponse.json({ error: 'Passing marks must be between 0 and total marks.' }, { status: 400 });
  }

  const dueDate = new Date(dueDateRaw);
  if (Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: 'Invalid due date.' }, { status: 400 });
  }

  const examType = EXAM_TYPES.includes(examTypeRaw as (typeof EXAM_TYPES)[number]) ? examTypeRaw : 'Custom';

  let createdByTeacherId = '';
  if (auth.session.role === UserRole.TEACHER) {
    const teacher = await prisma.teacher.findFirst({ where: { userId: auth.session.id }, select: { id: true } });
    if (!teacher) return NextResponse.json({ error: 'Teacher profile not found.' }, { status: 400 });
    createdByTeacherId = teacher.id;
  } else {
    if (!createdByTeacherIdRaw) {
      return NextResponse.json({ error: 'Select teacher name who is adding this exam.' }, { status: 400 });
    }
    const teacher = await prisma.teacher.findUnique({ where: { id: createdByTeacherIdRaw }, select: { id: true } });
    if (!teacher) return NextResponse.json({ error: 'Selected teacher was not found.' }, { status: 404 });
    createdByTeacherId = teacher.id;
  }

  const exam = await prisma.exam.create({
    data: {
      title: encodeExamTitle(title, examType),
      classId,
      subjectId,
      examDate: dueDate,
      totalMarks,
      passingMarks,
      createdById: createdByTeacherId
    },
    include: { class: true, subject: true, createdBy: { include: { user: true } } }
  });

  return NextResponse.json(normalizeExamResponse(exam), { status: 201 });
}

export async function PUT(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;

  const id = String(payload.id ?? '').trim();
  const title = String(payload.title ?? '').trim();
  const classId = String(payload.classId ?? '').trim();
  const subjectId = String(payload.subjectId ?? '').trim();
  const dueDateRaw = String(payload.dueDate ?? payload.examDate ?? '').trim();
  const examTypeRaw = String(payload.examType ?? '').trim();
  const totalMarks = Number(payload.totalMarks ?? 0);
  const passingMarks = Number(payload.passingMarks ?? 0);
  const createdByTeacherIdRaw = String(payload.createdByTeacherId ?? '').trim();

  if (!id || !title || !classId || !subjectId || !dueDateRaw) {
    return NextResponse.json({ error: 'Exam id, title, class, subject, and due date are required.' }, { status: 400 });
  }

  if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
    return NextResponse.json({ error: 'Total marks must be greater than 0.' }, { status: 400 });
  }

  if (!Number.isFinite(passingMarks) || passingMarks < 0 || passingMarks > totalMarks) {
    return NextResponse.json({ error: 'Passing marks must be between 0 and total marks.' }, { status: 400 });
  }

  const dueDate = new Date(dueDateRaw);
  if (Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: 'Invalid due date.' }, { status: 400 });
  }

  const examType = EXAM_TYPES.includes(examTypeRaw as (typeof EXAM_TYPES)[number]) ? examTypeRaw : 'Custom';

  const existing = await prisma.exam.findUnique({ where: { id }, select: { createdById: true } });
  if (!existing) return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });

  let createdByTeacherId = existing.createdById;
  if (auth.session.role === UserRole.ADMIN) {
    if (createdByTeacherIdRaw) {
      const teacher = await prisma.teacher.findUnique({ where: { id: createdByTeacherIdRaw }, select: { id: true } });
      if (!teacher) return NextResponse.json({ error: 'Selected teacher was not found.' }, { status: 404 });
      createdByTeacherId = teacher.id;
    }
  } else {
    const teacher = await prisma.teacher.findFirst({ where: { userId: auth.session.id }, select: { id: true } });
    if (!teacher) return NextResponse.json({ error: 'Teacher profile not found.' }, { status: 400 });
    createdByTeacherId = teacher.id;
  }

  const exam = await prisma.exam.update({
    where: { id },
    data: {
      title: encodeExamTitle(title, examType),
      classId,
      subjectId,
      examDate: dueDate,
      totalMarks,
      passingMarks,
      createdById: createdByTeacherId
    },
    include: { class: true, subject: true, createdBy: { include: { user: true } } }
  });

  return NextResponse.json(normalizeExamResponse(exam));
}

export async function DELETE(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Exam id is required.' }, { status: 400 });

  const exam = await prisma.exam.findUnique({
    where: { id },
    select: { id: true, createdById: true, _count: { select: { results: true } } }
  });

  if (!exam) return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });

  if (auth.session.role === UserRole.TEACHER) {
    const teacher = await prisma.teacher.findFirst({ where: { userId: auth.session.id }, select: { id: true } });
    if (!teacher || teacher.id !== exam.createdById) {
      return NextResponse.json({ error: 'You can only delete your own exams.' }, { status: 403 });
    }
  }

  if (exam._count.results > 0) {
    return NextResponse.json({ error: 'Cannot delete exam with existing results.' }, { status: 409 });
  }

  await prisma.exam.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
