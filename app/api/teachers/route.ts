import { hash } from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

export async function GET() {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const teachers = await prisma.teacher.findMany({ include: { user: true, classAssignments: { include: { class: true } } } });
  return NextResponse.json(teachers);
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { email, fullName, password, employeeCode, qualification, specialization } = await request.json();
  if (!email || !fullName || !password || !employeeCode) {
    return NextResponse.json({ error: 'email, fullName, password, employeeCode are required' }, { status: 400 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        fullName,
        role: UserRole.TEACHER,
        passwordHash: await hash(password, 12)
      }
    });

    return tx.teacher.create({
      data: {
        userId: user.id,
        employeeCode,
        qualification,
        specialization
      },
      include: { user: true }
    });
  });

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.teacher.delete({ where: { id } });
    await tx.user.delete({ where: { id: teacher.userId } });
  });

  return NextResponse.json({ success: true });
}
