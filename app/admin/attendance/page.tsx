import { AttendanceStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type SearchParams = { date?: string; classId?: string };

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
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Attendance</h2>
        <p className="mt-1 text-sm text-[#6f7979]">Track daily attendance, absentee trends, and class-wise compliance.</p>

        <form className="mt-5 flex flex-wrap gap-3">
          <input
            type="date"
            name="date"
            defaultValue={selectedDate}
            className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649]"
          />
          <select
            name="classId"
            defaultValue={selectedClassId}
            className="h-10 rounded-lg border border-[#d4dee7] px-3 text-sm outline-none focus:border-[#004649]"
          >
            <option value="">All Classes</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{item.name} - {item.section}</option>
            ))}
          </select>
          <button className="h-10 rounded-lg bg-[#004649] px-4 text-sm font-semibold text-white hover:bg-[#005a5e]">
            Apply Filter
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Present', value: countFor('PRESENT'), color: 'text-[#004649]' },
          { label: 'Absent', value: countFor('ABSENT'), color: 'text-[#ba1a1a]' },
          { label: 'Late', value: countFor('LATE'), color: 'text-[#865300]' },
          { label: 'Excused', value: countFor('EXCUSED'), color: 'text-[#1a1c1c]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl bg-white border border-[#e2e8e8] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">{label}</p>
            <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h3 className="font-semibold text-[#1a1c1c] mb-4">Attendance Register</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8e8]">
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Student</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Class</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Status</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8e8]">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="py-3 font-medium text-[#1a1c1c]">{record.student.user.fullName}</td>
                  <td className="py-3 text-[#6f7979]">{record.class.name} - {record.class.section}</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      record.status === 'PRESENT' ? 'bg-[#e8f5e9] text-[#004649]' :
                      record.status === 'ABSENT' ? 'bg-[#fde8e8] text-[#ba1a1a]' :
                      record.status === 'LATE' ? 'bg-[#fff3e0] text-[#865300]' :
                      'bg-[#f5f7f5] text-[#6f7979]'
                    }`}>{record.status}</span>
                  </td>
                  <td className="py-3 text-[#6f7979]">{record.remarks ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 ? <p className="mt-4 text-sm text-[#6f7979]">No attendance rows found for this filter.</p> : null}
        </div>
      </div>
    </div>
  );
}
