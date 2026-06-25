import { hash } from 'bcryptjs';
import { Prisma, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { getTeacherAccessLevelsByUserId } from '@/lib/teacher-access';
import { studentCreateSchema } from '@/lib/validators';
import { randomUUID } from 'crypto';

function isLocalRestFallbackEnabled() {
  return process.env.FORCE_SUPABASE_REST_DATA_FALLBACK === '1';
}

async function supabaseRest<T>(table: string, params: Record<string, string>) {
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
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Supabase REST ${table} failed with ${response.status}`);
  }

  return (await response.json()) as T[];
}

function inFilter(ids: string[]) {
  return `in.(${ids.join(',')})`;
}

function isDatabaseConnectionError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'PrismaClientInitializationError' ||
      error.message.includes("Can't reach database server") ||
      error.message.includes('Timed out fetching a new connection'))
  );
}

async function supabaseRestUpdate(table: string, filterParams: Record<string, string>, data: Record<string, unknown>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase REST update fallback is not configured');
  }

  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  for (const [key, value] of Object.entries(filterParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(data),
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Supabase REST update for ${table} failed with ${response.status}`);
  }

  return (await response.json()) as Array<Record<string, unknown>>;
}

async function supabaseRestWrite(table: string, filterParams: Record<string, string>, init: { method: 'DELETE' | 'PATCH'; body?: Record<string, unknown> }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase REST write fallback is not configured');
  }

  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  for (const [key, value] of Object.entries(filterParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: init.method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store'
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase REST ${init.method} ${table} failed with ${response.status}: ${text}`);
  }
}

async function supabaseRestPost(table: string, body: Record<string, unknown>, prefer = 'return=minimal') {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase REST post fallback is not configured');
  }

  const response = await fetch(new URL(`/rest/v1/${table}`, supabaseUrl), {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: prefer
    },
    body: JSON.stringify(body),
    cache: 'no-store'
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase REST POST ${table} failed with ${response.status}: ${text}`);
  }
}

