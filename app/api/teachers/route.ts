import { hash } from 'bcryptjs';
import { Prisma, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { upsertTeacherAccess, upsertTeacherCompensation } from '@/lib/teacher-access';

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

export async function GET() {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const teachers = await prisma.teacher.findMany({
    where: {
      user: {
        email: {
          not: { startsWith: 'shots_' },
        },
      },
    },
    include: { user: true, classAssignments: { include: { class: true } } },
  });
  return NextResponse.json(teachers);
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

    return NextResponse.json(updated);
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
