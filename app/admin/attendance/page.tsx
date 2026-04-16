import { AttendanceStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type SearchParams = { date?: string; classId?: string };

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'teal' | 'rose' | 'amber' | 'blue' }) {
  const toneClass =
    tone === 'teal'
      ? 'text-[#124346]'
      : tone === 'rose'
        ? 'text-rose-700'
        : tone === 'amber'
          ? 'text-amber-700'
          : 'text-blue-700';

  return (
    <div className="rounded-xl bg-[#f3f4f3] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">{label}</p>
      <p className={`font-headline mt-2 text-3xl font-extrabold ${toneClass}`}>{value}</p>
    </div>
  );
}

export default async function AdminAttendancePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const selectedDate = params.date ?? new Date().toISOString().slice(0, 10);
  const selectedClassId = params.classId ?? '';

  const where = {
    date: new Date(selectedDate),
    classId: selectedClassId || undefined
  };

  const [classes, records, statusCounts] = await Promise.all([
    prisma.class.findMany({ orderBy: [{ name: 'asc' }, { section: 'asc' }] }),
    prisma.attendance.findMany({
      where,
      include: { class: true, student: { include: { user: { select: { fullName: true } } } } },
      orderBy: [{ class: { name: 'asc' } }, { student: { admissionNo: 'asc' } }],
      take: 400
    }),
    prisma.attendance.groupBy({ by: ['status'], where, _count: { _all: true } })
  ]);

  const countFor = (status: AttendanceStatus) => statusCounts.find((item) => item.status === status)?._count._all ?? 0;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.2rem] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#6e7778]">Attendance</p>
        <h2 className="font-headline mt-1 text-4xl font-extrabold tracking-[-0.03em] text-[#124346] md:text-5xl">Attendance Management</h2>
        <p className="mt-2 text-[#596364]">Track daily attendance, absentee trends, and class-wise compliance.</p>

        <form className="mt-5 grid gap-3 md:grid-cols-3">
          <input type="date" name="date" defaultValue={selectedDate} className="h-11 rounded-xl border border-[#c0c8c9] px-3" />
          <select name="classId" defaultValue={selectedClassId} className="h-11 rounded-xl border border-[#c0c8c9] px-3">
            <option value="">All Classes</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{item.name} - {item.section}</option>
            ))}
          </select>
          <button className="h-11 rounded-xl bg-[#124346] px-4 font-semibold text-white">Apply Filter</button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Present" value={countFor('PRESENT')} tone="teal" />
        <StatCard label="Absent" value={countFor('ABSENT')} tone="rose" />
        <StatCard label="Late" value={countFor('LATE')} tone="amber" />
        <StatCard label="Excused" value={countFor('EXCUSED')} tone="blue" />
      </section>

      <section className="rounded-[1.2rem] bg-white p-7 shadow-[0px_12px_32px_rgba(26,28,28,0.06)]">
        <h3 className="font-headline text-2xl font-bold tracking-[-0.02em] text-[#124346]">Attendance Register</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f4f3] text-[#596364]">
              <tr>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Student</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Class</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Status</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-semibold text-[#1a1c1c]">{record.student.user.fullName}</td>
                  <td className="px-3 py-3">{record.class.name} - {record.class.section}</td>
                  <td className="px-3 py-3">{record.status}</td>
                  <td className="px-3 py-3 text-[#596364]">{record.remarks ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 ? <p className="mt-4 text-sm text-[#596364]">No attendance rows found for this filter.</p> : null}
        </div>
      </section>
    </div>
  );
}
