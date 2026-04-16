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

  const { id, classId, emergencyContact, currentAddress } = await request.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const student = await prisma.student.findUnique({ where: { id }, select: { id: true, classId: true } });
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

  const updated = await prisma.student.update({
    where: { id },
    data: { classId, emergencyContact, currentAddress },
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
    await tx.student.delete({ where: { id } });
    await tx.user.delete({ where: { id: student.userId } });
  });

  return NextResponse.json({ success: true });
}
