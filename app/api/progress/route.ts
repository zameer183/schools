import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { hasTeacherAccessByUserId } from '@/lib/teacher-access';
import { progressCreateSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate');
  return response;
}

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

function inFilter(ids: string[]) {
  return `in.(${ids.join(',')})`;
}

async function getTeacherScopeViaRest(userId: string) {
  const [teacher] = await supabaseRest<{ id: string }>('Teacher', {
    select: 'id',
    userId: `eq.${userId}`,
    limit: '1'
  });
  if (!teacher) return null;

  const [classLinks, subjects] = await Promise.all([
    supabaseRest<{ classId: string }>('TeacherClass', {
      select: 'classId',
      teacherId: `eq.${teacher.id}`
    }),
    supabaseRest<{ classId: string }>('Subject', {
      select: 'classId',
      teacherId: `eq.${teacher.id}`
    })
  ]);

  return {
    teacherId: teacher.id,
    classIds: Array.from(new Set([...classLinks.map((item) => item.classId), ...subjects.map((item) => item.classId)]))
  };
}

async function getProgressViaRest({
  auth,
  classId,
  studentId,
  date
}: {
  auth: { session: { id: string; role: UserRole } };
  classId?: string;
  studentId?: string;
  date?: string;
}) {
  const params: Record<string, string> = {
    select: 'id,date,classId,studentId,teacherId,lessonType,juzzNumber,lessonNumber,ayahFrom,ayahTo,tajweeditotal,hifzTotal,notes,createdAt,updatedAt',
    order: 'date.desc'
  };

  if (classId) params.classId = `eq.${classId}`;
  if (studentId) params.studentId = `eq.${studentId}`;
  if (date) params.date = `eq.${new Date(date).toISOString()}`;

  if (auth.session.role === UserRole.TEACHER) {
    const scope = await getTeacherScopeViaRest(auth.session.id);
    if (!scope) return { error: jsonNoStore({ error: 'Teacher profile missing' }, { status: 400 }), records: [] };
    params.teacherId = `eq.${scope.teacherId}`;
    if (!classId && scope.classIds.length) params.classId = inFilter(scope.classIds);
    if (!classId && !scope.classIds.length) return { records: [] };
  }

  const records = await supabaseRest<Array<Record<string, unknown>> extends Array<infer T> ? T : never>('StudentProgress', params);
  const studentIds = Array.from(new Set(records.map((item) => String(item.studentId ?? '')).filter(Boolean)));
  const classIds = Array.from(new Set(records.map((item) => String(item.classId ?? '')).filter(Boolean)));
  const teacherIds = Array.from(new Set(records.map((item) => String(item.teacherId ?? '')).filter(Boolean)));

  const [students, classes, teachers] = await Promise.all([
    studentIds.length
      ? supabaseRest<Array<Record<string, unknown>> extends Array<infer T> ? T : never>('Student', {
          select: 'id,userId,admissionNo',
          id: inFilter(studentIds)
        })
      : Promise.resolve([]),
    classIds.length
      ? supabaseRest<Array<Record<string, unknown>> extends Array<infer T> ? T : never>('Class', {
          select: 'id,name,section',
          id: inFilter(classIds)
        })
      : Promise.resolve([]),
    teacherIds.length
      ? supabaseRest<Array<Record<string, unknown>> extends Array<infer T> ? T : never>('Teacher', {
          select: 'id,userId',
          id: inFilter(teacherIds)
        })
      : Promise.resolve([])
  ]);

  const userIds = Array.from(new Set([
    ...students.map((item) => String(item.userId ?? '')),
    ...teachers.map((item) => String(item.userId ?? ''))
  ].filter(Boolean)));
  const users = userIds.length
    ? await supabaseRest<Array<Record<string, unknown>> extends Array<infer T> ? T : never>('User', {
        select: 'id,fullName,email',
        id: inFilter(userIds)
      })
    : [];

  const studentById = new Map(students.map((item) => [String(item.id), item]));
  const classById = new Map(classes.map((item) => [String(item.id), item]));
  const teacherById = new Map(teachers.map((item) => [String(item.id), item]));
  const userById = new Map(users.map((item) => [String(item.id), item]));

  return {
    records: records.map((item) => {
      const student = studentById.get(String(item.studentId));
      const cls = classById.get(String(item.classId));
      const teacher = teacherById.get(String(item.teacherId));
      const studentUser = student ? userById.get(String(student.userId)) : undefined;
      const teacherUser = teacher ? userById.get(String(teacher.userId)) : undefined;
      return {
        ...item,
        student: {
          ...(student ?? { id: item.studentId, admissionNo: '' }),
          user: {
            fullName: String(studentUser?.fullName ?? 'Unknown Student'),
            email: String(studentUser?.email ?? '')
          }
        },
        class: cls ?? { id: item.classId, name: 'Unknown Class', section: '' },
        teacher: {
          ...(teacher ?? { id: item.teacherId }),
          user: { fullName: String(teacherUser?.fullName ?? 'Teacher') }
        }
      };
    })
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

  if (isLocalRestFallbackEnabled()) {
    try {
      const result = await getProgressViaRest({ auth, classId, studentId, date });
      if (result.error) return result.error;
      return jsonNoStore(result.records);
    } catch (error) {
      console.error('[api/progress][GET][rest-fallback]', error);
      return jsonNoStore([]);
    }
  }

  if (auth.session.role === UserRole.TEACHER) {
    const scope = await getTeacherScope(auth.session.id);
    if (!scope) return jsonNoStore({ error: 'Teacher profile missing' }, { status: 400 });

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

    return jsonNoStore(records);
  }

  if (auth.session.role === UserRole.STUDENT) {
    const student = await prisma.student.findUnique({ where: { userId: auth.session.id }, select: { id: true } });
    if (!student) return jsonNoStore([]);

    const records = await prisma.studentProgress.findMany({
      where: { studentId: student.id, date: date ? new Date(date) : undefined },
      include: { class: true, teacher: { include: { user: true } } },
      orderBy: { date: 'desc' }
    });

    return jsonNoStore(records);
  }

  if (auth.session.role === UserRole.PARENT) {
    const parent = await prisma.parent.findUnique({
      where: { userId: auth.session.id },
      select: { children: { select: { studentId: true } } }
    });
    if (!parent) return jsonNoStore([]);
    const childIds = parent.children.map((c) => c.studentId);
    const effectiveStudentId = studentId && childIds.includes(studentId) ? studentId : undefined;
    const studentFilter = effectiveStudentId ? { studentId: effectiveStudentId } : { studentId: { in: childIds } };
    const records = await prisma.studentProgress.findMany({
      where: { ...studentFilter, date: date ? new Date(date) : undefined },
      include: { student: { include: { user: true } }, class: true, teacher: { include: { user: true } } },
      orderBy: { date: 'desc' }
    });
    return jsonNoStore(records);
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

  return jsonNoStore(records);
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
    return jsonNoStore({ error: firstIssue, details: parsed.error.flatten() }, { status: 400 });
  }

  if (isLocalRestFallbackEnabled()) {
    try {
      let teacherId = '';

      if (auth.session.role === UserRole.TEACHER) {
        const scope = await getTeacherScopeViaRest(auth.session.id);
        if (!scope) return jsonNoStore({ error: 'Teacher profile missing' }, { status: 400 });
        if (!scope.classIds.includes(parsed.data.classId)) {
          return jsonNoStore({ error: 'You can only add progress for your assigned classes.' }, { status: 403 });
        }
        teacherId = scope.teacherId;
      } else {
        const [anyTeacher] = await supabaseRest<{ id: string }>('Teacher', { select: 'id', limit: '1' });
        if (!anyTeacher) return jsonNoStore({ error: 'No teacher profile found to map progress.' }, { status: 400 });
        teacherId = anyTeacher.id;
      }

      const [student] = await supabaseRest<{ id: string; classId: string; userId: string }>('Student', {
        select: 'id,classId,userId',
        id: `eq.${parsed.data.studentId}`,
        limit: '1'
      });
      if (!student || student.classId !== parsed.data.classId) {
        return jsonNoStore({ error: 'Student does not belong to selected class.' }, { status: 400 });
      }

      const progressDate = new Date(parsed.data.date).toISOString();
      const baseBody = {
        classId: parsed.data.classId,
        studentId: parsed.data.studentId,
        teacherId,
        date: progressDate,
        lessonType: parsed.data.lessonType,
        juzzNumber: parsed.data.juzzNumber ?? null,
        lessonNumber: parsed.data.lessonNumber,
        ayahFrom: parsed.data.ayahFrom ?? null,
        ayahTo: parsed.data.ayahTo ?? null,
        tajweeditotal: parsed.data.tajweeditotal ?? null,
        hifzTotal: parsed.data.hifzTotal ?? null,
        notes: parsed.data.notes || null,
        updatedAt: new Date().toISOString()
      };

      const [existing] = await supabaseRest<{ id: string }>('StudentProgress', {
        select: 'id',
        studentId: `eq.${parsed.data.studentId}`,
        date: `eq.${progressDate}`,
        limit: '1'
      });

      const progressRows = existing
        ? await supabaseRest('StudentProgress', { select: '*', id: `eq.${existing.id}` }, {
            method: 'PATCH',
            prefer: 'return=representation',
            body: baseBody
          })
        : await supabaseRest('StudentProgress', { select: '*' }, {
            method: 'POST',
            prefer: 'return=representation',
            body: { id: crypto.randomUUID(), ...baseBody, createdAt: new Date().toISOString() }
          });

      await supabaseRest('Notification', { select: 'id' }, {
        method: 'POST',
        prefer: 'return=minimal',
        body: {
          id: crypto.randomUUID(),
          userId: student.userId,
          title: 'Daily Progress Report Updated',
          body: `A new progress report has been submitted for ${parsed.data.date}.`,
          type: 'ACADEMIC',
          isRead: false,
          createdAt: new Date().toISOString()
        }
      }).catch((error) => {
        console.error('[api/progress][POST][rest-fallback][notification]', error);
      });

      return jsonNoStore(progressRows[0] ?? { ok: true }, { status: 201 });
    } catch (error) {
      console.error('[api/progress][POST][rest-fallback]', error);
      return jsonNoStore({ error: 'Unable to save report.' }, { status: 500 });
    }
  }

  let teacherId = '';

  if (auth.session.role === UserRole.TEACHER) {
    const scope = await getTeacherScope(auth.session.id);
    if (!scope) return jsonNoStore({ error: 'Teacher profile missing' }, { status: 400 });

    if (!scope.classIds.includes(parsed.data.classId)) {
      return jsonNoStore({ error: 'You can only add progress for your assigned classes.' }, { status: 403 });
    }

    teacherId = scope.teacherId;
  } else {
    const anyTeacher = await prisma.teacher.findFirst({ select: { id: true } });
    if (!anyTeacher) return jsonNoStore({ error: 'No teacher profile found to map progress.' }, { status: 400 });
    teacherId = anyTeacher.id;
  }

  const student = await prisma.student.findUnique({ where: { id: parsed.data.studentId }, select: { classId: true } });
  if (!student || student.classId !== parsed.data.classId) {
    return jsonNoStore({ error: 'Student does not belong to selected class.' }, { status: 400 });
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

  return jsonNoStore(progress, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get('id') ?? '').trim();
  if (!id) {
    return NextResponse.json({ error: 'Progress report id is required.' }, { status: 400 });
  }

  if (isLocalRestFallbackEnabled()) {
    try {
      const [existing] = await supabaseRest<{ id: string; teacherId: string }>('StudentProgress', {
        select: 'id,teacherId',
        id: `eq.${id}`,
        limit: '1'
      });
      if (!existing) {
        return NextResponse.json({ error: 'Progress report not found.' }, { status: 404 });
      }

      if (auth.session.role === UserRole.TEACHER) {
        const teacherId = await getTeacherIdViaRest(auth.session.id);
        if (!teacherId || teacherId !== existing.teacherId) {
          return NextResponse.json({ error: 'You can only delete your own progress reports.' }, { status: 403 });
        }
      }

      await supabaseRest('SurahRange', { progressId: `eq.${id}` }, { method: 'DELETE' });
      await supabaseRest('StudentProgress', { id: `eq.${id}` }, { method: 'DELETE' });
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error('[api/progress][DELETE][rest-fallback]', error);
      return NextResponse.json({ error: 'Unable to delete progress report.' }, { status: 500 });
    }
  }

  if (auth.session.role === UserRole.TEACHER) {
    const canAccess = await hasTeacherAccessByUserId(auth.session.id, 'PROGRESS');
    if (!canAccess) {
      return NextResponse.json({ error: 'Progress module access is disabled by admin.' }, { status: 403 });
    }
  }

  const existing = await prisma.studentProgress.findUnique({
    where: { id },
    select: { id: true, teacher: { select: { userId: true } } }
  });
  if (!existing) {
    return NextResponse.json({ error: 'Progress report not found.' }, { status: 404 });
  }

  if (auth.session.role === UserRole.TEACHER && existing.teacher.userId !== auth.session.id) {
    return NextResponse.json({ error: 'You can only delete your own progress reports.' }, { status: 403 });
  }

  await prisma.studentProgress.delete({ where: { id } });
  revalidatePath('/teacher/progress');
  revalidatePath('/student/progress');
  return NextResponse.json({ ok: true });
}
