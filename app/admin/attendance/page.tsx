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

type StaffMonthlyRow = {
  teacherId: string;
  status: AttendanceStatus;
  count: number;
};

type AttendancePayload = {
  classes: Array<{ id: string; name: string; section: string }>;
  dailyRows: Array<{
    studentId: string;
    status: AttendanceStatus;
  }>;
  dailyStatusCounts: Array<{ status: AttendanceStatus; _count: { _all: number } }>;
  monthStatusByDay: Array<{ date: Date | string; status: AttendanceStatus; _count: { _all: number } }>;
  classStudents: Array<{
    id: string;
    admissionNo: string;
    classId: string | null;
    user: { fullName: string };
  }>;
  teachers: Array<{ id: string; userId: string; user: { fullName: string } }>;
  staffDailyRows: StaffDailyRow[];
  staffMonthlyRows: StaffMonthlyRow[];
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

function isDatabaseConnectionError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'PrismaClientInitializationError' ||
      error.message.includes("Can't reach database server") ||
      error.message.includes('Timed out fetching a new connection') ||
      error.message.includes('Connection terminated unexpectedly'))
  );
}

function isLocalRestFallbackEnabled() {
  return process.env.FORCE_SUPABASE_REST_DATA_FALLBACK === '1';
}

async function supabaseRest<T>(table: string, params: Record<string, string | string[]>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase REST fallback is not configured');
  }

  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, item);
    } else {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase REST ${table} failed with ${response.status}: ${text}`);
  }

  return (await response.json()) as T[];
}

function inFilter(ids: string[]) {
  return `in.(${ids.join(',')})`;
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

    const attendanceWhere = { date: dayDate, ...(selectedClassId ? { classId: selectedClassId } : {}) };
    const monthWhere = {
      ...(selectedClassId ? { classId: selectedClassId } : {}),
      date: { gte: monthStart, lte: dayDate }
    };

    return prisma.$transaction(async (tx) => {
      const [
        classes,
        dailyRows,
        dailyStatusCounts,
        monthStatusByDay,
        classStudents,
        teachers,
        staffDailyRows,
        staffMonthlyRows
      ] = await Promise.all([
        tx.class.findMany({
          select: { id: true, name: true, section: true },
          orderBy: [{ name: 'asc' }, { section: 'asc' }]
        }),
        tx.attendance.findMany({
          where: attendanceWhere,
          select: {
            studentId: true,
            status: true
          },
          orderBy: [{ studentId: 'asc' }],
          take: 2000
        }),
        tx.attendance.groupBy({
          by: ['status'],
          where: attendanceWhere,
          orderBy: { status: 'asc' },
          _count: { _all: true }
        }),
        tx.attendance.groupBy({
          by: ['date', 'status'],
          where: monthWhere,
          orderBy: [{ date: 'asc' }, { status: 'asc' }],
          _count: { _all: true }
        }),
        tx.student.findMany({
          where: selectedClassId ? { classId: selectedClassId } : { classId: { not: null } },
          select: {
            id: true,
            admissionNo: true,
            classId: true,
            user: { select: { fullName: true } }
          },
          orderBy: [{ admissionNo: 'asc' }],
          take: 1000
        }),
        tx.teacher.findMany({
          select: {
            id: true,
            userId: true,
            user: { select: { fullName: true } }
          },
          orderBy: [{ createdAt: 'asc' }],
          take: 500
        }),
        staffAttendanceEnabled
          ? tx.$queryRaw<StaffDailyRow[]>`
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
          : Promise.resolve([] as StaffDailyRow[]),
        staffAttendanceEnabled
          ? tx.$queryRaw<StaffMonthlyRow[]>`
            SELECT
              sa."teacherId",
              sa."status",
              COUNT(*)::int as "count"
            FROM "StaffAttendance" sa
            INNER JOIN "Teacher" t ON t."id" = sa."teacherId"
            WHERE sa."date" >= ${monthStart}::date
              AND sa."date" <= ${dayDate}::date
            GROUP BY sa."teacherId", sa."status"
            ORDER BY sa."teacherId" ASC, sa."status" ASC;
          `
          : Promise.resolve([] as StaffMonthlyRow[])
      ]);

      return {
        classes,
        dailyRows,
        dailyStatusCounts,
        monthStatusByDay,
        classStudents,
        teachers,
        staffDailyRows,
        staffMonthlyRows
      };
    });
  },
  ['admin-attendance-dashboard-data'],
  { revalidate: 20 }
);

