import { UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { hasTeacherAccessByUserId } from '@/lib/teacher-access';

const ALLOWED_QUALITIES = ['Excellent', 'Good', 'Needs Practice'] as const;

function normalizeRemarks(raw: unknown, qualityRaw: unknown, mistakesRaw: unknown) {
  const remarks = String(raw ?? '').trim();
  const quality = String(qualityRaw ?? '').trim();
  const mistakes = String(mistakesRaw ?? '').trim();

  if (!quality && !mistakes) return remarks || null;

  const qualityValue = ALLOWED_QUALITIES.includes(quality as (typeof ALLOWED_QUALITIES)[number]) ? quality : quality;
  const parts = [`Tajweed Quality: ${qualityValue}`, `Mistakes: ${mistakes || '-'}`];
  if (remarks) parts.push(`Remarks: ${remarks}`);
  return parts.join('\n');
}

function isLocalRestFallbackEnabled() {
  return process.env.FORCE_SUPABASE_REST_DATA_FALLBACK === '1';
}

async function supabaseRest<T>(
  table: string,
  params: Record<string, string>,
  init?: { method?: string; body?: unknown; prefer?: string }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase REST fallback is not configured');
  }

  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(init?.prefer ? { Prefer: init.prefer } : {})
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store'
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase REST ${table} failed with ${response.status}: ${text}`);
  }

  if (response.status === 204) return [] as T[];
  const text = await response.text();
  return text ? (JSON.parse(text) as T[]) : ([] as T[]);
}

async function getTeacherIdViaRest(userId: string) {
  const [teacher] = await supabaseRest<{ id: string }>('Teacher', {
    select: 'id',
    userId: `eq.${userId}`,
    limit: '1'
  });
  return teacher?.id ?? null;
}

export async function GET(request: Request) {
  try {
    const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId') ?? undefined;
    if (examId) {
      const examExists = await prisma.exam.findUnique({ where: { id: examId }, select: { id: true } });
      if (!examExists) return NextResponse.json([]);
    }

    const rawStudentId = searchParams.get('studentId') ?? undefined;
    let studentFilter: Record<string, unknown> = rawStudentId ? { studentId: rawStudentId } : {};
    let examFilter: Record<string, unknown> = examId ? { examId } : {};

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
    } else if (auth.session.role === UserRole.TEACHER) {
      const canAccess = await hasTeacherAccessByUserId(auth.session.id, 'EXAMS');
      if (!canAccess) {
        return NextResponse.json({ error: 'Exams module access is disabled by admin.' }, { status: 403 });
      }

      const teacher = await prisma.teacher.findUnique({
        where: { userId: auth.session.id },
        select: { id: true, classAssignments: { select: { classId: true } } }
      });
      if (!teacher) return NextResponse.json([]);

      const classIds = teacher.classAssignments.map((item) => item.classId);
      if (!classIds.length) return NextResponse.json([]);

      examFilter = { exam: { classId: { in: classIds } }, ...examFilter };

      if (rawStudentId) {
        const student = await prisma.student.findUnique({
          where: { id: rawStudentId },
          select: { id: true, classId: true }
        });
        if (!student?.classId || !classIds.includes(student.classId)) {
          return NextResponse.json([]);
        }
        studentFilter = { studentId: rawStudentId };
      }
    }

    const results = await prisma.result.findMany({
      where: { ...studentFilter, ...examFilter },
      include: {
        student: { include: { user: true } },
        exam: { include: { createdBy: { include: { user: { select: { fullName: true } } } } } },
        subject: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('[api/results][GET]', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  if (auth.session.role === UserRole.TEACHER) {
    const canAccess = await hasTeacherAccessByUserId(auth.session.id, 'EXAMS');
    if (!canAccess) {
      return NextResponse.json({ error: 'Exams module access is disabled by admin.' }, { status: 403 });
    }
  }

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

  if (isLocalRestFallbackEnabled()) {
    try {
      const [exam] = await supabaseRest<{ id: string; subjectId: string; totalMarks: number; createdById: string }>('Exam', {
        select: 'id,subjectId,totalMarks,createdById',
        id: `eq.${examId}`,
        limit: '1'
      });
      if (!exam) {
        return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
      }

      if (Number(marksObtained) > Number(exam.totalMarks)) {
        return NextResponse.json({ error: `Obtained marks must be between 0 and ${exam.totalMarks}.` }, { status: 400 });
      }

      if (auth.session.role === UserRole.TEACHER) {
        const teacherId = await getTeacherIdViaRest(auth.session.id);
        if (!teacherId || teacherId !== exam.createdById) {
          return NextResponse.json({ error: 'You can only save results for your own exams.' }, { status: 403 });
        }
      }

      const [student] = await supabaseRest<{ id: string }>('Student', {
        select: 'id',
        id: `eq.${studentId}`,
        limit: '1'
      });
      if (!student) {
        return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
      }

      const [existing] = await supabaseRest<{ id: string }>('Result', {
        select: 'id',
        examId: `eq.${examId}`,
        studentId: `eq.${studentId}`,
        limit: '1'
      });

      const resultBody = {
        examId,
        studentId,
        subjectId: subjectId || exam.subjectId,
        marksObtained,
        grade,
        remarks,
        updatedAt: new Date().toISOString()
      };

      if (existing) {
        const [updated] = await supabaseRest('Result', {
          select: '*',
          id: `eq.${existing.id}`
        }, {
          method: 'PATCH',
          prefer: 'return=representation',
          body: resultBody
        });
        return NextResponse.json(updated, { status: 201 });
      }

      const [created] = await supabaseRest('Result', { select: '*' }, {
        method: 'POST',
        prefer: 'return=representation',
        body: { id: randomUUID(), ...resultBody, createdAt: new Date().toISOString() }
      });
      return NextResponse.json(created, { status: 201 });
    } catch (error) {
      console.error('[api/results][POST][rest-fallback]', error);
      return NextResponse.json({ error: 'Unable to save marks.' }, { status: 500 });
    }
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, subjectId: true, totalMarks: true, createdBy: { select: { userId: true } } }
  });
  if (!exam) {
    return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
  }

  if (Number(marksObtained) > Number(exam.totalMarks)) {
    return NextResponse.json({ error: `Obtained marks must be between 0 and ${exam.totalMarks}.` }, { status: 400 });
  }

  if (auth.session.role === UserRole.TEACHER && exam.createdBy.userId !== auth.session.id) {
    return NextResponse.json({ error: 'You can only save results for your own exams.' }, { status: 403 });
  }

  const result = await prisma.result.upsert({
    where: { examId_studentId: { examId, studentId } },
    update: { marksObtained, grade, remarks, subjectId: subjectId || exam.subjectId },
    create: { examId, studentId, subjectId: subjectId || exam.subjectId, marksObtained, grade, remarks }
  });

  return NextResponse.json(result, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get('id') ?? '').trim();
  if (!id) {
    return NextResponse.json({ error: 'Result id is required.' }, { status: 400 });
  }

  const existing = await prisma.result.findUnique({
    where: { id },
    select: { id: true, exam: { select: { createdBy: { select: { userId: true } } } } }
  });
  if (!existing) {
    return NextResponse.json({ error: 'Result not found.' }, { status: 404 });
  }

  if (auth.session.role === UserRole.TEACHER && existing.exam.createdBy.userId !== auth.session.id) {
    return NextResponse.json({ error: 'You can only delete results of your own exams.' }, { status: 403 });
  }

  await prisma.result.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
