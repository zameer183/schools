import { UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { hasTeacherAccessByUserId } from '@/lib/teacher-access';

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

function makeSubjectCode(base: string, classId: string) {
  const normalized = base
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 10) || 'GENERAL';
  const stamp = `${Date.now()}`.slice(-6);
  return `${normalized}-${classId.slice(-4).toUpperCase()}-${stamp}`;
}

function isLocalRestFallbackEnabled() {
  return process.env.FORCE_SUPABASE_REST_DATA_FALLBACK === '1';
}

function inFilter(ids: string[]) {
  return `in.(${ids.join(',')})`;
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

async function getTeacherForExamViaRest(userId: string) {
  const [teacher] = await supabaseRest<{ id: string; userId: string }>('Teacher', {
    select: 'id,userId',
    userId: `eq.${userId}`,
    limit: '1'
  });
  if (!teacher) return null;
  const classLinks = await supabaseRest<{ classId: string }>('TeacherClass', {
    select: 'classId',
    teacherId: `eq.${teacher.id}`
  });
  return {
    ...teacher,
    classAssignments: classLinks
  };
}

async function resolveSubjectIdForExamViaRest({
  classId,
  subjectIdRaw,
  subjectNameRaw,
  teacherId
}: {
  classId: string;
  subjectIdRaw: string;
  subjectNameRaw: string;
  teacherId: string;
}) {
  const subjectId = subjectIdRaw.trim();
  const subjectName = subjectNameRaw.trim();

  if (subjectId) {
    const [existing] = await supabaseRest<{ id: string; classId: string; teacherId: string | null }>('Subject', {
      select: 'id,classId,teacherId',
      id: `eq.${subjectId}`,
      limit: '1'
    });
    if (!existing || existing.classId !== classId) {
      return { error: 'Selected subject is invalid for this class.', subjectId: null as string | null };
    }
    if (existing.teacherId && existing.teacherId !== teacherId) {
      return { error: 'You can only use allowed subjects in your class.', subjectId: null as string | null };
    }
    return { error: null as string | null, subjectId: existing.id };
  }

  if (subjectName) {
    const [byName] = await supabaseRest<{ id: string; teacherId: string | null }>('Subject', {
      select: 'id,teacherId',
      classId: `eq.${classId}`,
      name: `ilike.${subjectName}`,
      limit: '1'
    });
    if (byName) {
      if (byName.teacherId && byName.teacherId !== teacherId) {
        return { error: 'You can only use allowed subjects in your class.', subjectId: null as string | null };
      }
      return { error: null as string | null, subjectId: byName.id };
    }

    const [created] = await supabaseRest<{ id: string }>('Subject', {
      select: 'id'
    }, {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        id: randomUUID(),
        name: subjectName,
        code: makeSubjectCode(subjectName, classId),
        classId,
        teacherId
      }
    });
    return { error: null as string | null, subjectId: created?.id ?? null };
  }

  const [general] = await supabaseRest<{ id: string }>('Subject', {
    select: 'id',
    classId: `eq.${classId}`,
    name: 'ilike.General',
    limit: '1'
  });
  if (general) return { error: null as string | null, subjectId: general.id };

  const [createdGeneral] = await supabaseRest<{ id: string }>('Subject', {
    select: 'id'
  }, {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      id: randomUUID(),
      name: 'General',
      code: makeSubjectCode('General', classId),
      classId,
      teacherId
    }
  });
  return { error: null as string | null, subjectId: createdGeneral?.id ?? null };
}

