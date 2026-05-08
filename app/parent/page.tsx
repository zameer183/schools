import Link from 'next/link';
import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getParentContext } from '@/lib/parent-data';
import { PageHeader, KpiCard, Card, StatusBadge } from '@/components/ui';
import {
  AlertCircle,
  Award,
  Bell,
  BookOpen,
  CalendarCheck2,
  ChevronRight,
  TrendingUp,
  Wallet,
  Users2
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const getCachedParentDashboardData = unstable_cache(
  async (userId: string) => {
    const context = await getParentContext(userId);
    if (!context || context.children.length === 0) {
      return {
        context,
        attendanceSummary: [],
        resultRows: [],
        feeRows: [],
        unreadNotifications: 0,
        recentAttendance: [],
        recentNotifications: []
      };
    }

    const { childIds } = context;
    const [
      attendanceSummary,
      resultRows,
      feeRows,
      unreadNotifications,
      recentAttendance,
      recentNotifications
    ] = await Promise.all([
      prisma.attendance.groupBy({
        by: ['status'],
        where: { studentId: { in: childIds } },
        _count: { _all: true }
      }),
      prisma.result.findMany({
        where: { studentId: { in: childIds } },
        include: {
          student: { include: { user: { select: { fullName: true } } } },
          subject: { select: { name: true } },
          exam: { select: { title: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 6
      }),
      prisma.fee.findMany({
        where: { studentId: { in: childIds } },
        include: {
          student: { include: { user: { select: { fullName: true } } } },
          payments: { select: { amountPaid: true } }
        },
        orderBy: { dueDate: 'asc' }
      }),
      prisma.notification.count({
        where: {
          isRead: false,
          OR: [{ userId }, { studentId: { in: childIds } }]
        }
      }),
      prisma.attendance.findMany({
        where: { studentId: { in: childIds } },
        select: {
          id: true,
          date: true,
          status: true,
          student: { select: { user: { select: { fullName: true } } } }
        },
        orderBy: { date: 'desc' },
        take: 5
      }),
      prisma.notification.findMany({
        where: { OR: [{ userId }, { studentId: { in: childIds } }] },
        select: { id: true, title: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    return {
      context,
      attendanceSummary,
      resultRows,
      feeRows,
      unreadNotifications,
      recentAttendance,
      recentNotifications
    };
  },
  ['parent-dashboard-page-data'],
  { revalidate: 30 }
);

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default async function ParentDashboardPage() {
  const session = await requireAuth([UserRole.PARENT, UserRole.ADMIN]);
  const {
    context,
    attendanceSummary,
    resultRows,
    feeRows,
    unreadNotifications,
    recentAttendance,
    recentNotifications
  } = await getCachedParentDashboardData(session.id);

  if (!context) {
    return (
      <div className="w-full min-w-0 space-y-5">
        <section className="rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col items-center py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FEE2E2]">
              <AlertCircle className="h-8 w-8 text-[#EF4444]" strokeWidth={1.5} />
            </div>
            <h2 className="mt-4 text-xl font-bold text-[#111827]">Parent Profile Missing</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#6B7280]">
              Your account is active but no parent profile is linked yet. Please contact your administrator.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const { children, parent } = context;

  if (children.length === 0) {
    return (
      <div className="w-full min-w-0 space-y-5">
        <PageHeader title="Parent Dashboard" subtitle="No linked children yet." />
        <Card className="p-8">
          <div className="flex flex-col items-center text-center py-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F5E6CC]">
              <Users2 className="h-7 w-7 text-[#D69E3F]" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#1F2937]">No Children Linked</h3>
            <p className="mt-1 max-w-sm text-sm text-[#6B7280]">
              No children are linked with your profile yet. Please contact the admin office to link your children.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const totalAttendance = attendanceSummary.reduce((sum, row) => sum + row._count._all, 0);
  const present = attendanceSummary
    .filter((row) => row.status === 'PRESENT')
    .reduce((sum, row) => sum + row._count._all, 0);
  const attendanceRate = totalAttendance > 0 ? Math.round((present / totalAttendance) * 100) : 0;

  const totalDue = feeRows.reduce((sum, fee) => sum + Number(fee.amount) - Number(fee.discount), 0);
  const totalPaid = feeRows.reduce(
    (sum, fee) => sum + fee.payments.reduce((ps, p) => ps + Number(p.amountPaid), 0),
    0
  );
  const outstanding = Math.max(totalDue - totalPaid, 0);
  const averageMarks =
    resultRows.length > 0
      ? Math.round(resultRows.reduce((sum, row) => sum + Number(row.marksObtained), 0) / resultRows.length)
      : 0;

  const firstName = parent.user.fullName.split(' ')[0];

  type ActivityKind = 'result' | 'attendance' | 'notification';
  const activityItems = [
    ...resultRows.slice(0, 3).map((r) => ({
      id: r.id,
      kind: 'result' as ActivityKind,
      label: `Grade updated: ${r.subject.name}`,
      sub: `${r.student.user.fullName} — ${r.exam.title}`,
      ts: new Date(r.updatedAt)
    })),
    ...recentAttendance.map((a) => ({
      id: a.id,
      kind: 'attendance' as ActivityKind,
      label: `Attendance: ${a.status}`,
      sub: a.student.user.fullName,
      ts: new Date(a.date)
    })),
    ...recentNotifications.map((n) => ({
      id: n.id,
      kind: 'notification' as ActivityKind,
      label: n.title,
      sub: 'School notice',
      ts: new Date(n.createdAt)
    }))
  ]
    .sort((a, b) => b.ts.getTime() - a.ts.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle={
          children.length > 1
            ? `Performance overview for your ${children.length} children.`
            : `Performance overview for ${children[0].user.fullName}.`
        }
      />

      {/* KPI Grid — same shape as Student dashboard */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard variant="primary" icon={<Users2 />} label="Children" value={children.length} />
        <KpiCard variant="success" icon={<CalendarCheck2 />} label="Attendance" value={`${attendanceRate}%`} />
        <KpiCard variant="primary" icon={<Award />} label="Avg Marks" value={averageMarks} />
        <KpiCard
          variant={outstanding > 0 ? 'danger' : 'success'}
          icon={<Wallet />}
          label="Outstanding"
          value={outstanding > 0 ? `PKR ${outstanding.toLocaleString()}` : 'Paid'}
        />
      </section>

      {/* Children & Latest Results — mirrors Student dashboard 2-col layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0EBEC]">
                <Users2 className="h-4 w-4 text-[#1F5A5C]" />
              </div>
              <p className="text-sm font-bold text-[#1F2937]">My Children</p>
            </div>
            <Link href="/parent/performance" className="text-xs font-semibold text-[#1F5A5C] hover:underline">
              View progress
            </Link>
          </div>
          {children.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No children linked yet.</p>
          ) : (
            <div className="space-y-2">
              {children.map((child) => {
                const initials = child.user.fullName
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((v) => v[0]?.toUpperCase() ?? '')
                  .join('');
                return (
                  <article
                    key={child.id}
                    className="flex items-center gap-3 rounded-lg bg-[#F9FAFB] px-3 py-3 sm:px-4 border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-colors"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E0EBEC] text-sm font-bold text-[#1F5A5C]">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1F2937] truncate">{child.user.fullName}</p>
                      <p className="text-xs text-[#6B7280] truncate">
                        {child.class ? `${child.class.name} - ${child.class.section}` : 'Class not assigned'} · {child.admissionNo}
                      </p>
                    </div>
                    <StatusBadge variant="success">Active</StatusBadge>
                  </article>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D1FAE5]">
                <Award className="h-4 w-4 text-[#10B981]" />
              </div>
              <p className="text-sm font-bold text-[#1F2937]">Latest Results</p>
            </div>
            <Link href="/parent/performance" className="text-xs font-semibold text-[#10B981] hover:underline">
              View
            </Link>
          </div>
          {resultRows.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No results published yet.</p>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {resultRows.slice(0, 5).map((result) => {
                const marks = Math.round(Number(result.marksObtained));
                const grade = marks >= 90 ? 'A+' : marks >= 80 ? 'A' : marks >= 70 ? 'B+' : marks >= 60 ? 'B' : 'C';
                return (
                  <div
                    key={result.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1F2937] truncate">{result.student.user.fullName}</p>
                      <p className="text-xs text-[#6B7280] truncate">
                        {result.subject.name} — {result.exam.title}
                      </p>
                    </div>
                    <span className="ml-2 shrink-0 text-sm font-bold text-[#10B981]">{grade}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity — full-width on mobile, mirrors student dashboard pattern */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5E6CC]">
              <TrendingUp className="h-4 w-4 text-[#D69E3F]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F2937]">Recent Activity</h3>
          </div>
          <Link href="/parent/notifications" className="text-xs font-semibold text-[#D69E3F] hover:underline">
            All notifications
          </Link>
        </div>
        {activityItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-10 w-10 text-[#E5E7EB]" />
            <p className="mt-2 text-sm text-[#9CA3AF]">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activityItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg bg-[#F9FAFB] p-3 border border-[#E5E7EB]"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    item.kind === 'result'
                      ? 'bg-[#D1FAE5]'
                      : item.kind === 'attendance'
                      ? 'bg-[#F5E6CC]'
                      : 'bg-[#E0EBEC]'
                  }`}
                >
                  {item.kind === 'result' && <BookOpen className="h-4 w-4 text-[#10B981]" />}
                  {item.kind === 'attendance' && <CalendarCheck2 className="h-4 w-4 text-[#D69E3F]" />}
                  {item.kind === 'notification' && <Bell className="h-4 w-4 text-[#1F5A5C]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#1F2937]">{item.label}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{item.sub}</p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">{timeAgo(item.ts)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Outstanding fee alert — uses Card with danger accent */}
      {outstanding > 0 && (
        <Card className="border-l-4 border-l-[#EF4444]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEE2E2]">
                  <Wallet className="h-4 w-4 text-[#EF4444]" />
                </div>
                <p className="text-sm font-bold text-[#1F2937]">Outstanding Tuition</p>
              </div>
              <p className="text-2xl font-bold text-[#1F2937]">PKR {outstanding.toLocaleString()}</p>
              <p className="text-xs text-[#6B7280] mt-1">
                {unreadNotifications > 0 ? `${unreadNotifications} unread notification${unreadNotifications === 1 ? '' : 's'}.` : 'Please review your billing.'}
              </p>
            </div>
            <Link
              href="/parent/fees"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1F2937] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#111827] active:scale-[0.98] shrink-0"
            >
              Review Billing
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