async function ensureStudentClassTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "StudentClass" (
      "id" TEXT PRIMARY KEY,
      "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
      "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StudentClass_studentId_classId_key" UNIQUE ("studentId", "classId")
    )
  `;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "StudentClass_studentId_idx" ON "StudentClass"("studentId")`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "StudentClass_classId_idx" ON "StudentClass"("classId")`;
}

async function getExtraClassIdsViaPrisma(studentIds: string[]) {
  if (!studentIds.length) return new Map<string, string[]>();
  await ensureStudentClassTable();
  const rows = await prisma.$queryRaw<Array<{ studentId: string; classId: string }>>`
    SELECT "studentId", "classId"
    FROM "StudentClass"
    WHERE "studentId" IN (${Prisma.join(studentIds)})
  `;
  const byStudent = new Map<string, string[]>();
  for (const row of rows) {
    byStudent.set(row.studentId, [...(byStudent.get(row.studentId) ?? []), row.classId]);
  }
  return byStudent;
}

async function replaceExtraClassIdsViaPrisma(studentId: string, primaryClassId: string | null | undefined, classIds: string[]) {
  await ensureStudentClassTable();
  const uniqueIds = Array.from(new Set(classIds.filter(Boolean))).filter((classId) => classId !== primaryClassId);
  await prisma.$executeRaw`DELETE FROM "StudentClass" WHERE "studentId" = ${studentId}`;
  for (const classId of uniqueIds) {
    await prisma.$executeRaw`
      INSERT INTO "StudentClass" ("id", "studentId", "classId")
      VALUES (${randomUUID()}, ${studentId}, ${classId})
      ON CONFLICT ("studentId", "classId") DO NOTHING
    `;
  }
}

async function supabaseRestSingle<T>(table: string, params: Record<string, string>) {
  const rows = await supabaseRest<T>(table, params);
  return rows[0] ?? null;
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function deriveFeeStatus(params: {
  dueDate?: Date | string | null;
  amount: number;
  discount: number;
  paidAmount: number;
  rawStatus?: string | null;
}) {
  const total = Math.max(params.amount - params.discount, 0);
  const remaining = Math.max(total - params.paidAmount, 0);
  if (remaining <= 0 && total > 0) return 'PAID';
  if (params.paidAmount > 0) return 'PARTIAL';

  return params.rawStatus === 'PAID' || params.rawStatus === 'PARTIAL'
    ? params.rawStatus
    : 'UNPAID';
}

function serializeFeeForStudentsApi(fee: {
  id: string;
  title?: string | null;
  amount?: Prisma.Decimal | number | string | null;
  discount?: Prisma.Decimal | number | string | null;
  dueDate: Date | string;
  status?: string | null;
  updatedAt?: Date | string | null;
  payments?: Array<{ amountPaid: Prisma.Decimal | number | string }>;
}) {
  const amount = Number(fee.amount ?? 0);
  const discount = Number(fee.discount ?? 0);
  const paidAmount = (fee.payments ?? []).reduce((sum, payment) => sum + Number(payment.amountPaid), 0);
  const remaining = Math.max(amount - discount - paidAmount, 0);

  return {
    id: fee.id,
    title: fee.title ?? 'Monthly Tuition Fee',
    amount: amount.toString(),
    discount: discount.toString(),
    feeCategory: (fee as { feeCategory?: string | null }).feeCategory ?? null,
    feeType: (fee as { feeType?: string | null }).feeType ?? null,
    fromDate: (fee as { fromDate?: Date | string | null }).fromDate ?? null,
    toDate: (fee as { toDate?: Date | string | null }).toDate ?? null,
    partialFeeSupported: Boolean((fee as { partialFeeSupported?: boolean | null }).partialFeeSupported),
    collectOnMonthStart: Boolean((fee as { collectOnMonthStart?: boolean | null }).collectOnMonthStart),
    dueDate: fee.dueDate,
    status: deriveFeeStatus({
      dueDate: fee.dueDate,
      amount,
      discount,
      paidAmount,
      rawStatus: fee.status
    }),
    updatedAt: fee.updatedAt ?? null,
    totalPaid: paidAmount.toString(),
    remaining: remaining.toString()
  };
}

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

async function getTeacherScopeViaRest(userId: string) {
  const [teacher] = await supabaseRest<{ id: string }>('Teacher', {
    select: 'id',
    userId: `eq.${userId}`,
    limit: '1'
  });
  if (!teacher) return null;
  const classLinks = await supabaseRest<{ classId: string }>('TeacherClass', {
    select: 'classId',
    teacherId: `eq.${teacher.id}`
  });
  return { teacherId: teacher.id, classIds: classLinks.map((item) => item.classId) };
}

async function getStudentsViaRest({
  id,
  classId,
  auth
}: {
  id: string | null;
  classId: string | null;
  auth: { session: { id: string; role: string } };
}) {
  const isTeacher = auth.session.role === UserRole.TEACHER;
  const teacherScope = isTeacher ? await getTeacherScopeViaRest(auth.session.id) : null;
  if (isTeacher && !teacherScope) {
    return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });
  }
  if (classId && isTeacher && !teacherScope!.classIds.includes(classId)) {
    return NextResponse.json({ error: 'Forbidden class scope' }, { status: 403 });
  }

  const params: Record<string, string> = {
    select: 'id,userId,admissionNo,classId,createdAt,updatedAt,currentAddress,emergencyContact,guardianPhone,guardianEmail,fatherName,gender,aadharNo,rollNumber,whatsApp,schoolName,joinDate,dateOfBirth',
    order: 'createdAt.desc'
  };
  if (id) params.id = `eq.${id}`;
  else if (classId) params.classId = `eq.${classId}`;
  else if (isTeacher && teacherScope!.classIds.length) params.classId = inFilter(teacherScope!.classIds);
  else if (isTeacher) return NextResponse.json([]);

  const students = await supabaseRest<Array<Record<string, unknown>> extends Array<infer T> ? T : never>('Student', params);
  if (id && students.length === 0) return NextResponse.json(null);

  const userIds = Array.from(new Set(students.map((student) => String(student.userId)).filter(Boolean)));
  const classIds = Array.from(new Set(students.map((student) => String(student.classId ?? '')).filter(Boolean)));
  const studentIds = students.map((student) => String(student.id));
  const [users, classes, attendanceRows, feeRows] = await Promise.all([
    userIds.length ? supabaseRest<Array<Record<string, unknown>> extends Array<infer T> ? T : never>('User', { select: '*', id: inFilter(userIds) }) : Promise.resolve([]),
    classIds.length ? supabaseRest<Array<Record<string, unknown>> extends Array<infer T> ? T : never>('Class', { select: '*', id: inFilter(classIds) }) : Promise.resolve([]),
    studentIds.length ? supabaseRest<{ studentId: string; status: string }>('Attendance', { select: 'studentId,status', studentId: inFilter(studentIds), limit: '3000' }) : Promise.resolve([]),
    studentIds.length ? supabaseRest<{ id: string; studentId: string; title: string; amount: string | number; discount: string | number; status: string; dueDate: string; updatedAt: string }>('Fee', { select: 'id,studentId,title,amount,discount,status,dueDate,updatedAt', studentId: inFilter(studentIds), order: 'dueDate.desc', limit: '1000' }) : Promise.resolve([])
  ]);
  const studentClassRows = studentIds.length
    ? await supabaseRest<{ studentId: string; classId: string }>('StudentClass', {
        select: 'studentId,classId',
        studentId: inFilter(studentIds)
      }).catch(() => [])
    : [];
  const latestFeeIds = Array.from(new Set(feeRows.map((fee) => fee.id)));
  const paymentRows = latestFeeIds.length
    ? await supabaseRest<{ feeId: string; amountPaid: string | number }>('Payment', {
        select: 'feeId,amountPaid',
        feeId: inFilter(latestFeeIds)
      })
    : [];
  const userById = new Map(users.map((user) => [String(user.id), user]));
  const classById = new Map(classes.map((cls) => [String(cls.id), cls]));
  const attendanceByStudentId = new Map<string, Array<{ status: string }>>();
  for (const row of attendanceRows) {
    attendanceByStudentId.set(row.studentId, [...(attendanceByStudentId.get(row.studentId) ?? []), { status: row.status }]);
  }
  const paymentsByFeeId = new Map<string, Array<{ amountPaid: string | number }>>();
  for (const payment of paymentRows) {
    paymentsByFeeId.set(payment.feeId, [...(paymentsByFeeId.get(payment.feeId) ?? []), { amountPaid: payment.amountPaid }]);
  }
  const feeByStudentId = new Map<string, Array<ReturnType<typeof serializeFeeForStudentsApi>>>();
  for (const fee of feeRows) {
    if (!feeByStudentId.has(fee.studentId)) {
      feeByStudentId.set(fee.studentId, [
        serializeFeeForStudentsApi({ ...fee, payments: paymentsByFeeId.get(fee.id) ?? [] })
      ]);
    }
  }
  const extraClassIdsByStudentId = new Map<string, string[]>();
  for (const row of studentClassRows) {
    extraClassIdsByStudentId.set(row.studentId, [...(extraClassIdsByStudentId.get(row.studentId) ?? []), row.classId]);
  }

  const payload = students.map((student) => ({
    ...student,
    user: userById.get(String(student.userId)),
    class: student.classId ? classById.get(String(student.classId)) ?? null : null,
    extraClassIds: extraClassIdsByStudentId.get(String(student.id)) ?? [],
    attendance: attendanceByStudentId.get(String(student.id)) ?? [],
    fees: feeByStudentId.get(String(student.id)) ?? []
  }));

  return NextResponse.json(id ? payload[0] ?? null : payload);
}

export async function GET(request: Request) {
  try {
    const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const classId = searchParams.get('classId');
    const light = searchParams.get('light') === '1';
    const view = searchParams.get('view');

    if (isLocalRestFallbackEnabled()) {
      return await getStudentsViaRest({ id, classId, auth });
    }

    const isTeacher = auth.session.role === UserRole.TEACHER;
    const teacherScope = isTeacher ? await getTeacherScope(auth.session.id) : null;
    const teacherLevels = isTeacher ? await getTeacherAccessLevelsByUserId(auth.session.id) : null;
    const studentsLevel = isTeacher ? (teacherLevels?.STUDENTS ?? 'NONE') : 'FULL';
    const hasStudentsAccess = studentsLevel !== 'NONE';
    const hasGlobalStudentsScope = studentsLevel === 'FULL';

    if (isTeacher && !teacherScope) {
      return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });
    }
    if (isTeacher && !hasStudentsAccess) {
      return NextResponse.json({ error: 'Students module access is disabled for this teacher.' }, { status: 403 });
    }

    if (classId && isTeacher && !hasGlobalStudentsScope && !teacherScope!.classIds.includes(classId)) {
      return NextResponse.json({ error: 'Forbidden class scope' }, { status: 403 });
    }

    if (id) {
      const student = await prisma.student.findUnique({
        where: { id },
        include: {
          user: true,
          class: true,
          attendance: { select: { status: true } },
          fees: {
            select: {
              id: true,
              title: true,
              amount: true,
              discount: true,
              feeCategory: true,
              feeType: true,
              fromDate: true,
              toDate: true,
              partialFeeSupported: true,
              collectOnMonthStart: true,
              status: true,
              dueDate: true,
              updatedAt: true,
              payments: { select: { amountPaid: true } }
            },
            orderBy: { dueDate: 'desc' },
            take: 1
          }
        }
      });
      if (isTeacher && !hasGlobalStudentsScope && student?.classId && !teacherScope!.classIds.includes(student.classId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const extraClassIds = student ? (await getExtraClassIdsViaPrisma([student.id])).get(student.id) ?? [] : [];
      return NextResponse.json(student ? { ...student, extraClassIds, fees: student.fees.map(serializeFeeForStudentsApi) } : null);
    }

    if (classId) {
      const classExists = await prisma.class.findUnique({ where: { id: classId }, select: { id: true } });
      if (!classExists) return NextResponse.json([]);
    }

    const where = classId
      ? { classId }
      : isTeacher && !hasGlobalStudentsScope
        ? { classId: { in: teacherScope!.classIds } }
        : undefined;

    if (light) {
      const students = await prisma.student.findMany({
        where,
        select: {
          id: true,
          classId: true,
          admissionNo: true,
          user: { select: { fullName: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json(students.map((student) => ({
        id: student.id,
        classId: student.classId,
        admissionNo: student.admissionNo,
        fullName: student.user.fullName
      })));
    }

    if (view === 'teacher-progress') {
      const students = await prisma.student.findMany({
        where,
        select: {
          id: true,
          admissionNo: true,
          user: { select: { fullName: true, email: true } },
          class: { select: { id: true, name: true, section: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json(students);
    }

    if (view === 'teacher-attendance') {
      const students = await prisma.student.findMany({
        where,
        select: {
          id: true,
          admissionNo: true,
          whatsApp: true,
          guardianPhone: true,
          user: { select: { fullName: true, email: true } },
          class: { select: { id: true, name: true, section: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json(students);
    }

    if (view === 'teacher-list') {
      const students = await prisma.student.findMany({
        where,
        select: {
          id: true,
          admissionNo: true,
          emergencyContact: true,
          user: { select: { fullName: true, email: true } },
          class: { select: { id: true, name: true, section: true } },
          attendance: { select: { status: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json(students);
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        user: true,
        class: true,
        attendance: { select: { status: true } },
        fees: {
          select: {
            id: true,
            title: true,
            amount: true,
            discount: true,
            status: true,
            dueDate: true,
            updatedAt: true,
            payments: { select: { amountPaid: true } }
          },
          orderBy: { dueDate: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    const extraClassIdsByStudentId = await getExtraClassIdsViaPrisma(students.map((student) => student.id));
    return NextResponse.json(students.map((student) => ({
      ...student,
      extraClassIds: extraClassIdsByStudentId.get(student.id) ?? [],
      fees: student.fees.map(serializeFeeForStudentsApi)
    })));
  } catch (error) {
    console.error('[students/get] unexpected-error', error);
    return NextResponse.json({ error: 'Unable to load students right now.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  const payload = studentCreateSchema.safeParse(await request.json());
  if (!payload.success) {
    const firstIssue = payload.error.issues[0]?.message ?? 'Invalid request payload';
    return NextResponse.json({ error: firstIssue, details: payload.error.flatten() }, { status: 400 });
  }

  const isTeacher = auth.session.role === UserRole.TEACHER;
  const teacherScope = isTeacher ? await getTeacherScope(auth.session.id) : null;

  if (isTeacher && !teacherScope) {
    return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });
  }

  if (isTeacher && !payload.data.classId) {
    return NextResponse.json({ error: 'Class is required for teacher-created students.' }, { status: 400 });
  }

  if (isTeacher && payload.data.classId && !teacherScope!.classIds.includes(payload.data.classId)) {
    return NextResponse.json({ error: 'You can only add students to your assigned classes.' }, { status: 403 });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: payload.data.email,
          fullName: payload.data.fullName,
          phone: payload.data.phone,
          role: UserRole.STUDENT,
          passwordHash: await hash(payload.data.password, 12)
        }
      });

      return tx.student.create({
        data: {
          userId: user.id,
          admissionNo: payload.data.admissionNo,
          classId: payload.data.classId
        },
        include: { user: true, class: true }
      });
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Email or admission number already exists.' }, { status: 409 });
      }

      if (error.code === 'P2003') {
        return NextResponse.json({ error: 'Selected class is invalid. Please choose a valid class.' }, { status: 400 });
      }
    }

    console.error('[students/post] unexpected-error', error);
    return NextResponse.json({ error: 'Unable to create student right now.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let isShareCredentialsRequest = false;
  try {
    const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const {
      id,
      classId,
      extraClassIds,
      currentAddress,
      emergencyContact,
      guardianPhone,
      guardianEmail,
      fatherName,
      gender,
      aadharNo,
      rollNumber,
      whatsApp,
      schoolName,
      dateOfBirth,
      joinDate,
      fullName,
      email,
      phone,
      password,
      shareCredentials,
      feeAmount,
      feeDueDate,
      feeTitle,
      feeCategory,
      feeType,
      fromDate,
      toDate,
      feeDiscount,
      partialFeeSupported,
      collectOnMonthStart
    } = body;

    isShareCredentialsRequest = shareCredentials === true;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    let student: { id: string; classId: string | null; userId: string; admissionNo: string; user: { email: string } } | null = null;
    try {
      student = await prisma.student.findUnique({
        where: { id },
        select: {
          id: true,
          classId: true,
          userId: true,
          admissionNo: true,
          user: { select: { email: true } }
        }
      });
    } catch (error) {
      if (!isShareCredentialsRequest || !isDatabaseConnectionError(error)) throw error;
    }

    if (!student && isShareCredentialsRequest) {
      const studentFallback = await supabaseRestSingle<{ id: string; classId: string | null; userId: string; admissionNo: string }>('Student', {
        select: 'id,classId,userId,admissionNo',
        id: `eq.${id}`,
        limit: '1'
      });

      if (studentFallback) {
        const userFallback = await supabaseRestSingle<{ email: string }>('User', {
          select: 'email',
          id: `eq.${studentFallback.userId}`,
          limit: '1'
        });

        student = {
          ...studentFallback,
          user: { email: userFallback?.email ?? '' }
        };
      }
    }

    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    if (auth.session.role === UserRole.TEACHER) {
      const teacherScope = isLocalRestFallbackEnabled() ? await getTeacherScopeViaRest(auth.session.id) : await getTeacherScope(auth.session.id);
      if (!teacherScope) return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });

      if (student.classId && !teacherScope.classIds.includes(student.classId)) {
        return NextResponse.json({ error: 'You can only update your own class students.' }, { status: 403 });
      }

      if (classId && !teacherScope.classIds.includes(classId)) {
        return NextResponse.json({ error: 'You can only assign students to your classes.' }, { status: 403 });
      }
      if (Array.isArray(extraClassIds) && extraClassIds.some((extraClassId) => !teacherScope.classIds.includes(String(extraClassId)))) {
        return NextResponse.json({ error: 'You can only assign students to your classes.' }, { status: 403 });
      }
    }

    if (isShareCredentialsRequest) {
      if (!(typeof password === 'string' && password.length >= 6)) {
        return NextResponse.json(
          { error: 'Provide a new password (minimum 6 characters) before sharing credentials.' },
          { status: 400 }
        );
      }
      const rawPassword = password;
      const hashed = await hash(rawPassword, 12);
      try {
        await prisma.user.update({
          where: { id: student.userId },
          data: { passwordHash: hashed }
        });
      } catch (error) {
        if (!isDatabaseConnectionError(error)) throw error;
        await supabaseRestUpdate('User', { id: `eq.${student.userId}` }, { passwordHash: hashed });
      }

      return NextResponse.json({
        credentials: {
          admissionNo: student.admissionNo,
          email: student.user?.email ?? '',
          password: rawPassword
        }
      });
    }

    const studentStringFields: Record<string, string | null | undefined> = {
      classId,
      currentAddress,
      emergencyContact,
      guardianPhone,
      guardianEmail,
      fatherName,
      gender,
      aadharNo,
      rollNumber,
      whatsApp,
      schoolName
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentUpdate: Record<string, any> = {};

    for (const [key, val] of Object.entries(studentStringFields)) {
      if (val !== undefined) {
        studentUpdate[key] = val === '' ? null : val;
      }
    }

    if (dateOfBirth !== undefined) {
      studentUpdate.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    }
    if (joinDate !== undefined) {
      studentUpdate.joinDate = joinDate ? new Date(joinDate) : null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userUpdate: Record<string, any> = {};

    if (fullName !== undefined) {
      userUpdate.fullName = fullName;
    }
    if (phone !== undefined) {
      userUpdate.phone = phone === '' ? null : phone;
    }
    if (email !== undefined && email !== '') {
      const existing = await prisma.user.findFirst({
        where: { email, NOT: { id: student.userId } },
        select: { id: true }
      });
      if (existing) {
        return NextResponse.json({ error: 'Email is already in use by another account.' }, { status: 409 });
      }
      userUpdate.email = email;
    }
    if (typeof password === 'string' && password.length > 0) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
      }
      userUpdate.passwordHash = await hash(password, 12);
    }

    if (feeAmount && Number(feeAmount) > 0 && feeDueDate) {
      const feeData = {
        title: feeTitle ?? 'Fee',
        amount: Number(feeAmount),
        dueDate: monthStart(new Date(feeDueDate)),
        discount: feeDiscount ? Number(feeDiscount) : 0,
        feeCategory: feeCategory ?? null,
        feeType: feeType ?? null,
        fromDate: fromDate ? new Date(fromDate) : null,
        toDate: toDate ? new Date(toDate) : null,
        partialFeeSupported: Boolean(partialFeeSupported),
        collectOnMonthStart: Boolean(collectOnMonthStart),
        status: 'PENDING' as const
      };

      const periodMatch = await prisma.fee.findFirst({
        where: {
          studentId: id,
          fromDate: feeData.fromDate,
          toDate: feeData.toDate
        },
        select: { id: true },
        orderBy: { createdAt: 'desc' }
      });

      const editableUnpaid = periodMatch ?? await prisma.fee.findFirst({
        where: {
          studentId: id,
          payments: { none: {} },
          status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] }
        },
        select: { id: true },
        orderBy: { createdAt: 'desc' }
      });

      if (editableUnpaid) {
        await prisma.fee.update({
          where: { id: editableUnpaid.id },
          data: feeData
        });
      } else {
        await prisma.fee.create({
          data: {
            studentId: id,
            ...feeData
          }
        });
      }
    }

    const ops: Promise<unknown>[] = [];

    if (Object.keys(studentUpdate).length > 0) {
      ops.push(
        prisma.student.update({
          where: { id },
          data: studentUpdate
        })
      );
    }

    if (Object.keys(userUpdate).length > 0) {
      ops.push(
        prisma.user.update({
          where: { id: student.userId },
          data: userUpdate
        })
      );
    }

    if (ops.length > 0) {
      await Promise.all(ops);
    }

    if (Array.isArray(extraClassIds)) {
      const nextPrimaryClassId = classId === undefined ? student.classId : (classId || null);
      await replaceExtraClassIdsViaPrisma(
        id,
        nextPrimaryClassId,
        extraClassIds.map((value) => String(value))
      );
    }

    const updated = await prisma.student.findUnique({
      where: { id },
      include: { user: true, class: true }
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (isShareCredentialsRequest && isDatabaseConnectionError(error)) {
      console.error('[students/patch][share-credentials] database-unavailable', error);
      return NextResponse.json(
        { error: 'Database connection unavailable while sharing credentials. Please retry after the database recovers.' },
        { status: 503 }
      );
    }

    console.error('[students/patch] unexpected-error', error);
    return NextResponse.json({ error: 'Unable to update student right now.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  try {
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    await prisma.notification.deleteMany({
      where: {
        OR: [{ userId: student.userId }, { studentId: id }]
      }
    });

    await prisma.student.delete({ where: { id } });
    await prisma.user.delete({ where: { id: student.userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (!isDatabaseConnectionError(error)) {
      console.error('[students/delete] prisma-delete-failed', error);
    }

    try {
      const [student] = await supabaseRest<{ id: string; userId: string }>('Student', {
        select: 'id,userId',
        id: `eq.${id}`,
        limit: '1'
      });
      if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

      await supabaseRestWrite('Notification', { studentId: `eq.${id}` }, { method: 'DELETE' });
      await supabaseRestWrite('Notification', { userId: `eq.${student.userId}` }, { method: 'DELETE' });
      await supabaseRestWrite('Student', { id: `eq.${id}` }, { method: 'DELETE' });
      await supabaseRestWrite('User', { id: `eq.${student.userId}` }, { method: 'DELETE' });

      return NextResponse.json({ success: true });
    } catch (fallbackError) {
      console.error('[students/delete] fallback-delete-failed', fallbackError);
      return NextResponse.json({ error: 'Unable to delete student right now.' }, { status: 500 });
    }
  }
}