async function loadAttendanceViaRest(
  selectedDate: string,
  selectedClassId: string,
  dayDateIso: string,
  monthStartIso: string
): Promise<AttendancePayload> {
  const [classes, dailyRowsRaw, monthRowsRaw, classStudentsRaw, teachersRaw, staffDailyRowsRaw, staffMonthlyRowsRaw] = await Promise.all([
    supabaseRest<{ id: string; name: string; section: string }>('Class', {
      select: 'id,name,section',
      order: 'name.asc,section.asc'
    }).catch(() => []),
    supabaseRest<{
      studentId: string;
      status: AttendanceStatus;
      classId: string;
    }>('Attendance', {
      select: 'studentId,status,classId',
      date: `eq.${selectedDate}`,
      ...(selectedClassId ? { classId: `eq.${selectedClassId}` } : {})
    }).catch(() => []),
    supabaseRest<{ date: string; status: AttendanceStatus }>('Attendance', {
      select: 'date,status',
      date: [`gte.${monthStartIso}`, `lte.${dayDateIso}`],
      ...(selectedClassId ? { classId: `eq.${selectedClassId}` } : {})
    }).catch(() => []),
    supabaseRest<{
      id: string;
      admissionNo: string;
      classId: string | null;
      userId: string;
    }>('Student', {
      select: 'id,admissionNo,classId,userId',
      ...(selectedClassId ? { classId: `eq.${selectedClassId}` } : {}),
      order: 'createdAt.desc'
    }).catch(() => []),
    supabaseRest<{ id: string; userId: string }>('Teacher', {
      select: 'id,userId',
      order: 'createdAt.asc'
    }).catch(() => []),
    supabaseRest<{ teacherId: string; userId?: string; fullName?: string; status: string; note: string | null }>('StaffAttendance', {
      select: 'teacherId,status,note',
      date: `eq.${selectedDate}`
    }).catch(() => []),
    supabaseRest<{ teacherId: string; status: AttendanceStatus }>('StaffAttendance', {
      select: 'teacherId,status',
      date: [`gte.${monthStartIso}`, `lte.${dayDateIso}`]
    }).catch(() => [])
  ]);

  const userIds = Array.from(
    new Set([
      ...classStudentsRaw.map((item) => item.userId).filter(Boolean),
      ...teachersRaw.map((item) => item.userId).filter(Boolean)
    ])
  );
  const users = userIds.length
    ? await supabaseRest<{ id: string; fullName: string }>('User', {
        select: 'id,fullName',
        id: inFilter(userIds)
      }).catch(() => [])
    : [];

  const usersById = new Map(users.map((user) => [user.id, user]));

  const classStudents = classStudentsRaw.map((student) => ({
    id: student.id,
    admissionNo: student.admissionNo,
    classId: student.classId,
    user: { fullName: usersById.get(student.userId)?.fullName ?? 'Unknown Student' }
  }));

  const studentsById = new Map(classStudents.map((student) => [student.id, student]));
  const teachers = teachersRaw.map((teacher) => ({
    id: teacher.id,
    userId: teacher.userId,
    user: { fullName: usersById.get(teacher.userId)?.fullName ?? 'Unknown Teacher' }
  }));

  const dailyRows = dailyRowsRaw.map((row) => ({
    studentId: row.studentId,
    status: row.status
  }));

  const dailyStatusCountsMap = new Map<AttendanceStatus, number>();
  for (const row of dailyRows) {
    dailyStatusCountsMap.set(row.status, (dailyStatusCountsMap.get(row.status) ?? 0) + 1);
  }
  const dailyStatusCounts = ([AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.LATE, AttendanceStatus.EXCUSED] as AttendanceStatus[]).map((status) => ({
    status,
    _count: { _all: dailyStatusCountsMap.get(status) ?? 0 }
  }));

  const monthCountMap = new Map<string, Record<AttendanceStatus, number>>();
  for (const row of monthRowsRaw) {
    const key = toDateKey(row.date, selectedDate);
    const current = monthCountMap.get(key) ?? {
      [AttendanceStatus.PRESENT]: 0,
      [AttendanceStatus.ABSENT]: 0,
      [AttendanceStatus.LATE]: 0,
      [AttendanceStatus.EXCUSED]: 0
    };
    current[row.status] += 1;
    monthCountMap.set(key, current);
  }

  const monthStatusByDay = Array.from(monthCountMap.entries()).flatMap(([date, counts]) =>
    (Object.keys(counts) as AttendanceStatus[]).map((status) => ({
      date,
      status,
      _count: { _all: counts[status] }
    }))
  );

  const staffDailyRows = staffDailyRowsRaw.map((row) => {
    const teacher = teachers.find((item) => item.id === row.teacherId);
    return {
      teacherId: row.teacherId,
      userId: teacher?.userId ?? '',
      fullName: teacher?.user.fullName ?? 'Unknown Teacher',
      status: row.status,
      note: row.note ?? null
    };
  });

  const staffMonthlyMap = new Map<string, Record<AttendanceStatus, number>>();
  for (const row of staffMonthlyRowsRaw) {
    const current = staffMonthlyMap.get(row.teacherId) ?? {
      [AttendanceStatus.PRESENT]: 0,
      [AttendanceStatus.ABSENT]: 0,
      [AttendanceStatus.LATE]: 0,
      [AttendanceStatus.EXCUSED]: 0
    };
    current[row.status] += 1;
    staffMonthlyMap.set(row.teacherId, current);
  }

  const staffMonthlyRows = Array.from(staffMonthlyMap.entries()).flatMap(([teacherId, counts]) =>
    ([AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.LATE] as AttendanceStatus[]).map((status) => ({
      teacherId,
      status,
      count: counts[status] ?? 0
    }))
  );

  return {
    classes,
    dailyRows,
    dailyStatusCounts,
    monthStatusByDay,
    classStudents,
    teachers,
    staffDailyRows,
    staffMonthlyRows
  };
}

