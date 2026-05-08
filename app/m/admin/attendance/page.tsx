import { ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const STATUS_BADGE = {
  PRESENT: { label: 'Present', cls: 'bg-[#1B4D4B] text-white' },
  LATE:    { label: 'Late',    cls: 'bg-[#E68A00] text-[#4A1B0C]' },
  ABSENT:  { label: 'Absent',  cls: 'bg-[#B91C1C] text-white' },
  EXCUSED: { label: 'Excused', cls: 'bg-[#6B7280] text-white' }
} as const;

export default async function MobileAdminAttendancePage() {
  const records = await prisma.attendance.findMany({
    orderBy: { date: 'desc' },
    take: 20,
    include: {
      student: {
        include: {
          user: { select: { fullName: true } },
          class: { select: { name: true, section: true } }
        }
      }
    }
  });

  const counts = records.reduce(
    (acc, r) => {
      if (r.status === 'PRESENT') acc.present += 1;
      else if (r.status === 'LATE') acc.late += 1;
      else if (r.status === 'ABSENT') acc.absent += 1;
      return acc;
    },
    { present: 0, late: 0, absent: 0 }
  );

  const grouped = records.reduce<Record<string, typeof records>>((acc, r) => {
    const key = r.date.toISOString().slice(0, 10);
    (acc[key] ||= []).push(r);
    return acc;
  }, {});

  return (
    <div className="flex flex-col">
      <header className="px-4 pt-5 pb-3">
        <h1 className="text-lg font-semibold text-[#111]">Attendance</h1>
        <p className="text-[10px] text-[#6B7280]">Recent records · {records.length} entries</p>
      </header>

      <section className="mx-4 mb-3 rounded-2xl bg-[#1B4D4B] p-4 text-white">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] opacity-75">Latest 20 records</p>
            <p className="text-sm font-medium">All classes</p>
          </div>
          <ChevronRight className="h-4 w-4" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 rounded-xl bg-white/10 p-2 text-center">
            <p className="text-[9px] opacity-80">Present</p>
            <p className="text-base font-semibold">{counts.present}</p>
          </div>
          <div className="flex-1 rounded-xl bg-[#E68A00]/40 p-2 text-center">
            <p className="text-[9px]">Late</p>
            <p className="text-base font-semibold">{counts.late}</p>
          </div>
          <div className="flex-1 rounded-xl bg-white/10 p-2 text-center">
            <p className="text-[9px] opacity-80">Absent</p>
            <p className="text-base font-semibold">{counts.absent}</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 px-4 pb-4">
        {records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E5E7EB] py-10 text-center text-xs text-[#6B7280]">
            No attendance recorded yet
          </div>
        ) : (
          Object.entries(grouped).map(([dateKey, rows]) => {
            const d = new Date(dateKey);
            return (
              <div key={dateKey}>
                <p className="mb-1.5 text-[10px] uppercase tracking-wider text-[#6B7280]">
                  {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {rows.map((r) => {
                    const initials = r.student.user.fullName
                      .split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
                    const classLabel = r.student.class
                      ? `Grade ${r.student.class.name}-${r.student.class.section}`
                      : 'Unassigned';
                    const badge = STATUS_BADGE[r.status as keyof typeof STATUS_BADGE];

                    return (
                      <li key={r.id} className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1B4D4B]/10 text-[10px] font-medium text-[#1B4D4B]">
                          {initials || 'ST'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-xs font-medium text-[#111]">{r.student.user.fullName}</p>
                          <p className="truncate text-[10px] text-[#6B7280]">
                            {r.student.admissionNo} · {classLabel}
                          </p>
                        </div>
                        <span className={`rounded-md px-2 py-1 text-[9px] font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
