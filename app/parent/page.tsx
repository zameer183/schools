import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { UserRole } from '@prisma/client';
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

type ParentDashboardData = {
  context: Awaited<ReturnType<typeof getParentContext>>;
  attendanceSummary: Array<{ status: string; _count: { _all: number } }>;
  resultRows: Array<{
    id: string;
    marksObtained: number | null;
    grade: string;
    remarks: string | null;
    updatedAt: Date;
    student: { user: { fullName: string } };
    subject: { name: string };
    exam: { title: string; examDate: Date | null; totalMarks: number; passingMarks: number };
  }>;
  feeSummary: {
    totalDue: number;
    totalPaid: number;
    outstanding: number;
  };
  unreadNotifications: number;
  recentAttendance: Array<{
    id: string;
    date: Date;
    status: string;
    student: { user: { fullName: string } };
  }>;
  recentNotifications: Array<{
    id: string;
    title: string;
    createdAt: Date;
  }>;
  isOffline: boolean;
};

function isDatabaseConnectionError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("can't reach database server") ||
    message.includes('database connection unavailable') ||
    message.includes('timed out fetching a new connection') ||
    message.includes('database unreachable') ||
    message.includes('prismaclientinitializationerror')
  );
}

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

function fallbackDashboardData(context: Awaited<ReturnType<typeof getParentContext>>, isOffline: boolean) {
  return {
    context,
    attendanceSummary: [],
    resultRows: [],
    feeSummary: {
      totalDue: 0,
      totalPaid: 0,
      outstanding: 0
    },
    unreadNotifications: 0,
    recentAttendance: [],
    recentNotifications: [],
    isOffline
  } satisfies ParentDashboardData;
}