async function resolveSubjectIdForExam({
  classId,
  subjectIdRaw,
  subjectNameRaw,
  teacherId,
  enforceTeacherScope
}: {
  classId: string;
  subjectIdRaw: string;
  subjectNameRaw: string;
  teacherId: string;
  enforceTeacherScope: boolean;
}) {
  const subjectId = subjectIdRaw.trim();
  const subjectName = subjectNameRaw.trim();

  if (subjectId) {
    const existing = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, classId: true, teacherId: true }
    });
    if (!existing || existing.classId !== classId) {
      return { error: 'Selected subject is invalid for this class.', subjectId: null as string | null };
    }
    if (enforceTeacherScope && existing.teacherId && existing.teacherId !== teacherId) {
      return { error: 'You can only use allowed subjects in your class.', subjectId: null as string | null };
    }
    return { error: null as string | null, subjectId: existing.id };
  }

  if (subjectName) {
    const byName = await prisma.subject.findFirst({
      where: { classId, name: { equals: subjectName, mode: 'insensitive' } },
      select: { id: true, teacherId: true }
    });
    if (byName) {
      if (enforceTeacherScope && byName.teacherId && byName.teacherId !== teacherId) {
        return { error: 'You can only use allowed subjects in your class.', subjectId: null as string | null };
      }
      return { error: null as string | null, subjectId: byName.id };
    }
    const created = await prisma.subject.create({
      data: {
        name: subjectName,
        code: makeSubjectCode(subjectName, classId),
        classId,
        teacherId: teacherId || null
      },
      select: { id: true }
    });
    return { error: null as string | null, subjectId: created.id };
  }

  const general = await prisma.subject.findFirst({
    where: { classId, name: { equals: 'General', mode: 'insensitive' } },
    select: { id: true }
  });
  if (general) return { error: null as string | null, subjectId: general.id };

  const createdGeneral = await prisma.subject.create({
    data: {
      name: 'General',
      code: makeSubjectCode('General', classId),
      classId,
      teacherId: teacherId || null
    },
    select: { id: true }
  });
  return { error: null as string | null, subjectId: createdGeneral.id };
}

