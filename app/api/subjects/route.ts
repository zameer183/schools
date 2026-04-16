import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

export async function GET() {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT]);
  if (!auth.authorized) return auth.response;

  if (auth.session.role === UserRole.TEACHER) {
    const teacher = await prisma.teacher.findUnique({ where: { userId: auth.session.id }, select: { id: true } });
    if (!teacher) return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });

    const subjects = await prisma.subject.findMany({
      where: { teacherId: teacher.id },
      include: { class: true, teacher: { include: { user: true } } },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(subjects);
  }

  if (auth.session.role === UserRole.STUDENT) {
    const student = await prisma.student.findUnique({ where: { userId: auth.session.id }, select: { classId: true } });
    if (!student?.classId) return NextResponse.json([]);

    const subjects = await prisma.subject.findMany({
      where: { classId: student.classId },
      include: { class: true, teacher: { include: { user: true } } },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(subjects);
  }

  const subjects = await prisma.subject.findMany({ include: { class: true, teacher: { include: { user: true } } } });
  return NextResponse.json(subjects);
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