const getCachedParentDashboardData = unstable_cache(
  async (userId: string): Promise<ParentDashboardData> => {
    let context: Awaited<ReturnType<typeof getParentContext>> = null;

    try {
      context = await getParentContext(userId);
    } catch (error) {
      return fallbackDashboardData(null, isDatabaseConnectionError(error));
    }

    if (!context || context.children.length === 0) {
      return fallbackDashboardData(context, false);
    }

    const { childIds } = context;

    try {
      const [
        rawAttendanceSummary,
        resultRows,
        feeStats,
        paymentStats,
        unreadNotifications,
        recentAttendance,
        recentNotifications
      ] =
        await prisma.$transaction([
          prisma.attendance.groupBy({
            by: ['status'],
            where: { studentId: { in: childIds } },
            orderBy: { status: 'asc' },
            _count: { _all: true }
          }),
          prisma.result.findMany({
            where: { studentId: { in: childIds } },
            select: {
              id: true,
              marksObtained: true,
              grade: true,
              remarks: true,
              updatedAt: true,
              student: { select: { user: { select: { fullName: true } } } },
              subject: { select: { name: true } },
              exam: {
                select: {
                  title: true,
                  examDate: true,
                  totalMarks: true,
                  passingMarks: true
                }
              }
            },
            orderBy: { updatedAt: 'desc' },
            take: 5
          }),
          prisma.fee.aggregate({
            where: { studentId: { in: childIds } },
            _sum: { amount: true, discount: true }
          }),
          prisma.payment.aggregate({
            where: { fee: { studentId: { in: childIds } } },
            _sum: { amountPaid: true }
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

      const attendanceSummary = rawAttendanceSummary.map((item) => ({
        status: item.status,
        _count: {
          _all:
            typeof item._count === 'object' && item._count !== null && '_all' in item._count
              ? Number((item._count as { _all?: number })._all ?? 0)
              : 0
        }
      }));

      const totalDue = Math.max(
        Number(feeStats._sum.amount ?? 0) - Number(feeStats._sum.discount ?? 0),
        0
      );
      const totalPaid = Number(paymentStats._sum.amountPaid ?? 0);

      return {
        context,
        attendanceSummary,
        resultRows,
        feeSummary: {
          totalDue,
          totalPaid,
          outstanding: Math.max(totalDue - totalPaid, 0)
        },
        unreadNotifications,
        recentAttendance,
        recentNotifications,
        isOffline: false
      };
    } catch (error) {
      return {
        ...fallbackDashboardData(context, isDatabaseConnectionError(error)),
        context
      };
    }
  },
  ['parent-dashboard-page-data'],
  { revalidate: 30 }
);

export default async function ParentDashboardPage() {
  const session = await requireAuth([UserRole.PARENT, UserRole.ADMIN]);
  const data = await getCachedParentDashboardData(session.id);
  const { context } = data;

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

  const { attendanceSummary, resultRows, feeSummary, unreadNotifications, recentAttendance, recentNotifications, isOffline } = data;
  const totalAttendance = attendanceSummary.reduce((sum, row) => sum + row._count._all, 0);
  const present = attendanceSummary
    .filter((row) => row.status === 'PRESENT')
    .reduce((sum, row) => sum + row._count._all, 0);
  const attendanceRate = totalAttendance > 0 ? Math.round((present / totalAttendance) * 100) : 0;
  const averageMarks =
    resultRows.length > 0
      ? Math.round(resultRows.reduce((sum, row) => sum + Number(row.marksObtained ?? 0), 0) / resultRows.length)
      : 0;
  const firstName = parent.user.fullName.split(' ')[0];

  type ActivityKind = 'result' | 'attendance' | 'notification';
  const activityItems = [
    ...resultRows.slice(0, 3).map((result) => ({
      id: result.id,
      kind: 'result' as ActivityKind,
      label: `Grade updated: ${result.subject.name}`,
      sub: `${result.student.user.fullName} — ${result.exam.title}`,
      ts: new Date(result.updatedAt)
    })),
    ...recentAttendance.map((attendance) => ({
      id: attendance.id,
      kind: 'attendance' as ActivityKind,
      label: `Attendance: ${attendance.status}`,
      sub: attendance.student.user.fullName,
      ts: new Date(attendance.date)
    })),
    ...recentNotifications.map((notification) => ({
      id: notification.id,
      kind: 'notification' as ActivityKind,
      label: notification.title,
      sub: 'School notice',
      ts: new Date(notification.createdAt)
    }))
  ]
    .sort((a, b) => b.ts.getTime() - a.ts.getTime())
    .slice(0, 5);

  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle={
          children.length > 1
            ? `Performance overview for your ${children.length} children.`
            : `Performance overview for ${children[0].user.fullName}.`
        }
        badge={
          unreadNotifications > 0 ? (
            <span className="inline-flex items-center rounded-full bg-[#F5E6CC] px-3 py-1 text-xs font-bold text-[#D69E3F]">
              {unreadNotifications} unread
            </span>
          ) : null
        }
      />

      {isOffline ? (
        <Card className="border-l-4 border-l-[#F59E0B]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7]">
              <AlertCircle className="h-5 w-5 text-[#D97706]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1F2937]">Database connection unstable</p>
              <p className="mt-1 text-sm text-[#6B7280]">
                Some live dashboard values could not be refreshed right now. The page is still usable, and the data
                will refresh automatically once the database recovers.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard variant="primary" icon={<Users2 />} label="Children" value={children.length} />
        <KpiCard variant="success" icon={<CalendarCheck2 />} label="Attendance" value={`${attendanceRate}%`} />
        <KpiCard variant="primary" icon={<Award />} label="Avg Marks" value={averageMarks} />
        <KpiCard
          variant={feeSummary.outstanding > 0 ? 'danger' : 'success'}
          icon={<Wallet />}
          label="Outstanding"
          value={feeSummary.outstanding > 0 ? `PKR ${feeSummary.outstanding.toLocaleString()}` : 'Paid'}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
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
          <div className="space-y-2">
            {children.map((child) => {
              const initials = child.user.fullName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((value) => value[0]?.toUpperCase() ?? '')
                .join('');

              return (
                <article
                  key={child.id}
                  className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-3 transition-colors hover:bg-[#F3F4F6] sm:px-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E0EBEC] text-sm font-bold text-[#1F5A5C]">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1F2937]">{child.user.fullName}</p>
                    <p className="truncate text-xs text-[#6B7280]">
                      {child.class ? `${child.class.name} - ${child.class.section}` : 'Class not assigned'} ·{' '}
                      {child.admissionNo}
                    </p>
                  </div>
                  <StatusBadge variant="success">Active</StatusBadge>
                </article>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
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
              {resultRows.map((result) => {
                const marks = Math.round(Number(result.marksObtained ?? 0));
                const grade = marks >= 90 ? 'A+' : marks >= 80 ? 'A' : marks >= 70 ? 'B+' : marks >= 60 ? 'B' : 'C';
                return (
                  <div key={result.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#1F2937]">{result.student.user.fullName}</p>
                      <p className="truncate text-xs text-[#6B7280]">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0EBEC]">
                <Wallet className="h-4 w-4 text-[#1F5A5C]" />
              </div>
              <p className="text-sm font-bold text-[#1F2937]">Fee Summary</p>
            </div>
            <Link href="/parent/fees" className="text-xs font-semibold text-[#1F5A5C] hover:underline">
              View fees
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">Total Due</p>
              <p className="mt-1 text-lg font-bold text-[#1F2937]">PKR {feeSummary.totalDue.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">Total Paid</p>
              <p className="mt-1 text-lg font-bold text-[#10B981]">PKR {feeSummary.totalPaid.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">Outstanding</p>
              <p className="mt-1 text-lg font-bold text-[#EF4444]">PKR {feeSummary.outstanding.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
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
                <div key={item.id} className="flex items-start gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
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
                    <p className="mt-0.5 text-xs text-[#6B7280]">{item.sub}</p>
                    <p className="mt-0.5 text-xs text-[#9CA3AF]">{timeAgo(item.ts)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {feeSummary.outstanding > 0 && (
        <Card className="border-l-4 border-l-[#EF4444]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEE2E2]">
                  <Wallet className="h-4 w-4 text-[#EF4444]" />
                </div>
                <p className="text-sm font-bold text-[#1F2937]">Outstanding Tuition</p>
              </div>
              <p className="text-2xl font-bold text-[#1F2937]">PKR {feeSummary.outstanding.toLocaleString()}</p>
              <p className="mt-1 text-xs text-[#6B7280]">
                {unreadNotifications > 0
                  ? `${unreadNotifications} unread notification${unreadNotifications === 1 ? '' : 's'}.`
                  : 'Please review your billing.'}
              </p>
            </div>
            <Link
              href="/parent/fees"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#1F2937] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#111827] active:scale-[0.98]"
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