export async function GET() {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
  if (!auth.authorized) return auth.response;

  if (isLocalRestFallbackEnabled() && auth.session.role === UserRole.TEACHER) {
    const teacher = await getTeacherForExamViaRest(auth.session.id);
    if (!teacher) return NextResponse.json([]);
    const classIds = teacher.classAssignments.map((item) => item.classId);
    if (!classIds.length) return NextResponse.json([]);

    const exams = await supabaseRest<Array<Record<string, unknown>> extends Array<infer T> ? T : never>('Exam', {
      select: 'id,title,classId,subjectId,examDate,totalMarks,passingMarks,createdById',
      classId: inFilter(classIds),
      order: 'examDate.desc'
    });
    return NextResponse.json(exams.map((exam) => {
      const parsed = parseExamTitle(String(exam.title ?? ''));
      return {
        ...exam,
        title: parsed.title,
        examType: parsed.examType,
        dueDate: exam.examDate,
        teacherName: auth.session.fullName ?? '-'
      };
    }));
  }

  if (auth.session.role === UserRole.TEACHER) {
    const canAccess = await hasTeacherAccessByUserId(auth.session.id, 'EXAMS');
    if (!canAccess) {
      return NextResponse.json({ error: 'Exams module access is disabled by admin.' }, { status: 403 });
    }
  }

  let whereClause = {};
  if (auth.session.role === UserRole.TEACHER) {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: auth.session.id },
      select: { id: true, classAssignments: { select: { classId: true } } }
    });
    if (!teacher) return NextResponse.json([]);
    const classIds = teacher.classAssignments.map((item) => item.classId);
    if (!classIds.length) return NextResponse.json([]);
    whereClause = { classId: { in: classIds } };
  }

  const exams = await prisma.exam.findMany({
    where: whereClause,
    include: { class: true, subject: true, createdBy: { include: { user: true } } },
    orderBy: { examDate: 'desc' }
  });

  return NextResponse.json(exams.map((exam) => normalizeExamResponse(exam)));
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;
  if (auth.session.role === UserRole.TEACHER && !isLocalRestFallbackEnabled()) {
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

  const title = String(payload.title ?? '').trim();
  const classId = String(payload.classId ?? '').trim();
  const subjectIdRaw = String(payload.subjectId ?? '').trim();
  const subjectNameRaw = String(payload.subjectName ?? '').trim();
  const dueDateRaw = String(payload.dueDate ?? payload.examDate ?? '').trim();
  const examTypeRaw = String(payload.examType ?? '').trim();
  const totalMarks = Number(payload.totalMarks ?? 0);
  const passingMarks = Number(payload.passingMarks ?? 0);
  const createdByTeacherIdRaw = String(payload.createdByTeacherId ?? '').trim();

  if (!title || !classId || !dueDateRaw) {
    return NextResponse.json({ error: 'Title, class, and due date are required.' }, { status: 400 });
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

  if (isLocalRestFallbackEnabled() && auth.session.role === UserRole.TEACHER) {
    try {
      const teacher = await getTeacherForExamViaRest(auth.session.id);
      if (!teacher) return NextResponse.json({ error: 'Teacher profile not found.' }, { status: 400 });

      const assignedClassIds = teacher.classAssignments.map((item) => item.classId);
      if (!assignedClassIds.includes(classId)) {
        return NextResponse.json({ error: 'You can only create exams for your assigned classes.' }, { status: 403 });
      }

      const resolved = await resolveSubjectIdForExamViaRest({
        classId,
        subjectIdRaw,
        subjectNameRaw,
        teacherId: teacher.id
      });
      if (resolved.error || !resolved.subjectId) {
        return NextResponse.json({ error: resolved.error ?? 'Unable to resolve subject.' }, { status: 403 });
      }

      const encodedTitle = encodeExamTitle(title, examType);
      const [duplicate] = await supabaseRest<{ id: string }>('Exam', {
        select: 'id',
        classId: `eq.${classId}`,
        subjectId: `eq.${resolved.subjectId}`,
        examDate: `eq.${dueDate.toISOString()}`,
        title: `eq.${encodedTitle}`,
        limit: '1'
      });
      if (duplicate) {
        return NextResponse.json({ error: 'An exam with same title/date/class/subject already exists.' }, { status: 409 });
      }

      const [exam] = await supabaseRest<{
        id: string;
        title: string;
        classId: string;
        subjectId: string;
        examDate: string;
        totalMarks: number;
        passingMarks: number;
        createdById: string;
      }>('Exam', { select: '*' }, {
        method: 'POST',
        prefer: 'return=representation',
        body: {
          id: randomUUID(),
          title: encodedTitle,
          classId,
          subjectId: resolved.subjectId,
          examDate: dueDate.toISOString(),
          totalMarks,
          passingMarks,
          createdById: teacher.id
        }
      });

      const [[cls], [subject], [user]] = await Promise.all([
        supabaseRest<{ id: string; name: string; section: string }>('Class', {
          select: 'id,name,section',
          id: `eq.${classId}`,
          limit: '1'
        }),
        supabaseRest<{ id: string; name: string }>('Subject', {
          select: 'id,name',
          id: `eq.${resolved.subjectId}`,
          limit: '1'
        }),
        supabaseRest<{ fullName: string }>('User', {
          select: 'fullName',
          id: `eq.${auth.session.id}`,
          limit: '1'
        })
      ]);

      return NextResponse.json({
        ...exam,
        title,
        examType,
        examDate: new Date(exam.examDate),
        dueDate: new Date(exam.examDate),
        class: cls ?? { id: classId, name: 'Class', section: '' },
        subject: subject ?? { id: resolved.subjectId, name: subjectNameRaw || 'General' },
        teacherName: user?.fullName ?? auth.session.fullName ?? '-'
      }, { status: 201 });
    } catch (error) {
      console.error('[api/exams][POST][rest-fallback]', error);
      return NextResponse.json({ error: 'Unable to create exam.' }, { status: 500 });
    }
  }

  let createdByTeacherId = '';
  let resolvedSubjectId = '';
  if (auth.session.role === UserRole.TEACHER) {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: auth.session.id },
      select: { id: true, classAssignments: { select: { classId: true } } }
    });
    if (!teacher) return NextResponse.json({ error: 'Teacher profile not found.' }, { status: 400 });
    const assignedClassIds = teacher.classAssignments.map((item) => item.classId);
    if (!assignedClassIds.includes(classId)) {
      return NextResponse.json({ error: 'You can only create exams for your assigned classes.' }, { status: 403 });
    }
    createdByTeacherId = teacher.id;
    const resolved = await resolveSubjectIdForExam({
      classId,
      subjectIdRaw,
      subjectNameRaw,
      teacherId: teacher.id,
      enforceTeacherScope: true
    });
    if (resolved.error || !resolved.subjectId) {
      return NextResponse.json({ error: resolved.error ?? 'Unable to resolve subject.' }, { status: 403 });
    }
    resolvedSubjectId = resolved.subjectId;
  } else {
    if (!createdByTeacherIdRaw) {
      return NextResponse.json({ error: 'Select teacher name who is adding this exam.' }, { status: 400 });
    }
    const teacher = await prisma.teacher.findUnique({ where: { id: createdByTeacherIdRaw }, select: { id: true } });
    if (!teacher) return NextResponse.json({ error: 'Selected teacher was not found.' }, { status: 404 });
    createdByTeacherId = teacher.id;
    const resolved = await resolveSubjectIdForExam({
      classId,
      subjectIdRaw,
      subjectNameRaw,
      teacherId: teacher.id,
      enforceTeacherScope: false
    });
    if (resolved.error || !resolved.subjectId) {
      return NextResponse.json({ error: resolved.error ?? 'Unable to resolve subject.' }, { status: 400 });
    }
    resolvedSubjectId = resolved.subjectId;
  }

  const duplicate = await prisma.exam.findFirst({
    where: {
      classId,
      subjectId: resolvedSubjectId,
      examDate: dueDate,
      title: encodeExamTitle(title, examType)
    },
    select: { id: true }
  });
  if (duplicate) {
    return NextResponse.json({ error: 'An exam with same title/date/class/subject already exists.' }, { status: 409 });
  }

  const exam = await prisma.exam.create({
    data: {
      title: encodeExamTitle(title, examType),
      classId,
      subjectId: resolvedSubjectId,
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

  const id = String(payload.id ?? '').trim();
  const title = String(payload.title ?? '').trim();
  const classId = String(payload.classId ?? '').trim();
  const subjectIdRaw = String(payload.subjectId ?? '').trim();
  const subjectNameRaw = String(payload.subjectName ?? '').trim();
  const dueDateRaw = String(payload.dueDate ?? payload.examDate ?? '').trim();
  const examTypeRaw = String(payload.examType ?? '').trim();
  const totalMarks = Number(payload.totalMarks ?? 0);
  const passingMarks = Number(payload.passingMarks ?? 0);
  const createdByTeacherIdRaw = String(payload.createdByTeacherId ?? '').trim();

  if (!id || !title || !classId || !dueDateRaw) {
    return NextResponse.json({ error: 'Exam id, title, class, and due date are required.' }, { status: 400 });
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
  let resolvedSubjectId = subjectIdRaw;
  if (auth.session.role === UserRole.ADMIN) {
    if (createdByTeacherIdRaw) {
      const teacher = await prisma.teacher.findUnique({ where: { id: createdByTeacherIdRaw }, select: { id: true } });
      if (!teacher) return NextResponse.json({ error: 'Selected teacher was not found.' }, { status: 404 });
      createdByTeacherId = teacher.id;
    }
    const resolved = await resolveSubjectIdForExam({
      classId,
      subjectIdRaw,
      subjectNameRaw,
      teacherId: createdByTeacherId,
      enforceTeacherScope: false
    });
    if (resolved.error || !resolved.subjectId) {
      return NextResponse.json({ error: resolved.error ?? 'Unable to resolve subject.' }, { status: 400 });
    }
    resolvedSubjectId = resolved.subjectId;
  } else {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: auth.session.id },
      select: { id: true, classAssignments: { select: { classId: true } } }
    });
    if (!teacher) return NextResponse.json({ error: 'Teacher profile not found.' }, { status: 400 });
    const assignedClassIds = teacher.classAssignments.map((item) => item.classId);
    if (!assignedClassIds.includes(classId)) {
      return NextResponse.json({ error: 'You can only update exams for your assigned classes.' }, { status: 403 });
    }
    if (existing.createdById !== teacher.id) {
      return NextResponse.json({ error: 'You can only update your own exams.' }, { status: 403 });
    }
    createdByTeacherId = teacher.id;
    const resolved = await resolveSubjectIdForExam({
      classId,
      subjectIdRaw,
      subjectNameRaw,
      teacherId: teacher.id,
      enforceTeacherScope: true
    });
    if (resolved.error || !resolved.subjectId) {
      return NextResponse.json({ error: resolved.error ?? 'Unable to resolve subject.' }, { status: 403 });
    }
    resolvedSubjectId = resolved.subjectId;
  }

  const duplicate = await prisma.exam.findFirst({
    where: {
      id: { not: id },
      classId,
      subjectId: resolvedSubjectId,
      examDate: dueDate,
      title: encodeExamTitle(title, examType)
    },
    select: { id: true }
  });
  if (duplicate) {
    return NextResponse.json({ error: 'An exam with same title/date/class/subject already exists.' }, { status: 409 });
  }

  const exam = await prisma.exam.update({
    where: { id },
    data: {
      title: encodeExamTitle(title, examType),
      classId,
      subjectId: resolvedSubjectId,
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
  if (auth.session.role === UserRole.TEACHER && !isLocalRestFallbackEnabled()) {
    const canAccess = await hasTeacherAccessByUserId(auth.session.id, 'EXAMS');
    if (!canAccess) {
      return NextResponse.json({ error: 'Exams module access is disabled by admin.' }, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const force = searchParams.get('force') === '1';
  if (!id) return NextResponse.json({ error: 'Exam id is required.' }, { status: 400 });

  if (isLocalRestFallbackEnabled()) {
    try {
      const [exam] = await supabaseRest<{ id: string; createdById: string }>('Exam', {
        select: 'id,createdById',
        id: `eq.${id}`,
        limit: '1'
      });
      if (!exam) return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });

      if (auth.session.role === UserRole.TEACHER) {
        const teacher = await getTeacherForExamViaRest(auth.session.id);
        if (!teacher || teacher.id !== exam.createdById) {
          return NextResponse.json({ error: 'You can only delete your own exams.' }, { status: 403 });
        }
      }

      const results = await supabaseRest<{ id: string }>('Result', {
        select: 'id',
        examId: `eq.${id}`,
        limit: '1'
      });
      if (results.length > 0 && !force) {
        return NextResponse.json({ error: 'Cannot delete exam with existing results.' }, { status: 409 });
      }

      if (results.length > 0) {
        await supabaseRest('Result', { examId: `eq.${id}` }, { method: 'DELETE' });
      }
      await supabaseRest('Exam', { id: `eq.${id}` }, { method: 'DELETE' });
      return NextResponse.json({ ok: true, forceDeleted: results.length > 0 });
    } catch (error) {
      console.error('[api/exams][DELETE][rest-fallback]', error);
      return NextResponse.json({ error: 'Unable to delete exam.' }, { status: 500 });
    }
  }

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
    if (!force) {
      return NextResponse.json({ error: 'Cannot delete exam with existing results.' }, { status: 409 });
    }
    if (auth.session.role === UserRole.TEACHER) {
      const teacher = await prisma.teacher.findFirst({ where: { userId: auth.session.id }, select: { id: true } });
      if (!teacher || teacher.id !== exam.createdById) {
        return NextResponse.json({ error: 'You can only force delete your own exams.' }, { status: 403 });
      }
    }
    await prisma.$transaction([
      prisma.result.deleteMany({ where: { examId: id } }),
      prisma.exam.delete({ where: { id } })
    ]);
    return NextResponse.json({ ok: true, forceDeleted: true });
  }

  await prisma.exam.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
