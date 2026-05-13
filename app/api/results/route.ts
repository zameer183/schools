import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

const ALLOWED_QUALITIES = ['?????', '???', '????'] as const;

function normalizeRemarks(raw: unknown, qualityRaw: unknown, mistakesRaw: unknown) {
  const remarks = String(raw ?? '').trim();
  const quality = String(qualityRaw ?? '').trim();
  const mistakes = String(mistakesRaw ?? '').trim();

  if (!quality && !mistakes) return remarks || null;

  const qualityValue = ALLOWED_QUALITIES.includes(quality as (typeof ALLOWED_QUALITIES)[number]) ? quality : '???';
  const parts = [`?????: ${qualityValue}`, `??????: ${mistakes || '-'}`];
  if (remarks) parts.push(`?????: ${remarks}`);
  return parts.join('\n');
}

export async function GET(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const examId = searchParams.get('examId') ?? undefined;

  const rawStudentId = searchParams.get('studentId') ?? undefined;
  let studentFilter: Record<string, unknown> = rawStudentId ? { studentId: rawStudentId } : {};

  if (auth.session.role === UserRole.STUDENT) {
    const student = await prisma.student.findUnique({ where: { userId: auth.session.id }, select: { id: true } });
    if (!student) return NextResponse.json([]);
    studentFilter = { studentId: student.id };
  } else if (auth.session.role === UserRole.PARENT) {
    const parent = await prisma.parent.findUnique({
      where: { userId: auth.session.id },
      select: { children: { select: { studentId: true } } }
    });
    if (!parent) return NextResponse.json([]);
    const childIds = parent.children.map((c) => c.studentId);
    const effectiveStudentId = rawStudentId && childIds.includes(rawStudentId) ? rawStudentId : undefined;
    studentFilter = effectiveStudentId ? { studentId: effectiveStudentId } : { studentId: { in: childIds } };
  }

  const results = await prisma.result.findMany({
    where: { ...studentFilter, examId },
    include: {
      student: { include: { user: true } },
      exam: { include: { createdBy: { include: { user: { select: { fullName: true } } } } } },
      subject: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;

  const examId = String(payload.examId ?? '').trim();
  const studentId = String(payload.studentId ?? '').trim();
  const subjectId = String(payload.subjectId ?? '').trim();
  const marksObtained = Number(payload.marksObtained ?? 0);
  const grade = String(payload.grade ?? '').trim();

  if (!examId || !studentId || !subjectId) {
    return NextResponse.json({ error: 'Exam, student, and subject are required.' }, { status: 400 });
  }

  if (!Number.isFinite(marksObtained) || marksObtained < 0) {
    return NextResponse.json({ error: 'Obtained marks must be 0 or greater.' }, { status: 400 });
  }

  if (!grade) {
    return NextResponse.json({ error: 'Grade is required.' }, { status: 400 });
  }

  const remarks = normalizeRemarks(payload.remarks, payload.quality, payload.mistakes);

  const result = await prisma.result.upsert({
    where: { examId_studentId: { examId, studentId } },
    update: { marksObtained, grade, remarks, subjectId },
    create: { examId, studentId, subjectId, marksObtained, grade, remarks }
  });

  return NextResponse.json(result, { status: 201 });
}
