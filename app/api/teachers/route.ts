import { hash } from 'bcryptjs';
import { Prisma, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { TEACHER_ACCESS_MODULES, upsertTeacherAccess, upsertTeacherCompensation } from '@/lib/teacher-access';

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return response;
}

function normalizeEmployeeCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function generateEmployeeCode(fullName: string): string {
  const initials = fullName
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 4) || 'EMP';
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `EMP-${initials}-${randomSuffix}`;
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

function inFilter(ids: string[]) {
  return `in.(${ids.join(',')})`;
}

const DEFAULT_ACCESS_LEVELS = TEACHER_ACCESS_MODULES.reduce((acc, moduleKey) => {
  acc[moduleKey] = moduleKey === 'FEES' ? 'NONE' : 'FULL';
  return acc;
}, {} as Record<string, 'NONE' | 'VIEW' | 'MANAGE' | 'FULL'>);

function asAccessLevel(value: string | null | undefined, enabled: boolean) {
  if (value === 'NONE' || value === 'VIEW' || value === 'MANAGE' || value === 'FULL') return value;
  return enabled ? 'FULL' : 'NONE';
}

async function getTeacherUserIdViaRest(id: string) {
  const [teacher] = await supabaseRest<{ id: string; userId: string }>('Teacher', {
    select: 'id,userId',
    id: `eq.${id}`,
    limit: '1'
  });
  return teacher?.userId ?? null;
}

async function handlePutViaRest(body: Record<string, unknown>) {
  const {
    id, fullName, email, password, employeeCode,
    qualification, specialization, joiningDate,
    phone, isActive, baseSalary, bonus, deduction,
    access, classIds, shareCredentials: doShare,
  } = body;

  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const userId = await getTeacherUserIdViaRest(id);
  if (!userId) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });

  if (doShare === true) {
    if (!(typeof password === 'string' && password.length >= 6)) {
      return NextResponse.json({ error: 'Provide a new password (minimum 6 characters) before sharing credentials.' }, { status: 400 });
    }
    await supabaseRest('User', { id: `eq.${userId}` }, {
      method: 'PATCH',
      body: { passwordHash: await hash(password, 12) }
    });
    const [userRecord] = await supabaseRest<{ email: string; fullName: string; phone: string | null }>('User', {
      select: 'email,fullName,phone',
      id: `eq.${userId}`,
      limit: '1'
    });
    return jsonNoStore({
      credentials: {
        email: userRecord?.email ?? '',
        fullName: userRecord?.fullName ?? '',
        phone: userRecord?.phone ?? null,
        password
      }
    });
  }

  const userUpdate: Record<string, unknown> = {};
  if (fullName !== undefined) userUpdate.fullName = fullName;
  if (phone !== undefined) userUpdate.phone = phone === '' ? null : phone;
  if (isActive !== undefined) userUpdate.isActive = Boolean(isActive);
  if (email !== undefined && email !== '') userUpdate.email = email;
  if (typeof password === 'string' && password.length > 0) {
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }
    userUpdate.passwordHash = await hash(password, 12);
  }

  const teacherUpdate: Record<string, unknown> = {};
  if (employeeCode !== undefined) {
    const normalizedEmployeeCode = normalizeEmployeeCode(employeeCode);
    if (normalizedEmployeeCode) teacherUpdate.employeeCode = normalizedEmployeeCode;
  }
  if (qualification !== undefined) teacherUpdate.qualification = qualification === '' ? null : qualification;
  if (specialization !== undefined) teacherUpdate.specialization = specialization === '' ? null : specialization;
  if (joiningDate !== undefined) teacherUpdate.joiningDate = joiningDate || null;

  await Promise.all([
    Object.keys(userUpdate).length ? supabaseRest('User', { id: `eq.${userId}` }, { method: 'PATCH', body: userUpdate }) : Promise.resolve([]),
    Object.keys(teacherUpdate).length ? supabaseRest('Teacher', { id: `eq.${id}` }, { method: 'PATCH', body: teacherUpdate }) : Promise.resolve([])
  ]);

  if (Array.isArray(classIds)) {
    await supabaseRest('TeacherClass', { teacherId: `eq.${id}` }, { method: 'DELETE' });
    if (classIds.length > 0) {
      await supabaseRest('TeacherClass', {}, {
        method: 'POST',
        prefer: 'return=minimal',
        body: classIds.map((classId: string) => ({ teacherId: id, classId }))
      });
    }
  }

  if (baseSalary !== undefined || bonus !== undefined || deduction !== undefined) {
    await supabaseRest('TeacherCompensation', { teacherId: `eq.${id}` }, { method: 'DELETE' });
    await supabaseRest('TeacherCompensation', {}, {
      method: 'POST',
      prefer: 'return=minimal',
      body: {
        id: `comp_${id}`,
        teacherId: id,
        baseSalary: Number(baseSalary ?? 0),
        bonus: Number(bonus ?? 0),
        deduction: Number(deduction ?? 0)
      }
    });
  }

  if (access && typeof access === 'object') {
    const accessRecord = access as Record<string, unknown>;
    const rows = TEACHER_ACCESS_MODULES
      .filter((moduleKey) => moduleKey in accessRecord)
      .map((moduleKey) => {
        const rawLevel = String(accessRecord[moduleKey] ?? '').toUpperCase();
        const level = rawLevel === 'NONE' || rawLevel === 'VIEW' || rawLevel === 'MANAGE' || rawLevel === 'FULL'
          ? rawLevel
          : accessRecord[moduleKey] === false
            ? 'NONE'
            : 'FULL';
        return {
          id: `access_${id}_${moduleKey.toLowerCase()}`,
          teacherId: id,
          module: moduleKey,
          enabled: level !== 'NONE',
          level,
          updatedAt: new Date().toISOString()
        };
      });

    if (rows.length > 0) {
      await supabaseRest('TeacherAccess', { teacherId: `eq.${id}` }, { method: 'DELETE' });
      await supabaseRest('TeacherAccess', {}, {
        method: 'POST',
        prefer: 'return=minimal',
        body: rows
      });
    }
  }

  revalidatePath('/admin/teachers');
  revalidatePath(`/admin/teachers/${id}`);
  const [updated] = await supabaseRest('Teacher', { select: '*', id: `eq.${id}`, limit: '1' });
  return jsonNoStore(updated ?? { id });
}

