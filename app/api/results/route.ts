import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

export async function GET(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId') ?? undefined;
  const examId = searchParams.get('examId') ?? undefined;

  const results = await prisma.result.findMany({
    where: { studentId, examId },
    include: { student: { include: { user: true } }, exam: true, subject: true },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  const { examId, studentId, subjectId, marksObtained, grade, remarks } = await request.json();
  const result = await prisma.result.upsert({
    where: { examId_studentId: { examId, studentId } },
    update: { marksObtained, grade, remarks, subjectId },
    create: { examId, studentId, subjectId, marksObtained, grade, remarks }
  });

  return NextResponse.json(result, { status: 201 });
}
