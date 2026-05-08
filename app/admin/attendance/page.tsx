import { AttendanceStatus, UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureStaffAttendanceTable } from '@/lib/staff-attendance';
import AttendanceDashboardClient from './attendance-dashboard-client';

export const dynamic = 'force-dynamic';

type SearchParams = { date?: string; classId?: string; tab?: string };

type StaffDailyRow = {
  teacherId: string;
  userId: string;
  fullName: string;
  status: string;
  note: string | null;
};

function startOfMonth(date: Date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(value: Date | string | null | undefined, fallback: string) {
  if (!value) return fallback;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString().slice(0, 10);
}

const getCachedAttendanceData = unstable_cache(
  async (
    selectedDate: string,
    selectedClassId: string,
    dayDateIso: string,
    monthStartIso: string,
    staffEnabledFlag: '1' | '0'
  ) => {
    const dayDate = new Date(dayDateIso);
    const monthStart = new Date(monthStartIso);
    const staffAttendanceEnabled = staffEnabledFlag === '1';

    const [
      classes,
      dailyRows,
      dailyStatusCounts,
      monthStatusByDay,
      classStudents,
      teachers,
      staffDailyRows
    ] = await Promise.all([
      prisma.class.findMany({ orderBy: [{ name: 'asc' }, { section: 'asc' }] }),
      prisma.attendance.findMany({
        where: { date: dayDate, classId: selectedClassId || undefined },
        include: {
          class: { select: { id: true, name: true, section: true } },
          student: {
            select: {
              id: true,
              admissionNo: true,
              classId: true,
              class: { select: { name: true, section: true } },
              user: { select: { fullName: true } }
            }
          }
        },
        orderBy: [{ student: { admissionNo: 'asc' } }],
        take: 2000
      }),
      prisma.attendance.groupBy({
        by: ['status'],
        where: { date: dayDate, classId: selectedClassId || undefined },
        _count: { _all: true }
      }),
      prisma.attendance.groupBy({
        by: ['date', 'status'],
        where: {
          classId: selectedClassId || undefined,
          date: { gte: monthStart, lte: dayDate }
        },
        _count: { _all: true }
      }),
      prisma.student.findMany({
        where: selectedClassId ? { classId: selectedClassId } : { classId: { not: null } },
        select: {
          id: true,
          admissionNo: true,
          classId: true,
          class: { select: { id: true, name: true, section: true } },
          user: { select: { fullName: true } }
        },
        orderBy: [{ user: { fullName: 'asc' } }],
        take: 5000
      }),
      prisma.teacher.findMany({
        select: {
          id: true,
          userId: true,
          user: { select: { fullName: true } }
        },
        orderBy: [{ user: { fullName: 'asc' } }],
        take: 500
      }),
      staffAttendanceEnabled
        ? prisma.$queryRaw<StaffDailyRow[]>`
          SELECT
            sa."teacherId",
            u."id" as "userId",
            u."fullName",
            sa."status",
            sa."note"
          FROM "StaffAttendance" sa
          INNER JOIN "Teacher" t ON t."id" = sa."teacherId"
          INNER JOIN "User" u ON u."id" = t."userId"
          WHERE sa."date" = ${selectedDate}::date
          ORDER BY u."fullName" ASC;
        `
        : Promise.resolve([] as StaffDailyRow[])
    ]);

    return {
      classes,
      dailyRows,
      dailyStatusCounts,
      monthStatusByDay,
      classStudents,
      teachers,
      staffDailyRows
    };
  },
  ['admin-attendance-dashboard-data'],
  { revalidate: 20 }
);

export default async function AdminAttendancePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requireAuth([UserRole.ADMIN]);

  const params = (await searchParams) ?? {};
  const selectedDate = params.date ?? new Date().toISOString().slice(0, 10);
  const selectedClassId = params.classId?.trim() ?? '';
  const initialTab = params.tab === 'students' || params.tab === 'teachers' || params.tab === 'overview' ? params.tab : 'overview';

  const dayDate = new Date(selectedDate);
  dayDate.setHours(0, 0, 0, 0);
  const monthStart = startOfMonth(dayDate);

  const staffAttendanceEnabled = await ensureStaffAttendanceTable();
  const {
    classes,
    dailyRows,
    dailyStatusCounts,
    monthStatusByDay,
    classStudents,
    teachers,
    staffDailyRows
  } = await getCachedAttendanceData(
    selectedDate,
    selectedClassId,
    dayDate.toISOString(),
    monthStart.toISOString(),
    staffAttendanceEnabled ? '1' : '0'
  );

  const studentDailyMap = new Map(dailyRows.map((row) => [row.student.id, row.status]));
  const staffDailyMap = new Map(staffDailyRows.map((row) => [row.teacherId, row.status]));

  const serializedMonthStatusByDay = monthStatusByDay.map((row) => ({
    date: toDateKey(row.date as Date | string, selectedDate),
    status: row.status,
    count: row._count._all
  }));

  const statusCount = (status: AttendanceStatus) =>
    dailyStatusCounts.find((item) => item.status === status)?._count._all ?? 0;

  const presentCount = statusCount(AttendanceStatus.PRESENT);
  const absentCount = statusCount(AttendanceStatus.ABSENT);
  const lateCount = statusCount(AttendanceStatus.LATE);
  const totalCount = dailyStatusCounts.reduce((acc, item) => acc + item._count._all, 0);
  const percentage = totalCount ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <AttendanceDashboardClient
      initialTab={initialTab}
      selectedDate={selectedDate}
      selectedClassId={selectedClassId}
      classes={classes.map((item) => ({ id: item.id, name: item.name, section: item.section }))}
      students={classStudents.map((student) => ({
        id: student.id,
        fullName: student.user.fullName,
        admissionNo: student.admissionNo,
        classId: student.classId ?? '',
        classLabel: student.class ? `${student.class.name} - ${student.class.section}` : 'No class',
        status: studentDailyMap.get(student.id) ?? null
      }))}
      teachers={teachers.map((teacher) => ({
        id: teacher.id,
        fullName: teacher.user.fullName,
        status: staffDailyMap.get(teacher.id) ?? null
      }))}
      overview={{
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        percentage
      }}
      monthStatusByDay={serializedMonthStatusByDay}
    />
  );
}
