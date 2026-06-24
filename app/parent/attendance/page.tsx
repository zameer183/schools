import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getParentContext } from '@/lib/parent-data';
import { PageHeader, KpiCard, Card, StatusBadge } from '@/components/ui';
import { AlertCircle, Calendar, CheckCircle2, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

function fmtDate(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toISOString().slice(0, 10);
}

export default async function ParentAttendancePage() {
  const session = await requireAuth([UserRole.PARENT, UserRole.ADMIN]);
  const context = await getParentContext(session.id);

  if (!context) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center text-center py-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FEE2E2]">
            <AlertCircle className="h-7 w-7 text-[#EF4444]" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[#1F2937]">Attendance Unavailable</h2>
          <p className="mt-1 max-w-sm text-sm text-[#6B7280]">Parent profile missing. Contact your administrator.</p>
        </div>
      </Card>
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
  const present = summary
    .filter((item) => item.status === 'PRESENT')
    .reduce((sum, item) => sum + item._count._all, 0);
  const attendanceRate = total ? Math.round((present / total) * 100) : 0;

  const countFor = (status: string) => summary.find((item) => item.status === status)?._count._all ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Tracking"
        subtitle={`Overall attendance rate across children: ${attendanceRate}%`}
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard variant="success" icon={<CheckCircle2 />} label="Present" value={countFor('PRESENT')} />
        <KpiCard variant="danger" icon={<AlertCircle />} label="Absent" value={countFor('ABSENT')} />
        <KpiCard variant="accent" icon={<Clock />} label="Late" value={countFor('LATE')} />
        <KpiCard variant="primary" icon={<Calendar />} label="Excused" value={countFor('EXCUSED')} />
      </section>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0EBEC]">
            <Calendar className="h-4 w-4 text-[#1F5A5C]" />
          </div>
          <h3 className="text-sm font-bold text-[#1F2937]">Recent Attendance Register</h3>
        </div>

        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-10 w-10 text-[#E5E7EB]" />
            <p className="mt-2 text-sm text-[#9CA3AF]">No attendance entries found yet</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="rounded-lg bg-[#F9FAFB] p-3 border border-[#E5E7EB] text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#1F2937] truncate">{record.student.user.fullName}</p>
                      <p className="text-xs text-[#6B7280] truncate">
                        {record.class.name} - {record.class.section}
                      </p>
                    </div>
                    <StatusBadge
                      variant={
                        record.status === 'PRESENT'
                          ? 'success'
                          : record.status === 'ABSENT'
                          ? 'danger'
                          : record.status === 'LATE'
                          ? 'pending'
                          : 'info'
                      }
                    >
                      {record.status}
                    </StatusBadge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-[#6B7280]">
                    <span>{fmtDate(record.date)}</span>
                    {record.remarks ? <span className="truncate ml-2">{record.remarks}</span> : null}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead className="bg-[#F9FAFB] text-[#6B7280] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold">Student</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold">Class</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b border-[#E5E7EB] last:border-b-0">
                      <td className="px-3 py-3 text-[#1F2937]">{fmtDate(record.date)}</td>
                      <td className="px-3 py-3 text-[#1F2937]">{record.student.user.fullName}</td>
                      <td className="px-3 py-3 text-[#6B7280]">
                        {record.class.name} - {record.class.section}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          variant={
                            record.status === 'PRESENT'
                              ? 'success'
                              : record.status === 'ABSENT'
                              ? 'danger'
                              : record.status === 'LATE'
                              ? 'pending'
                              : 'info'
                          }
                        >
                          {record.status}
                        </StatusBadge>
                      </td>
                      <td className="px-3 py-3 text-[#6B7280]">{record.remarks ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
