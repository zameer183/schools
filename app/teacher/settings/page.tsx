import { UserRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  ensureTeacherControlTables,
  getTeacherAccessMapByTeacherId,
  getTeacherCompensationByTeacherId,
  TEACHER_ACCESS_MODULES,
  type TeacherAccessModule
} from '@/lib/teacher-access';
import { formatCurrency } from '@/lib/utils';
import { PageHeader, Card, StatusBadge } from '@/components/ui';
import { User, BookOpen, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

type StaffAttendanceRow = {
  date: Date;
  status: string;
  note: string | null;
  markedAt: Date;
};

async function ensureStaffAttendanceTable() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "StaffAttendance" (
        "id" TEXT PRIMARY KEY,
        "teacherId" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE,
        "date" DATE NOT NULL,
        "status" TEXT NOT NULL,
        "note" TEXT,
        "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("teacherId", "date")
      );
    `;
  } catch (error) {
    console.error('[teacher/settings] ensureStaffAttendanceTable failed', error);
  }
}

async function markSelfAttendance(formData: FormData) {
  'use server';

  const session = await requireAuth([UserRole.TEACHER]);
  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.id },
    select: { id: true }
  });

  if (!teacher) return;

  await ensureTeacherControlTables();
  const access = await getTeacherAccessMapByTeacherId(teacher.id);
  if (!access.STAFF_ATTENDANCE) return;

  const status = String(formData.get('status') ?? 'PRESENT').toUpperCase();
  const allowedStatuses = new Set(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED']);
  const safeStatus = allowedStatuses.has(status) ? status : 'PRESENT';
  const noteRaw = String(formData.get('note') ?? '').trim();
  const note = noteRaw.length > 0 ? noteRaw.slice(0, 300) : null;

  const today = new Date();
  const dateOnly = today.toISOString().slice(0, 10);
  const rowId = `${teacher.id}_${dateOnly}`;

  await ensureStaffAttendanceTable();
  try {
    await prisma.$executeRaw`
      INSERT INTO "StaffAttendance" ("id", "teacherId", "date", "status", "note", "markedAt")
      VALUES (${rowId}, ${teacher.id}, ${dateOnly}::date, ${safeStatus}, ${note}, NOW())
      ON CONFLICT ("teacherId", "date")
      DO UPDATE SET
        "status" = EXCLUDED."status",
        "note" = EXCLUDED."note",
        "markedAt" = NOW();
    `;
  } catch (error) {
    console.error('[teacher/settings] markSelfAttendance failed', error);
  }

  revalidatePath('/teacher/settings');
}

const MODULE_LABEL: Record<TeacherAccessModule, string> = {
  ACADEMICS: 'Academics',
  STUDENTS: 'Students',
  ATTENDANCE: 'Attendance',
  STAFF_ATTENDANCE: 'Staff Attendance',
  ASSIGNMENTS: 'Assignments',
  PROGRESS: 'Progress',
  MESSAGES: 'Messages',
  EXAMS: 'Exams',
  FEES: 'Fees'
};

function getStatusColor(status: string) {
  if (status === 'PRESENT') return 'bg-[#e8f5e9] text-[#1a5058]';
  if (status === 'LATE') return 'bg-[#fff3e0] text-[#865300]';
  if (status === 'ABSENT') return 'bg-[#fde8e8] text-[#ba1a1a]';
  return 'bg-[#e8f0ff] text-[#1a4bcc]';
}

export default async function TeacherSettingsPage() {
  const session = await requireAuth([UserRole.TEACHER, UserRole.ADMIN]);

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.id },
    include: {
      user: { select: { fullName: true, email: true, phone: true } },
      subjects: {
        select: { name: true, code: true, classId: true, class: { select: { name: true, section: true } } },
        orderBy: { name: 'asc' }
      },
      classAssignments: { include: { class: { select: { name: true, section: true } } }, orderBy: { createdAt: 'asc' } }
    }
  });

  if (!teacher) {
    return (
      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(43,103,110,0.06)] p-8">
        <h2 className="font-headline text-3xl font-bold text-[#1a1c1c]">Teacher Profile Missing</h2>
        <p className="mt-2 text-sm text-[#6f7979]">Your account is active but no teacher profile is linked yet. Contact admin.</p>
      </div>
    );
  }

  await ensureTeacherControlTables();
  await ensureStaffAttendanceTable();

  const [access, compensation] = await Promise.all([
    getTeacherAccessMapByTeacherId(teacher.id),
    getTeacherCompensationByTeacherId(teacher.id)
  ]);

  let recentAttendance: StaffAttendanceRow[] = [];
  let monthAttendance: StaffAttendanceRow[] = [];

  try {
    recentAttendance = await prisma.$queryRaw<StaffAttendanceRow[]>`
      SELECT "date", "status", "note", "markedAt"
      FROM "StaffAttendance"
      WHERE "teacherId" = ${teacher.id}
      ORDER BY "date" DESC
      LIMIT 10;
    `;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const nextMonthStart = new Date(monthStart);
    nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

    monthAttendance = await prisma.$queryRaw<StaffAttendanceRow[]>`
      SELECT "date", "status", "note", "markedAt"
      FROM "StaffAttendance"
      WHERE "teacherId" = ${teacher.id}
        AND "date" >= ${monthStart}
        AND "date" < ${nextMonthStart}
      ORDER BY "date" ASC;
    `;
  } catch (error) {
    console.error('[teacher/settings] attendance queries failed', error);
  }

  const todayDateOnly = new Date().toISOString().slice(0, 10);
  const todayRow = recentAttendance.find((row) => new Date(row.date).toISOString().slice(0, 10) === todayDateOnly);
  const todayStatus = todayRow ? todayRow.status : 'Not marked';

  const teachingClasses = Array.from(
    new Set([
      ...teacher.classAssignments.map((item) => `${item.class.name} - ${item.class.section}`),
      ...teacher.subjects.map((subject) => `${subject.class.name} - ${subject.class.section}`)
    ])
  );

  const currentMonth = new Date();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const monthlyMap = new Map(
    monthAttendance.map((row) => [new Date(row.date).toISOString().slice(0, 10), row.status])
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Complete profile, attendance, access, and salary overview."
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D1FAE5]">
              <User className="h-4 w-4 text-[#10B981]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F2937]">Profile</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]"><p className="text-xs text-[#6B7280]">Name</p><p className="font-semibold text-[#1F2937] mt-1">{teacher.user.fullName}</p></div>
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]"><p className="text-xs text-[#6B7280]">Email (Login ID)</p><p className="font-semibold text-[#1F2937] mt-1">{teacher.user.email}</p></div>
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]"><p className="text-xs text-[#6B7280]">Phone</p><p className="font-semibold text-[#1F2937] mt-1">{teacher.user.phone ?? '-'}</p></div>
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]"><p className="text-xs text-[#6B7280]">Position</p><p className="font-semibold text-[#1F2937] mt-1">{teacher.specialization ?? '-'}</p></div>
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]"><p className="text-xs text-[#6B7280]">Department</p><p className="font-semibold text-[#1F2937] mt-1">{teacher.qualification ?? '-'}</p></div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e0eff0]">
              <BookOpen className="h-4 w-4 text-[#2b676e]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F2937]">Class & Subject Scope</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280]">Assigned Classes</p>
              <p className="font-semibold text-[#1F2937] mt-1">{teachingClasses.length ? teachingClasses.join(', ') : 'No classes assigned'}</p>
            </div>
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280]">Subjects</p>
              <p className="font-semibold text-[#1F2937] mt-1">{teacher.subjects.length ? teacher.subjects.map((subject) => `${subject.name} (${subject.code})`).join(', ') : 'No subjects assigned'}</p>
            </div>
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280]">Salary</p>
              <p className="font-semibold text-[#1F2937] mt-1">{formatCurrency(compensation.baseSalary)}</p>
              <p className="mt-1 text-xs text-[#6B7280]">Bonus: {formatCurrency(compensation.bonus)} | Deduction: {formatCurrency(compensation.deduction)} | Net: {formatCurrency(compensation.netSalary)}</p>
            </div>
          </div>
        </Card>
      </section>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fdf0e0]">
            <CheckCircle2 className="h-4 w-4 text-[#df8d29]" />
          </div>
          <h3 className="text-sm font-bold text-[#1F2937]">Access Granted By Admin</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TEACHER_ACCESS_MODULES.map((module) => (
            <div key={module} className="flex items-center justify-between rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-2.5 text-sm">
              <span className="font-medium text-[#1F2937]">{MODULE_LABEL[module]}</span>
              <StatusBadge variant={access[module] ? 'success' : 'danger'}>
                {access[module] ? 'Enabled' : 'Disabled'}
              </StatusBadge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-[#1F2937]">My Attendance</h3>
            <p className="mt-1 text-sm text-[#6B7280]">Mark your own daily attendance and review previous days.</p>
          </div>
          <div className="rounded-full bg-[#fdf0e0] px-3 py-1 text-xs font-semibold text-[#df8d29]">Today: {todayStatus}</div>
        </div>

        {access.STAFF_ATTENDANCE ? (
          <form action={markSelfAttendance} className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
            <select name="status" className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#1a5058]/20" defaultValue="PRESENT">
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
              <option value="EXCUSED">Excused</option>
            </select>
            <input name="note" placeholder="Optional note" className="h-10 rounded-xl bg-[#edeeef] border-none px-3 text-sm outline-none focus:ring-2 focus:ring-[#1a5058]/20" />
            <button className="h-10 rounded-xl bg-gradient-to-br from-[#2b676e] to-[#1a5058] shadow-[0_8px_20px_rgba(43,103,110,0.12)] active:scale-[0.98] transition-all px-4 text-sm font-semibold text-white">Mark Attendance</button>
          </form>
        ) : (
          <p className="mt-4 rounded-xl bg-[#fde8e8] px-4 py-3 text-sm text-[#ba1a1a]">Staff attendance module disabled by admin.</p>
        )}

        <div className="mt-6">
          <h4 className="mb-2 text-sm font-semibold text-[#1a1c1c]">Attendance Calendar ({currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})</h4>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: daysInMonth }, (_, idx) => idx + 1).map((day) => {
              const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const key = dateObj.toISOString().slice(0, 10);
              const status = monthlyMap.get(key) ?? 'UNMARKED';
              const style = status === 'PRESENT'
                ? 'bg-[#e8f5e9] text-[#1a5058]'
                : status === 'LATE'
                  ? 'bg-[#fff3e0] text-[#865300]'
                  : status === 'ABSENT'
                    ? 'bg-[#fde8e8] text-[#ba1a1a]'
                    : status === 'EXCUSED'
                      ? 'bg-[#e8f0ff] text-[#1a4bcc]'
                      : 'bg-[#f3f4f5] text-[#6f7979]';

              return (
                <div key={key} className={`rounded-xl px-2 py-2 text-center text-xs ${style}`}>
                  <p className="font-bold">{day}</p>
                  <p className="mt-0.5 text-[9px]">{status === 'UNMARKED' ? '-' : status.slice(0, 1)}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[540px] text-sm">
            <thead>
              <tr className="border-b border-[#e2e8e8]">
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Date</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Status</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Note</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8e8]">
              {recentAttendance.map((row) => (
                <tr key={`${new Date(row.date).toISOString()}-${new Date(row.markedAt).toISOString()}`}>
                  <td className="py-3 font-medium text-[#1a1c1c]">{new Date(row.date).toLocaleDateString('en-CA')}</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusColor(row.status)}`}>{row.status}</span>
                  </td>
                  <td className="py-3 text-[#6f7979]">{row.note || '-'}</td>
                  <td className="py-3 text-[#6f7979]">{new Date(row.markedAt).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentAttendance.length === 0 ? <p className="mt-3 text-sm text-[#6B7280]">No attendance records yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
