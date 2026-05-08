import { UserRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

export async function GET() {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  const classes =
    auth.session.role === UserRole.TEACHER
      ? await prisma.class.findMany({
          where: {
            OR: [
              { teacherLinks: { some: { teacher: { userId: auth.session.id } } } },
              { subjects: { some: { teacher: { userId: auth.session.id } } } }
            ]
          },
          include: {
            teacherLinks: {
              include: {
                teacher: {
                  include: {
                    user: { select: { fullName: true } }
                  }
                }
              },
              orderBy: { createdAt: 'asc' },
              take: 1
            },
            _count: { select: { students: true } }
          },
          orderBy: [{ name: 'asc' }, { section: 'asc' }]
        })
      : await prisma.class.findMany({
          include: {
            teacherLinks: {
              include: {
                teacher: {
                  include: {
                    user: { select: { fullName: true } }
                  }
                }
              },
              orderBy: { createdAt: 'asc' },
              take: 1
            },
            _count: { select: { students: true } }
          },
          orderBy: [{ name: 'asc' }, { section: 'asc' }]
        });

  return NextResponse.json(classes, {
    headers: { 'Cache-Control': 'no-store' }
  });
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { name, section, roomNo, academicYear, classTeacherId } = await request.json();
  if (!name || !section || !academicYear) {
    return NextResponse.json({ error: 'name, section, academicYear are required' }, { status: 400 });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const klass = await tx.class.create({ data: { name, section, roomNo, academicYear } });

      if (typeof classTeacherId === 'string' && classTeacherId.trim().length > 0) {
        await tx.teacherClass.upsert({
          where: {
            teacherId_classId: {
              teacherId: classTeacherId,
              classId: klass.id
            }
          },
          update: { isClassLead: true },
          create: {
            teacherId: classTeacherId,
            classId: klass.id,
            isClassLead: true
          }
        });
      }

      return klass;
    });

    revalidatePath('/admin/classes');
    revalidatePath('/admin/students');
    revalidatePath('/admin/attendance');
    revalidatePath('/admin/academics');
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Class with same name/section/year already exists.' },
      { status: 409 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { id, name, section, roomNo, academicYear, classTeacherId } = await request.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const classRef = await prisma.class.findUnique({ where: { id }, select: { id: true } });
  if (!classRef) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const klass = await tx.class.update({
        where: { id },
        data: {
          ...(typeof name === 'string' ? { name: name.trim() } : {}),
          ...(typeof section === 'string' ? { section: section.trim() } : {}),
          ...(typeof roomNo === 'string' ? { roomNo: roomNo.trim() || null } : {}),
          ...(typeof academicYear === 'string' ? { academicYear: academicYear.trim() } : {})
        }
      });

      await tx.teacherClass.deleteMany({ where: { classId: id, isClassLead: true } });

      if (typeof classTeacherId === 'string' && classTeacherId.trim().length > 0) {
        await tx.teacherClass.upsert({
          where: {
            teacherId_classId: {
              teacherId: classTeacherId,
              classId: id
            }
          },
          update: { isClassLead: true },
          create: {
            teacherId: classTeacherId,
            classId: id,
            isClassLead: true
          }
        });
      }

      return klass;
    });

    revalidatePath('/admin/classes');
    revalidatePath('/admin/students');
    revalidatePath('/admin/attendance');
    revalidatePath('/admin/academics');
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: 'Class with same name/section/year already exists.' },
      { status: 409 }
    );
  }
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
      name: true,
      section: true,
      _count: {
        select: {
          students: true,
          subjects: true,
          attendance: true,
          teacherLinks: true,
          assignments: true,
          exams: true,
          progressLogs: true
        }
      }
    }
  });

  if (!classRef) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  const cleanupSummary = await prisma.$transaction(async (tx) => {
    const studentsDetached = await tx.student.updateMany({
      where: { classId: id },
      data: { classId: null }
    });

    const attendanceDeleted = await tx.attendance.deleteMany({ where: { classId: id } });
    const progressDeleted = await tx.studentProgress.deleteMany({ where: { classId: id } });
    const assignmentsDeleted = await tx.assignment.deleteMany({ where: { classId: id } });
    const examsDeleted = await tx.exam.deleteMany({ where: { classId: id } });
    const subjectsDeleted = await tx.subject.deleteMany({ where: { classId: id } });
    const linksDeleted = await tx.teacherClass.deleteMany({ where: { classId: id } });

    await tx.class.delete({ where: { id } });

    return {
      studentsDetached: studentsDetached.count,
      attendanceDeleted: attendanceDeleted.count,
      progressDeleted: progressDeleted.count,
      assignmentsDeleted: assignmentsDeleted.count,
      examsDeleted: examsDeleted.count,
      subjectsDeleted: subjectsDeleted.count,
      linksDeleted: linksDeleted.count
    };
  });

  revalidatePath('/admin/classes');
  revalidatePath('/admin/students');
  revalidatePath('/admin/attendance');
  revalidatePath('/admin/academics');
  revalidatePath('/admin/reports');
  revalidatePath('/teacher/academics');
  revalidatePath('/teacher/attendance');

  return NextResponse.json({
    success: true,
    deletedClass: `${classRef.name} - ${classRef.section}`,
    cleanupSummary
  });
}
