import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { attendanceSchema } from '@/lib/validators';

export async function GET(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId') ?? undefined;
  const studentId = searchParams.get('studentId') ?? undefined;
  const date = searchParams.get('date');

  let teacherClassIds: string[] | null = null;
  if (auth.session.role === UserRole.TEACHER) {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: auth.session.id },
      select: { classAssignments: { select: { classId: true } } }
    });
    if (!teacher) return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });
    teacherClassIds = teacher.classAssignments.map((item) => item.classId);
  }

  const records = await prisma.attendance.findMany({
    where: {
      classId: teacherClassIds ? { in: teacherClassIds } : classId,
      studentId,
      date: date ? new Date(date) : undefined
    },
    include: { student: { include: { user: true } }, class: true },
    orderBy: { date: 'desc' }
  });

  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  const parsed = attendanceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const teacher = await prisma.teacher.findFirst({
    where: { userId: auth.session.id },
    select: { id: true, classAssignments: { select: { classId: true } } }
  });

  if (auth.session.role === UserRole.TEACHER && !teacher) {
    return NextResponse.json({ error: 'Teacher profile missing' }, { status: 400 });
  }

  if (auth.session.role === UserRole.TEACHER && teacher) {
    const allowedClassIds = teacher.classAssignments.map((item) => item.classId);
    if (!allowedClassIds.includes(parsed.data.classId)) {
      return NextResponse.json({ error: 'You can only mark attendance for your assigned classes.' }, { status: 403 });
    }
  }

  const result = await prisma.$transaction(
    parsed.data.records.map((record) =>
      prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: record.studentId,
            date: new Date(parsed.data.date)
          }
        },
        update: {
          status: record.status,
          remarks: record.remarks,
          classId: parsed.data.classId,
          markedById: teacher?.id
        },
        create: {
          studentId: record.studentId,
          classId: parsed.data.classId,
          date: new Date(parsed.data.date),
          status: record.status,
          remarks: record.remarks,
          markedById: teacher?.id
        }
      })
    )
  );

  return NextResponse.json(result, { status: 201 });
}