import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

export async function GET() {
  try {
    const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT]);
    if (!auth.authorized) return auth.response;

    let where: Record<string, unknown> = {};
    if (auth.session.role === UserRole.TEACHER) {
      const teacher = await prisma.teacher.findUnique({ where: { userId: auth.session.id }, select: { id: true } });
      if (!teacher) return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });
      where = { teacherId: teacher.id };
    } else if (auth.session.role === UserRole.STUDENT) {
      const student = await prisma.student.findUnique({ where: { userId: auth.session.id }, select: { classId: true } });
      if (!student?.classId) return NextResponse.json([]);
      where = { classId: student.classId };
    }

    const subjects = await prisma.subject.findMany({
      where,
      include: { class: true, teacher: true },
      orderBy: { name: 'asc' }
    });

    const teacherUserIds = Array.from(new Set(subjects.map((s) => s.teacher?.userId).filter(Boolean))) as string[];
    const users = teacherUserIds.length
      ? await prisma.user.findMany({ where: { id: { in: teacherUserIds } }, select: { id: true, fullName: true } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.fullName]));

    const safeSubjects = subjects.map((subject) => ({
      ...subject,
      teacher: subject.teacher
        ? {
            ...subject.teacher,
            user: subject.teacher.userId ? { fullName: userMap.get(subject.teacher.userId) ?? 'Unknown' } : { fullName: 'Unknown' }
          }
        : null
    }));

    return NextResponse.json(safeSubjects);
  } catch (error) {
    console.error('[api/subjects][GET]', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { name, code, classId, teacherId, creditHours } = await request.json();
  const subject = await prisma.subject.create({
    data: { name, code, classId, teacherId, creditHours }
  });

  return NextResponse.json(subject, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const subject = await prisma.subject.findUnique({
    where: { id },
    select: { id: true, _count: { select: { assignments: true, results: true } } }
  });

  if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

  if (subject._count.assignments > 0 || subject._count.results > 0) {
    return NextResponse.json(
      { error: 'Cannot delete subject with linked assignments/results.' },
      { status: 409 }
    );
  }

  await prisma.subject.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
