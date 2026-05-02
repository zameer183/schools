import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader, KpiCard, Card, StatusBadge } from '@/components/ui';
import { Users2, AlertCircle, Calendar, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

type SearchParams = {
  from?: string;
  to?: string;
};

function fmtDate(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toISOString().slice(0, 10);
}

const getCachedStudentAttendanceData = unstable_cache(
  async (userId: string, fromParam: string, toParam: string) => {
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true, classId: true }
    });

    if (!student) {
      return { student: null, summary: [], records: [], weekRows: [], monthRows: [] };
    }

    const fromDate = fromParam ? new Date(fromParam) : undefined;
    const toDate = toParam ? new Date(toParam) : undefined;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const [summary, records, weekRows, monthRows] = await Promise.all([
      prisma.attendance.groupBy({
        by: ['status'],
        where: {
          studentId: student.id,
          ...((fromDate || toDate)
            ? {
                date: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {})
                }
              }
            : {})
        },
        _count: { _all: true }
      }),
      prisma.attendance.findMany({
        where: {
          studentId: student.id,
          ...((fromDate || toDate)
            ? {
                date: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {})
                }
              }
            : {})
        },
        include: {
          class: { select: { name: true, section: true } }
        },
        orderBy: { date: 'desc' }
      }),
      prisma.attendance.findMany({
        where: {
          studentId: student.id,
          date: { gte: new Date(Date.now() - 6 * 86400000), lte: new Date() }
        },
        select: { status: true }
      }),
      prisma.attendance.findMany({
        where: {
          studentId: student.id,
          date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1), lte: new Date() }
        },
        select: { status: true }
      })
    ]);

    return { student, summary, records, weekRows, monthRows };
  },
  ['student-attendance-page-data'],
  { revalidate: 30 }
);

export default async function StudentAttendancePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);
  const params = (await searchParams) ?? {};
  const fromParam = params.from?.trim() ?? '';
  const toParam = params.to?.trim() ?? '';
  const { student, summary, records, weekRows, monthRows } = await getCachedStudentAttendanceData(
    session.id,
    fromParam,
    toParam
  );

  if (!student) {
    return (
      <Card className="p-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1F2937]">Attendance</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Student profile missing.</p>
      </Card>
    );
  }

  const total = summary.reduce((sum, item) => sum + item._count._all, 0);
  const present = summary.filter((item) => item.status === 'PRESENT').reduce((sum, item) => sum + item._count._all, 0);
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

  const countFor = (status: string) => summary.find((item) => item.status === status)?._count._all ?? 0;
  const countFromRows = (rows: { status: string }[], status: string) => rows.filter((row) => row.status === status).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        subtitle={`Complete record by date. Current rate: ${attendanceRate}%`}
      />

      <Card>
        <form className="flex flex-wrap gap-3">
          <input type="date" name="from" defaultValue={params.from ?? ''} className="h-10 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] px-3 text-sm text-[#1F2937] outline-none focus:ring-2 focus:ring-[#1F5A5C]/20" />
          <input type="date" name="to" defaultValue={params.to ?? ''} className="h-10 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] px-3 text-sm text-[#1F2937] outline-none focus:ring-2 focus:ring-[#1F5A5C]/20" />
          <button className="h-10 rounded-lg bg-[#1F5A5C] px-4 text-sm font-semibold text-white hover:bg-[#1a4a4d] transition-colors">Filter</button>
        </form>
      </Card>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard variant="success" icon={<CheckCircle2 />} label="Present" value={countFor('PRESENT')} />
        <KpiCard variant="danger" icon={<AlertCircle />} label="Absent" value={countFor('ABSENT')} />
        <KpiCard variant="primary" icon={<Calendar />} label="This Week" value={countFromRows(weekRows, 'PRESENT')} />
        <KpiCard variant="primary" icon={<Users2 />} label="This Month" value={countFromRows(monthRows, 'PRESENT')} />
      </section>

      <Card>
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-10 w-10 text-[#E5E7EB]" />
            <p className="mt-2 text-sm text-[#9CA3AF]">No attendance records yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#F9FAFB] text-[#6B7280] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Date</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Class</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-[#E5E7EB] last:border-b-0">
                    <td className="px-3 py-3 text-[#1F2937]">{fmtDate(record.date)}</td>
                    <td className="px-3 py-3 text-[#6B7280]">{record.class.name} - {record.class.section}</td>
                    <td className="px-3 py-3">
                      <StatusBadge variant={record.status === 'PRESENT' ? 'success' : 'danger'}>
                        {record.status}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-3 text-[#6B7280]">{record.remarks ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
