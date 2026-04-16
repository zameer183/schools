import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

export async function GET() {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
  if (!auth.authorized) return auth.response;

  const exams = await prisma.exam.findMany({ include: { class: true, subject: true, createdBy: { include: { user: true } } } });
  return NextResponse.json(exams);
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  const teacher = await prisma.teacher.findFirst({ where: { userId: auth.session.id } });
  if (!teacher) return NextResponse.json({ error: 'Teacher profile not found' }, { status: 400 });

  const { title, classId, subjectId, examDate, totalMarks, passingMarks } = await request.json();
  const exam = await prisma.exam.create({
    data: {
      title,
      classId,
      subjectId,
      examDate: new Date(examDate),
      totalMarks,
      passingMarks,
      createdById: teacher.id
    }
  });

  return NextResponse.json(exam, { status: 201 });
}
