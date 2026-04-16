import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

export async function GET() {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  const classes =
    auth.session.role === UserRole.TEACHER
      ? await prisma.class.findMany({
          where: { teacherLinks: { some: { teacher: { userId: auth.session.id } } } },
          include: { subjects: true, teacherLinks: true }
        })
      : await prisma.class.findMany({ include: { subjects: true, teacherLinks: true } });

  return NextResponse.json(classes);
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { name, section, roomNo, academicYear } = await request.json();
  if (!name || !section || !academicYear) {
    return NextResponse.json({ error: 'name, section, academicYear are required' }, { status: 400 });
  }

  const created = await prisma.class.create({ data: { name, section, roomNo, academicYear } });
  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const classRef = await prisma.class.findUnique({
    where: { id },
    select: {
      id: true,
      _count: {
        select: { students: true, subjects: true, attendance: true, teacherLinks: true }
      }
    }
  });

  if (!classRef) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  if (
    classRef._count.students > 0 ||
    classRef._count.subjects > 0 ||
    classRef._count.attendance > 0 ||
    classRef._count.teacherLinks > 0
  ) {
    return NextResponse.json(
      { error: 'Cannot delete class with linked students/subjects/attendance.' },
      { status: 409 }
    );
  }

  await prisma.class.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
