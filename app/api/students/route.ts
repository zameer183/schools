import { hash } from 'bcryptjs';
import { Prisma, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { studentCreateSchema } from '@/lib/validators';

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
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const isTeacher = auth.session.role === UserRole.TEACHER;
  const teacherScope = isTeacher ? await getTeacherScope(auth.session.id) : null;

  if (isTeacher && !teacherScope) {
    return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });
  }

  if (id) {
    const student = await prisma.student.findUnique({ where: { id }, include: { user: true, class: true } });
    if (isTeacher && student?.classId && !teacherScope!.classIds.includes(student.classId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(student);
  }

  const students = await prisma.student.findMany({
    where: isTeacher ? { classId: { in: teacherScope!.classIds } } : undefined,
    include: { user: true, class: true },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(students);
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
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  const body = await request.json();
  const {
    id,
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

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const student = await prisma.student.findUnique({
    where: { id },
    select: { id: true, classId: true, userId: true, admissionNo: true }
  });
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

  if (auth.session.role === UserRole.TEACHER) {
    const teacherScope = await getTeacherScope(auth.session.id);
    if (!teacherScope) return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });

    if (student.classId && !teacherScope.classIds.includes(student.classId)) {
      return NextResponse.json({ error: 'You can only update your own class students.' }, { status: 403 });
    }

    if (classId && !teacherScope.classIds.includes(classId)) {
      return NextResponse.json({ error: 'You can only assign students to your classes.' }, { status: 403 });
    }
  }

  // Handle shareCredentials branch â€” hash and return credentials, then exit early
  if (shareCredentials === true) {
    if (!(typeof password === 'string' && password.length >= 6)) {
      return NextResponse.json(
        { error: 'Provide a new password (minimum 6 characters) before sharing credentials.' },
        { status: 400 }
      );
    }
    const rawPassword = password;
    const hashed = await hash(rawPassword, 12);
    await prisma.user.update({
      where: { id: student.userId },
      data: { passwordHash: hashed }
    });
    const userRecord = await prisma.user.findUnique({
      where: { id: student.userId },
      select: { email: true }
    });
    return NextResponse.json({
      credentials: {
        admissionNo: student.admissionNo,
        email: userRecord?.email ?? '',
        password: rawPassword
      }
    });
  }

  // Build student update object
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

  // Build user update object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userUpdate: Record<string, any> = {};

  if (fullName !== undefined) {
    userUpdate.fullName = fullName;
  }
  if (phone !== undefined) {
    userUpdate.phone = phone === '' ? null : phone;
  }
  if (email !== undefined && email !== '') {
    // Check email uniqueness (exclude current user)
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

  // Handle fee creation
  if (feeAmount && Number(feeAmount) > 0 && feeDueDate) {
    await prisma.fee.create({
      data: {
        studentId: id,
        title: feeTitle ?? 'Fee',
        amount: Number(feeAmount),
        dueDate: new Date(feeDueDate),
        discount: feeDiscount ? Number(feeDiscount) : 0,
        feeCategory: feeCategory ?? null,
        feeType: feeType ?? null,
        fromDate: fromDate ? new Date(fromDate) : null,
        toDate: toDate ? new Date(toDate) : null,
        partialFeeSupported: Boolean(partialFeeSupported),
        collectOnMonthStart: Boolean(collectOnMonthStart),
        status: 'PENDING'
      }
    });
  }

  // Run student and user updates in parallel
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

  const updated = await prisma.student.findUnique({
    where: { id },
    include: { user: true, class: true }
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({
      where: {
        OR: [{ userId: student.userId }, { studentId: id }]
      }
    });

    await tx.student.delete({ where: { id } });
    await tx.user.delete({ where: { id: student.userId } });
  });

  return NextResponse.json({ success: true });
}

