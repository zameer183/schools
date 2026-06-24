import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { ensureApiRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { ensureStaffAttendanceTable } from '@/lib/staff-attendance';

type StaffAttendanceRow = {
  id: string;
  teacherId: string;
  date: Date;
  status: string;
  note: string | null;
};

export async function GET(request: Request) {
  try {
    const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
    if (!auth.authorized) return auth.response;

    const tableReady = await ensureStaffAttendanceTable();
    if (!tableReady) {
      // Avoid breaking attendance UI; return empty data with warning.
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date')?.trim();
    const from = searchParams.get('from')?.trim();
    const to = searchParams.get('to')?.trim();
    const teacherIdParam = searchParams.get('teacherId')?.trim();

    let teacherId = teacherIdParam;
    if (auth.session.role === UserRole.TEACHER) {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: auth.session.id },
        select: { id: true }
      });
      if (!teacher) return NextResponse.json({ error: 'Teacher profile missing.' }, { status: 400 });
      teacherId = teacher.id;
    }

    const whereParts: string[] = [];
    const values: (string | Date)[] = [];
    let argIndex = 1;

    if (teacherId) {
      whereParts.push(`sa."teacherId" = $${argIndex++}`);
      values.push(teacherId);
    }
    if (date) {
      whereParts.push(`sa."date" = $${argIndex++}::date`);
      values.push(date);
    }
    if (from) {
      whereParts.push(`sa."date" >= $${argIndex++}::date`);
      values.push(from);
    }
    if (to) {
      whereParts.push(`sa."date" <= $${argIndex++}::date`);
      values.push(to);
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const rows = await prisma.$queryRawUnsafe<StaffAttendanceRow[]>(
      `
        SELECT sa."id", sa."teacherId", sa."date", sa."status", sa."note"
        FROM "StaffAttendance" sa
        ${whereSql}
        ORDER BY sa."date" DESC
        LIMIT 500
      `,
      ...values
    );

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        teacherId: row.teacherId,
        date: row.date.toISOString().slice(0, 10),
        status: row.status,
        note: row.note
      }))
    );
  } catch (error) {
    console.error('[api/staff-attendance][GET]', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
    if (!auth.authorized) return auth.response;

    const tableReady = await ensureStaffAttendanceTable();
    if (!tableReady) {
      return NextResponse.json({ error: 'Staff attendance storage is unavailable.' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const date = typeof body?.date === 'string' ? body.date.trim() : '';
    const status = typeof body?.status === 'string' ? body.status.trim().toUpperCase() : '';
    const note = typeof body?.note === 'string' ? body.note.trim() : '';
    const teacherIdParam = typeof body?.teacherId === 'string' ? body.teacherId.trim() : '';

    if (!date || !['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(status)) {
      return NextResponse.json({ error: 'date and valid status are required.' }, { status: 400 });
    }

    let teacherId = teacherIdParam;
    if (auth.session.role === UserRole.TEACHER) {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: auth.session.id },
        select: { id: true }
      });
      if (!teacher) return NextResponse.json({ error: 'Teacher profile missing.' }, { status: 400 });
      teacherId = teacher.id;
    }

    if (!teacherId) {
      return NextResponse.json({ error: 'teacherId is required for admin request.' }, { status: 400 });
    }

    await prisma.$executeRaw`
      INSERT INTO "StaffAttendance" ("id", "teacherId", "date", "status", "note", "markedAt")
      VALUES (${randomUUID()}, ${teacherId}, ${date}::date, ${status}, ${note || null}, NOW())
      ON CONFLICT ("teacherId", "date")
      DO UPDATE SET
        "status" = EXCLUDED."status",
        "note" = EXCLUDED."note",
        "markedAt" = NOW();
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/staff-attendance][POST]', error);
    return NextResponse.json({ error: 'Unable to save staff attendance right now.' }, { status: 500 });
  }
}
