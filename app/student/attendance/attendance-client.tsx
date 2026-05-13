'use client';

import { useRouter } from 'next/navigation';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

type AttendanceRecord = {
  date: string;
  status: AttendanceStatus;
  remarks: string | null;
};

type Props = {
  fullName: string;
  admissionNo: string;
  className: string;
  isActive: boolean;
  monthKey: string; // "2026-05"
  records: AttendanceRecord[];
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_STYLES: Record<AttendanceStatus, { cell: string; dot: string; badge: string }> = {
  PRESENT: {
    cell: 'bg-[#dcfce7] text-[#15803d]',
    dot: 'bg-[#16a34a]',
    badge: 'bg-[#dcfce7] text-[#15803d]',
  },
  ABSENT: {
    cell: 'bg-[#fee2e2] text-[#b91c1c]',
    dot: 'bg-[#dc2626]',
    badge: 'bg-[#fee2e2] text-[#b91c1c]',
  },
  LATE: {
    cell: 'bg-[#fff7ed] text-[#b45309]',
    dot: 'bg-[#d97706]',
    badge: 'bg-[#fff7ed] text-[#b45309]',
  },
  EXCUSED: {
    cell: 'bg-[#eff6ff] text-[#1d4ed8]',
    dot: 'bg-[#2563eb]',
    badge: 'bg-[#eff6ff] text-[#1d4ed8]',
  },
};

function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthYear(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Monday=0, ..., Sunday=6
function firstDayOffset(year: number, month: number): number {
  const d = new Date(year, month - 1, 1).getDay(); // 0=Sun, 1=Mon ... 6=Sat
  return d === 0 ? 6 : d - 1;
}

export default function AttendanceClient({
  fullName,
  admissionNo,
  className,
  isActive,
  monthKey,
  records,
}: Props) {
  const router = useRouter();

  const [year, month] = monthKey.split('-').map(Number);
  const totalDays = daysInMonth(year, month);
  const offset = firstDayOffset(year, month);

  // Today's date string
  const todayStr = new Date().toISOString().slice(0, 10);

  // Build a map dateStr → record
  const recordMap = new Map<string, AttendanceRecord>();
  for (const rec of records) {
    recordMap.set(rec.date, rec);
  }

  // Stats
  const countStatus = (s: AttendanceStatus) => records.filter((r) => r.status === s).length;
  const presentCount = countStatus('PRESENT');
  const absentCount = countStatus('ABSENT');
  const lateCount = countStatus('LATE');
  const excusedCount = countStatus('EXCUSED');

  // Build calendar cells: null = blank padding
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  function handleNav(delta: number) {
    const newKey = shiftMonth(monthKey, delta);
    router.push(`/student/attendance?month=${newKey}`);
  }

  return (
    <div className="pb-28 px-4 pt-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4">
        <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Attendance</p>
        <p className="mt-1 text-xl font-bold text-[#1a1c1c]">{fullName}</p>
        <div className="mt-1 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-[#6b7280]">{className}</span>
          <span className="text-xs text-[#6b7280]">Adm: {admissionNo}</span>
          {isActive ? (
            <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-semibold text-[#15803d]">Active</span>
          ) : (
            <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[10px] font-semibold text-[#b91c1c]">Inactive</span>
          )}
        </div>
      </div>

      {/* Month Navigator */}
      <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleNav(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#004649] hover:bg-[#e2e8f0] transition-colors"
            aria-label="Previous month"
          >
            &#8592;
          </button>
          <span className="text-base font-bold text-[#1a1c1c]">{formatMonthYear(monthKey)}</span>
          <button
            onClick={() => handleNav(1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#004649] hover:bg-[#e2e8f0] transition-colors"
            aria-label="Next month"
          >
            &#8594;
          </button>
        </div>

        {/* Day headers */}
        <div className="mt-4 grid grid-cols-7 gap-1">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider py-1">
              {d}
            </div>
          ))}

          {/* Calendar cells */}
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`blank-${idx}`} />;
            }

            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const rec = recordMap.get(dateStr);
            const isToday = dateStr === todayStr;

            const cellBase =
              'relative aspect-square rounded-xl flex items-center justify-center text-sm font-semibold select-none';

            const colorClass = rec
              ? STATUS_STYLES[rec.status].cell
              : 'bg-[#f1f5f9] text-[#94a3b8]';

            const todayRing = isToday ? 'ring-2 ring-[#004649] ring-offset-1' : '';

            const dotColor = rec ? STATUS_STYLES[rec.status].dot : null;

            return (
              <div key={dateStr} className={`${cellBase} ${colorClass} ${todayRing}`}>
                {day}
                {dotColor && (
                  <span
                    className={`absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full ${dotColor}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats row — 2×2 grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#dcfce7]">
            <span className="text-lg font-black text-[#15803d]">{presentCount}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6b7280]">Present</p>
            <p className="text-xs text-[#94a3b8]">days this month</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fee2e2]">
            <span className="text-lg font-black text-[#b91c1c]">{absentCount}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6b7280]">Absent</p>
            <p className="text-xs text-[#94a3b8]">days this month</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff7ed]">
            <span className="text-lg font-black text-[#b45309]">{lateCount}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6b7280]">Late</p>
            <p className="text-xs text-[#94a3b8]">arrivals</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff]">
            <span className="text-lg font-black text-[#1d4ed8]">{excusedCount}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6b7280]">Leave</p>
            <p className="text-xs text-[#94a3b8]">excused</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4">
        <p className="text-xs font-semibold text-[#6b7280] mb-3">Legend</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {(
            [
              { label: 'Present', dot: 'bg-[#16a34a]' },
              { label: 'Absent', dot: 'bg-[#dc2626]' },
              { label: 'Late', dot: 'bg-[#d97706]' },
              { label: 'Leave', dot: 'bg-[#2563eb]' },
              { label: 'Not marked', dot: 'bg-[#cbd5e1]' },
            ] as const
          ).map(({ label, dot }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
              <span className="text-xs text-[#6b7280]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
