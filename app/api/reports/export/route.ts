import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ensureApiRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { toCsv } from '@/lib/export';

export async function GET(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'attendance') {
    const rows = await prisma.attendance.findMany({
      include: { student: { include: { user: true } }, class: true },
      orderBy: { date: 'desc' }
    });

    const csv = toCsv(
      rows.map((row) => ({
        date: row.date.toISOString().split('T')[0],
        student: row.student.user.fullName,
        class: `${row.class.name}-${row.class.section}`,
        status: row.status,
        remarks: row.remarks ?? ''
      }))
    );

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="attendance-report.csv"'
      }
    });
  }

  if (type === 'fees') {
    const rows = await prisma.fee.findMany({
      include: { student: { include: { user: true } } },
      orderBy: { dueDate: 'asc' }
    });

    const csv = toCsv(
      rows.map((row) => ({
        student: row.student.user.fullName,
        title: row.title,
        dueDate: row.dueDate.toISOString().split('T')[0],
        amount: Number(row.amount),
        status: row.status
      }))
    );

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="fee-report.csv"'
      }
    });
  }

  const results = await prisma.result.findMany({ include: { student: { include: { user: true } }, subject: true, exam: true } });
  const csv = toCsv(
    results.map((row) => ({
      exam: row.exam.title,
      student: row.student.user.fullName,
      subject: row.subject.name,
      marks: row.marksObtained,
      grade: row.grade
    }))
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="results-report.csv"'
    }
  });
}
