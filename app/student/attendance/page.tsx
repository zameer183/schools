import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AttendanceClient from './attendance-client';

export const dynamic = 'force-dynamic';

type SearchParams = {
  month?: string;
};

export default async function StudentAttendancePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);
  const params = (await searchParams) ?? {};

  // Determine month from searchParam or default to current month
  const now = new Date();
  const monthKey =
    params.month?.match(/^\d{4}-\d{2}$/) ? params.month : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [year, month] = monthKey.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const student = await prisma.student.findUnique({
    where: { userId: session.id },
    select: {
      id: true,
      rollNumber: true,
      admissionNo: true,
      user: { select: { fullName: true, isActive: true } },
      class: { select: { name: true, section: true } },
    },
  });

  if (!student) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="rounded-2xl bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-center max-w-sm w-full">
          <p className="text-lg font-bold text-[#1a1c1c]">No student profile found</p>
          <p className="mt-2 text-sm text-[#6b7280]">Contact your administrator.</p>
        </div>
      </div>
    );
  }

  const attendance = await prisma.attendance.findMany({
    where: { studentId: student.id, date: { gte: start, lte: end } },
    select: { date: true, status: true, remarks: true },
  });

  const records = attendance.map((a) => ({
    date: a.date.toISOString().slice(0, 10),
    status: a.status as 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
    remarks: a.remarks,
  }));

  const className = student.class
    ? `${student.class.name} ${student.class.section}`
    : 'Unassigned';

  return (
    <AttendanceClient
      fullName={student.user.fullName}
      admissionNo={student.admissionNo}
      className={className}
      isActive={student.user.isActive}
      monthKey={monthKey}
      records={records}
    />
  );
}
