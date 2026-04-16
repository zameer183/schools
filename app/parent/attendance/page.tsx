import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getParentContext } from '@/lib/parent-data';

export const dynamic = 'force-dynamic';

export default async function ParentAttendancePage() {
  const session = await requireAuth([UserRole.PARENT, UserRole.ADMIN]);
  const context = await getParentContext(session.id);

  if (!context) {
    return (
      <div className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
        <h2 className="text-2xl font-bold text-[#1a1c1c]">Attendance</h2>
        <p className="mt-2 text-[#5c6668]">Parent profile missing.</p>
      </div>
    );
  }

  const { childIds } = context;

  const [summary, records] = await Promise.all([
    prisma.attendance.groupBy({
      by: ['status'],
      where: { studentId: { in: childIds } },
      _count: { _all: true }
    }),
    prisma.attendance.findMany({
      where: { studentId: { in: childIds } },
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        class: { select: { name: true, section: true } }
      },
      orderBy: { date: 'desc' },
      take: 40
    })
  ]);

  const total = summary.reduce((sum, item) => sum + item._count._all, 0);
  const present = summary.filter((item) => item.status === 'PRESENT').reduce((sum, item) => sum + item._count._all, 0);
  const attendanceRate = total ? Math.round((present / total) * 100) : 0;

  const countFor = (status: string) => summary.find((item) => item.status === status)?._count._all ?? 0;

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
        <h2 className="text-2xl font-bold text-[#1a1c1c]">Attendance Tracking</h2>
        <p className="mt-2 text-[#5c6668]">Overall attendance rate across children: {attendanceRate}%</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white p-5 border border-[#e2e8e8]">
          <p className="text-sm text-[#6e7778]">Present</p>
          <p className="mt-2 text-3xl font-black text-[#004649]">{countFor('PRESENT')}</p>
        </div>
        <div className="rounded-xl bg-white p-5 border border-[#e2e8e8]">
          <p className="text-sm text-[#6e7778]">Absent</p>
          <p className="mt-2 text-3xl font-black text-[#895100]">{countFor('ABSENT')}</p>
        </div>
        <div className="rounded-xl bg-white p-5 border border-[#e2e8e8]">
          <p className="text-sm text-[#6e7778]">Late</p>
          <p className="mt-2 text-3xl font-black text-[#1b5e62]">{countFor('LATE')}</p>
        </div>
        <div className="rounded-xl bg-white p-5 border border-[#e2e8e8]">
          <p className="text-sm text-[#6e7778]">Excused</p>
          <p className="mt-2 text-3xl font-black text-[#596364]">{countFor('EXCUSED')}</p>
        </div>
      </section>

      <section className="rounded-xl bg-white p-8 border border-[#e2e8e8]">
        <h3 className="font-semibold text-[#1a1c1c]">Recent Attendance Register</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f4f3] text-[#5c6668]">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Student</th>
                <th className="px-3 py-2 text-left">Class</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-[#eef1f1]">
                  <td className="px-3 py-3">{record.date.toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-3">{record.student.user.fullName}</td>
                  <td className="px-3 py-3">{record.class.name} - {record.class.section}</td>
                  <td className="px-3 py-3 font-semibold text-[#004649]">{record.status}</td>
                  <td className="px-3 py-3 text-[#5c6668]">{record.remarks ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {records.length === 0 ? <p className="mt-4 text-sm text-[#5c6668]">No attendance entries found yet.</p> : null}
      </section>
    </div>
  );
}