export default async function AdminAttendancePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requireAuth([UserRole.ADMIN]);

  const params = (await searchParams) ?? {};
  const selectedDate = params.date ?? new Date().toISOString().slice(0, 10);
  const selectedClassId = params.classId?.trim() ?? '';
  const initialTab = params.tab === 'students' || params.tab === 'teachers' || params.tab === 'overview' ? params.tab : 'overview';

  const dayDate = new Date(selectedDate);
  dayDate.setHours(0, 0, 0, 0);
  const monthStart = startOfMonth(dayDate);

  let classes: Array<{ id: string; name: string; section: string }> = [];
  let dailyRows: AttendancePayload['dailyRows'] = [];
  let dailyStatusCounts: AttendancePayload['dailyStatusCounts'] = [];
  let monthStatusByDay: AttendancePayload['monthStatusByDay'] = [];
  let classStudents: AttendancePayload['classStudents'] = [];
  let teachers: AttendancePayload['teachers'] = [];
  let staffDailyRows: StaffDailyRow[] = [];
  let staffMonthlyRows: StaffMonthlyRow[] = [];
  let attendanceDataLoadFailed = false;

  try {
    let staffAttendanceEnabled = false;
    try {
      staffAttendanceEnabled = await ensureStaffAttendanceTable();
    } catch (error) {
      console.warn('[admin/attendance] staff attendance bootstrap failed', error);
      if (!isDatabaseConnectionError(error)) throw error;
    }
    const data = await getCachedAttendanceData(
      selectedDate,
      selectedClassId,
      dayDate.toISOString(),
      monthStart.toISOString(),
      staffAttendanceEnabled ? '1' : '0'
    );
    classes = data.classes;
    dailyRows = data.dailyRows;
    dailyStatusCounts = data.dailyStatusCounts;
    monthStatusByDay = data.monthStatusByDay;
    classStudents = data.classStudents;
    teachers = data.teachers;
    staffDailyRows = data.staffDailyRows;
    staffMonthlyRows = data.staffMonthlyRows;
  } catch (error) {
    console.error('[admin/attendance] prisma load failed', error);
    try {
      const data = await loadAttendanceViaRest(selectedDate, selectedClassId, dayDate.toISOString(), monthStart.toISOString());
      classes = data.classes;
      dailyRows = data.dailyRows;
      dailyStatusCounts = data.dailyStatusCounts;
      monthStatusByDay = data.monthStatusByDay;
      classStudents = data.classStudents;
      teachers = data.teachers;
      staffDailyRows = data.staffDailyRows;
      staffMonthlyRows = data.staffMonthlyRows;
    } catch (restError) {
      console.error('[admin/attendance] rest fallback failed', restError);
      attendanceDataLoadFailed = true;
      if (!isDatabaseConnectionError(error) && !isLocalRestFallbackEnabled()) {
        throw error;
      }
    }
  }

  if (attendanceDataLoadFailed) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
        <h1 className="font-headline text-2xl font-bold text-[#1a1c1c]">Attendance</h1>
        <h2 className="mt-3 text-lg font-bold text-[#111827]">Database Unreachable</h2>
        <p className="mt-2 text-sm text-[#6b7280]">
          Attendance data is temporarily unavailable. Please refresh once the database connection recovers.
        </p>
      </div>
    );
  }

  const studentDailyMap = new Map(dailyRows.map((row) => [row.studentId, row.status]));
  const staffDailyMap = new Map(staffDailyRows.map((row) => [row.teacherId, row.status]));
  const staffMonthlyMap = new Map<string, { present: number; absent: number; late: number }>();
  for (const row of staffMonthlyRows) {
    const current = staffMonthlyMap.get(row.teacherId) ?? { present: 0, absent: 0, late: 0 };
    if (row.status === AttendanceStatus.PRESENT) current.present += row.count;
    if (row.status === AttendanceStatus.ABSENT) current.absent += row.count;
    if (row.status === AttendanceStatus.LATE) current.late += row.count;
    staffMonthlyMap.set(row.teacherId, current);
  }
  const classById = new Map(classes.map((item) => [item.id, item]));

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
      classes={classes}
      students={classStudents.map((student) => ({
        id: student.id,
        fullName: student.user.fullName,
        admissionNo: student.admissionNo,
        classId: student.classId ?? '',
        classLabel: student.classId ? (classById.get(student.classId) ? `${classById.get(student.classId)?.name} - ${classById.get(student.classId)?.section}` : 'No class') : 'No class',
        status: studentDailyMap.get(student.id) ?? null
      }))}
      teachers={teachers.map((teacher) => ({
        id: teacher.id,
        fullName: teacher.user.fullName,
        status: staffDailyMap.get(teacher.id) ?? null
      }))}
      teacherMonthlySummary={teachers.map((teacher) => {
        const summary = staffMonthlyMap.get(teacher.id) ?? { present: 0, absent: 0, late: 0 };
        return {
          teacherId: teacher.id,
          present: summary.present,
          absent: summary.absent,
          late: summary.late,
          total: summary.present + summary.absent + summary.late
        };
      })}
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