export async function GET() {
  try {
    const auth = await ensureApiRole([UserRole.ADMIN]);
    if (!auth.authorized) return auth.response;

    if (isLocalRestFallbackEnabled()) {
      const teachers = await supabaseRest<Array<Record<string, unknown>> extends Array<infer T> ? T : never>('Teacher', {
        select: 'id,userId,employeeCode,qualification,specialization,joiningDate,createdAt',
        order: 'createdAt.desc'
      });
      const userIds = Array.from(new Set(teachers.map((teacher) => String(teacher.userId)).filter(Boolean)));
      const teacherIds = teachers.map((teacher) => String(teacher.id)).filter(Boolean);
      const users = userIds.length
        ? await supabaseRest<{ id: string; fullName: string; email: string; role: string; phone: string | null; isActive: boolean }>('User', {
            select: 'id,fullName,email,role,phone,isActive',
            id: inFilter(userIds)
          })
        : [];
      const [classes, classLinks, accessRows, compensationRows] = await Promise.all([
        supabaseRest<{ id: string; name: string; section: string }>('Class', {
          select: 'id,name,section',
          order: 'name.asc,section.asc'
        }),
        teacherIds.length
          ? supabaseRest<{ teacherId: string; classId: string; createdAt: string }>('TeacherClass', {
              select: 'teacherId,classId,createdAt',
              teacherId: inFilter(teacherIds),
              order: 'createdAt.asc'
            })
          : Promise.resolve([]),
        teacherIds.length
          ? supabaseRest<{ teacherId: string; module: string | null; enabled: boolean; level: string | null }>('TeacherAccess', {
              select: 'teacherId,module,enabled,level',
              teacherId: inFilter(teacherIds)
            })
          : Promise.resolve([]),
        teacherIds.length
          ? supabaseRest<{ teacherId: string; baseSalary: number | string; bonus: number | string; deduction: number | string }>('TeacherCompensation', {
              select: 'teacherId,baseSalary,bonus,deduction',
              teacherId: inFilter(teacherIds)
            })
          : Promise.resolve([])
      ]);
      const userMap = new Map(users.map((user) => [user.id, user]));
      const classMap = new Map(classes.map((cls) => [cls.id, cls]));
      const linksByTeacherId = new Map<string, Array<{ teacherId: string; classId: string; createdAt: string }>>();
      for (const link of classLinks) {
        linksByTeacherId.set(link.teacherId, [...(linksByTeacherId.get(link.teacherId) ?? []), link]);
      }
      const accessByTeacherId = new Map<string, Record<string, 'NONE' | 'VIEW' | 'MANAGE' | 'FULL'>>();
      for (const row of accessRows) {
        if (!row.module || !TEACHER_ACCESS_MODULES.includes(row.module as never)) continue;
        const current = accessByTeacherId.get(row.teacherId) ?? { ...DEFAULT_ACCESS_LEVELS };
        current[row.module] = asAccessLevel(row.level, row.enabled);
        accessByTeacherId.set(row.teacherId, current);
      }
      const compensationByTeacherId = new Map(compensationRows.map((row) => {
        const baseSalary = Number(row.baseSalary ?? 0);
        const bonus = Number(row.bonus ?? 0);
        const deduction = Number(row.deduction ?? 0);
        return [row.teacherId, { baseSalary, bonus, deduction, netSalary: baseSalary + bonus - deduction }];
      }));
      return jsonNoStore(teachers.map((teacher) => ({
        ...teacher,
        user: userMap.get(String(teacher.userId)),
        classAssignments: (linksByTeacherId.get(String(teacher.id)) ?? []).map((link) => ({
          classId: link.classId,
          class: classMap.get(link.classId) ?? { id: link.classId, name: 'Unknown Class', section: '' }
        })),
        access: accessByTeacherId.get(String(teacher.id)) ?? { ...DEFAULT_ACCESS_LEVELS },
        compensation: compensationByTeacherId.get(String(teacher.id)) ?? { baseSalary: 0, bonus: 0, deduction: 0, netSalary: 0 }
      })).filter((teacher) => teacher.user));
    }

    const teachers = await prisma.teacher.findMany({
      include: { classAssignments: { include: { class: true } } },
    });
    const userIds = Array.from(new Set(teachers.map((t) => t.userId)));
    const users = userIds.length
      ? await prisma.user.findMany({
          where: {
            id: { in: userIds },
            email: { not: { startsWith: 'shots_' } },
          },
          select: { id: true, fullName: true, email: true, role: true, phone: true, isActive: true, createdAt: true, updatedAt: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const safeTeachers = teachers
      .filter((teacher) => userMap.has(teacher.userId))
      .map((teacher) => ({
        ...teacher,
        user: userMap.get(teacher.userId)!,
      }));

    return jsonNoStore(safeTeachers);
  } catch (error) {
    console.error('[api/teachers][GET]', error);
    return jsonNoStore([]);
  }
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const {
    email, fullName, password, employeeCode,
    qualification, specialization, joiningDate,
    phone, isActive, baseSalary, bonus, deduction,
    classIds, classId, access,
  } = await request.json();

  if (!email || !fullName || !password) {
    return NextResponse.json(
      { error: 'email, fullName, password are required' },
      { status: 400 }
    );
  }

  const resolvedEmployeeCode = normalizeEmployeeCode(employeeCode) ?? generateEmployeeCode(fullName);
  const resolvedClassIds: string[] = Array.isArray(classIds) ? classIds : classId ? [classId] : [];

  try {
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          fullName,
          role: UserRole.TEACHER,
          phone: phone || null,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          passwordHash: await hash(password, 12),
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          userId: user.id,
          employeeCode: resolvedEmployeeCode,
          qualification: qualification || null,
          specialization: specialization || null,
          joiningDate: joiningDate ? new Date(joiningDate) : null,
        },
        include: { user: true },
      });

      if (resolvedClassIds.length > 0) {
        await tx.teacherClass.createMany({
          data: resolvedClassIds.map((cId: string) => ({ teacherId: teacher.id, classId: cId })),
        });
      }

      return teacher;
    });

    if (baseSalary !== undefined || bonus !== undefined || deduction !== undefined) {
      await upsertTeacherCompensation(created.id, {
        baseSalary: Number(baseSalary ?? 0),
        bonus: Number(bonus ?? 0),
        deduction: Number(deduction ?? 0),
      });
    }

    if (access && typeof access === 'object') {
      await upsertTeacherAccess(created.id, access as Record<string, boolean>);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Email or employee code already exists.' }, { status: 409 });
      }
      if (error.code === 'P2003') {
        return NextResponse.json({ error: 'Selected class is invalid.' }, { status: 400 });
      }
    }
    console.error('[teachers/post]', error);
    return NextResponse.json({ error: 'Unable to create teacher.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const body = await request.json();
  if (isLocalRestFallbackEnabled()) {
    try {
      return await handlePutViaRest(body as Record<string, unknown>);
    } catch (error) {
      console.error('[teachers/put][rest-fallback]', error);
      return NextResponse.json({ error: 'Unable to update teacher.' }, { status: 500 });
    }
  }

  const {
    id, fullName, email, password, employeeCode,
    qualification, specialization, joiningDate,
    phone, isActive, baseSalary, bonus, deduction,
    access, classIds, shareCredentials: doShare,
  } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });

  if (doShare === true) {
    if (!(typeof password === 'string' && password.length >= 6)) {
      return NextResponse.json(
        { error: 'Provide a new password (minimum 6 characters) before sharing credentials.' },
        { status: 400 }
      );
    }
    const rawPassword = password;
    const hashed = await hash(rawPassword, 12);
    await prisma.user.update({ where: { id: teacher.userId }, data: { passwordHash: hashed } });
    const userRecord = await prisma.user.findUnique({
      where: { id: teacher.userId },
      select: { email: true, fullName: true, phone: true },
    });
    return NextResponse.json({
      credentials: {
        email: userRecord?.email ?? '',
        fullName: userRecord?.fullName ?? '',
        phone: userRecord?.phone ?? null,
        password: rawPassword,
      },
    });
  }

  try {
    const userUpdate: Record<string, unknown> = {};
    if (fullName !== undefined) userUpdate.fullName = fullName;
    if (phone !== undefined) userUpdate.phone = phone === '' ? null : phone;
    if (isActive !== undefined) userUpdate.isActive = Boolean(isActive);
    if (email !== undefined && email !== '') {
      const existing = await prisma.user.findFirst({
        where: { email, NOT: { id: teacher.userId } },
        select: { id: true },
      });
      if (existing) return NextResponse.json({ error: 'Email already in use.' }, { status: 409 });
      userUpdate.email = email;
    }
    if (typeof password === 'string' && password.length > 0) {
      if (password.length < 6)
        return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
      userUpdate.passwordHash = await hash(password, 12);
    }

    const teacherUpdate: Record<string, unknown> = {};
    if (employeeCode !== undefined) {
      const normalizedEmployeeCode = normalizeEmployeeCode(employeeCode);
      if (normalizedEmployeeCode) teacherUpdate.employeeCode = normalizedEmployeeCode;
    }
    if (qualification !== undefined) teacherUpdate.qualification = qualification === '' ? null : qualification;
    if (specialization !== undefined) teacherUpdate.specialization = specialization === '' ? null : specialization;
    if (joiningDate !== undefined) teacherUpdate.joiningDate = joiningDate ? new Date(joiningDate) : null;

    await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdate).length > 0)
        await tx.user.update({ where: { id: teacher.userId }, data: userUpdate });
      if (Object.keys(teacherUpdate).length > 0)
        await tx.teacher.update({ where: { id }, data: teacherUpdate });
      if (Array.isArray(classIds)) {
        await tx.teacherClass.deleteMany({ where: { teacherId: id } });
        if (classIds.length > 0) {
          await tx.teacherClass.createMany({
            data: classIds.map((classId: string) => ({ teacherId: id, classId })),
          });
        }
      }
    });

    if (baseSalary !== undefined || bonus !== undefined || deduction !== undefined) {
      await upsertTeacherCompensation(id, {
        baseSalary: Number(baseSalary ?? 0),
        bonus: Number(bonus ?? 0),
        deduction: Number(deduction ?? 0),
      });
    }

    if (access && typeof access === 'object') {
      await upsertTeacherAccess(id, access as Record<string, boolean>);
    }

    const updated = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true, classAssignments: { include: { class: true } } },
    });

    revalidatePath('/admin/teachers');
    revalidatePath(`/admin/teachers/${id}`);
    return jsonNoStore(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        return NextResponse.json({ error: 'Email or employee code already exists.' }, { status: 409 });
    }
    console.error('[teachers/put]', error);
    return NextResponse.json({ error: 'Unable to update teacher.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });

  try {
    const [examCount, fallbackTeacher] = await Promise.all([
      prisma.exam.count({ where: { createdById: id } }),
      prisma.teacher.findFirst({
        where: { id: { not: id } },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    await prisma.$transaction(async (tx) => {
      // Optional links should be detached before deleting teacher.
      await tx.subject.updateMany({
        where: { teacherId: id },
        data: { teacherId: null },
      });

      await tx.attendance.updateMany({
        where: { markedById: id },
        data: { markedById: null },
      });

      // Exam.createdBy is required.
      // If another teacher exists, reassign exam ownership.
      // Otherwise delete teacher-owned exams (results cascade via FK).
      if (examCount > 0) {
        if (fallbackTeacher) {
          await tx.exam.updateMany({
            where: { createdById: id },
            data: { createdById: fallbackTeacher.id },
          });
        } else {
          await tx.exam.deleteMany({
            where: { createdById: id },
          });
        }
      }

      await tx.teacher.delete({ where: { id } });
      await tx.user.delete({ where: { id: teacher.userId } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json(
        {
          error:
            'Teacher cannot be deleted because linked academic records exist (attendance/exams/assignments). Remove or reassign related records first.',
        },
        { status: 409 }
      );
    }
    console.error('[teachers/delete]', error);
    return NextResponse.json({ error: 'Unable to delete teacher.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
