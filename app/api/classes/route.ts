import { UserRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

function isLocalRestFallbackEnabled() {
  return process.env.FORCE_SUPABASE_REST_DATA_FALLBACK === '1';
}

async function supabaseRest<T>(table: string, params: Record<string, string>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase REST fallback is not configured');
  }

  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Supabase REST ${table} failed with ${response.status}`);
  }

  return (await response.json()) as T[];
}

function inFilter(ids: string[]) {
  return `in.(${ids.join(',')})`;
}

export async function GET() {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  if (isLocalRestFallbackEnabled()) {
    let classes = await supabaseRest<Array<Record<string, unknown>> extends Array<infer T> ? T : never>('Class', {
      select: '*',
      order: 'name.asc,section.asc'
    });

    if (auth.session.role === UserRole.TEACHER) {
      const [teacher] = await supabaseRest<{ id: string }>('Teacher', {
        select: 'id',
        userId: `eq.${auth.session.id}`,
        limit: '1'
      });
      const classLinks = teacher
        ? await supabaseRest<{ classId: string }>('TeacherClass', {
            select: 'classId',
            teacherId: `eq.${teacher.id}`
          })
        : [];
      const classIds = new Set(classLinks.map((item) => item.classId));
      classes = classes.filter((cls) => classIds.has(String(cls.id)));
    }

    const classIds = classes.map((cls) => String(cls.id));
    const students = classIds.length
      ? await supabaseRest<{ classId: string }>('Student', {
          select: 'classId',
          classId: inFilter(classIds)
        })
      : [];
    const countByClassId = new Map<string, number>();
    for (const student of students) {
      countByClassId.set(student.classId, (countByClassId.get(student.classId) ?? 0) + 1);
    }

    return NextResponse.json(classes.map((cls) => ({
      ...cls,
      teacherLinks: [],
      _count: { students: countByClassId.get(String(cls.id)) ?? 0 }
    })), {
      headers: { 'Cache-Control': 'no-store' }
    });
  }

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
