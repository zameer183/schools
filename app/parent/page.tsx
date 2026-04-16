import Link from 'next/link';
import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getParentContext } from '@/lib/parent-data';
import { Bell, BookOpen, CalendarCheck2, ChevronRight, DollarSign, Star, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ParentDashboardPage() {
  const session = await requireAuth([UserRole.PARENT, UserRole.ADMIN]);
  const context = await getParentContext(session.id);

  if (!context) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <h2 className="font-headline text-2xl font-extrabold text-[#004649]">Parent Profile Missing</h2>
        <p className="mt-2 text-[#3f4849]">Your account is active but no parent profile is linked yet. Contact admin.</p>
      </div>
    );
  }

  const { children, childIds, parent } = context;

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <h2 className="font-headline text-2xl font-extrabold text-[#004649]">Parent Dashboard</h2>
        <p className="mt-2 text-[#3f4849]">No children are linked with your profile yet. Please contact the admin office.</p>
      </div>
    );
  }

  const [attendanceSummary, resultRows, feeRows, unreadNotifications] = await Promise.all([
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
        OR: [{ userId: session.id }, { studentId: { in: childIds } }]
      }
    })
  ]);

  const totalAttendance = attendanceSummary.reduce((sum, row) => sum + row._count._all, 0);
  const present = attendanceSummary.filter((row) => row.status === 'PRESENT').reduce((sum, row) => sum + row._count._all, 0);
  const attendanceRate = totalAttendance > 0 ? Math.round((present / totalAttendance) * 100) : 0;

  const totalDue = feeRows.reduce((sum, fee) => sum + Number(fee.amount) - Number(fee.discount), 0);
  const totalPaid = feeRows.reduce((sum, fee) => sum + fee.payments.reduce((ps, p) => ps + Number(p.amountPaid), 0), 0);
  const outstanding = Math.max(totalDue - totalPaid, 0);
  const averageMarks = resultRows.length > 0 ? Math.round(resultRows.reduce((sum, row) => sum + Number(row.marksObtained), 0) / resultRows.length) : 0;

  const firstName = parent.user.fullName.split(' ')[0];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-headline text-3xl font-extrabold text-[#004649]">
          Welcome back, {firstName}.
        </h2>
        <p className="mt-1 text-sm text-[#3f4849]">
          Here is your {children.length > 1 ? "children's" : `${children[0].user.fullName}'s`} academic performance at Manarah Institute.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="bg-white rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="p-2 bg-[#004649]/5 text-[#004649] rounded-lg w-fit mb-3">
            <Star className="h-5 w-5" />
          </div>
          <p className="font-headline text-3xl font-extrabold text-[#191c1d]">{children.length}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f7979]">Children</p>
          <p className="mt-1 text-[11px] text-[#6f7979]">Linked profiles</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="p-2 bg-[#865300]/5 text-[#865300] rounded-lg w-fit mb-3">
            <CalendarCheck2 className="h-5 w-5" />
          </div>
          <p className="font-headline text-3xl font-extrabold text-[#191c1d]">{attendanceRate}%</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f7979]">Attendance</p>
          <p className="mt-1 text-[11px] text-[#6f7979]">{present}/{totalAttendance} present</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="p-2 bg-[#004649]/5 text-[#004649] rounded-lg w-fit mb-3">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="font-headline text-3xl font-extrabold text-[#191c1d]">{averageMarks}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f7979]">Avg Marks</p>
          <p className="mt-1 text-[11px] text-[#6f7979]">Latest performance</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="p-2 bg-[#865300]/5 text-[#865300] rounded-lg w-fit mb-3">
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="font-headline text-2xl font-extrabold text-[#191c1d]">PKR {outstanding.toLocaleString()}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f7979]">Outstanding</p>
          <p className="mt-1 text-[11px] text-[#6f7979]">{unreadNotifications} unread</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-headline text-lg font-bold text-[#004649]">My Children</h3>
            <Link href="/parent/performance" className="inline-flex items-center gap-1 text-xs font-bold text-[#865300]">
              View progress <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {children.map((child) => {
              const initials = child.user.fullName.split(' ').filter(Boolean).slice(0, 2).map((v) => v[0]?.toUpperCase() ?? '').join('');
              return (
                <article key={child.id} className="flex items-center gap-4 rounded-xl bg-[#f3f4f5] p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#afedf2]/50 text-sm font-bold text-[#004649]">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#191c1d]">{child.user.fullName}</p>
                    <p className="text-sm text-[#6f7979]">
                      {child.class ? `${child.class.name} - ${child.class.section}` : 'Class not assigned'} · {child.admissionNo}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#afedf2]/40 px-2 py-1 text-[10px] font-bold text-[#004649]">Active</span>
                </article>
              );
            })}
          </div>

          {resultRows.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline text-lg font-bold text-[#004649]">Latest Results</h3>
                <Link href="/parent/performance" className="inline-flex items-center gap-1 text-xs font-bold text-[#865300]">
                  Open all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {resultRows.slice(0, 3).map((result) => {
                  const marks = Math.round(Number(result.marksObtained));
                  const grade = marks >= 90 ? 'A+' : marks >= 80 ? 'A' : marks >= 70 ? 'B+' : marks >= 60 ? 'B' : 'C';
                  return (
                    <div key={result.id} className="flex items-center justify-between py-3 border-b border-[#edeeef] last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-[#191c1d]">{result.student.user.fullName}</p>
                        <p className="text-[11px] text-[#6f7979]">{result.subject.name} — {result.exam.title}</p>
                      </div>
                      <span className="font-headline text-xl font-extrabold text-[#004649]">{grade}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
            <h3 className="font-headline text-base font-bold text-[#004649] mb-4">Recent Activity</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 shrink-0 rounded-full bg-[#afedf2]/40 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-[#004649]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#191c1d]">Grade Updated: Academic Results</p>
                  <p className="text-[10px] text-[#6f7979] mt-0.5">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 shrink-0 rounded-full bg-[#ffddb8]/40 flex items-center justify-center">
                  <CalendarCheck2 className="h-4 w-4 text-[#865300]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#191c1d]">Attendance Recorded</p>
                  <p className="text-[10px] text-[#6f7979] mt-0.5">5 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 shrink-0 rounded-full bg-[#edeeef] flex items-center justify-center">
                  <Bell className="h-4 w-4 text-[#6f7979]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#191c1d]">School notice received</p>
                  <p className="text-[10px] text-[#6f7979] mt-0.5">Yesterday</p>
                </div>
              </div>
            </div>
            <Link href="/parent/notifications" className="mt-4 block text-center text-xs font-bold text-[#865300]">
              View All Notifications
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
            <h3 className="font-headline text-base font-bold text-[#004649] mb-4">Parent Resources</h3>
            <div className="space-y-2">
              {[
                { label: 'School Policies', icon: BookOpen },
                { label: 'Contact Faculty', icon: Bell },
                { label: 'Academic Calendar', icon: CalendarCheck2 }
              ].map(({ label, icon: Icon }) => (
                <button key={label} className="flex w-full items-center justify-between rounded-xl bg-[#f3f4f5] px-4 py-3 text-sm font-semibold text-[#191c1d] transition hover:bg-[#e7e8e9]">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-[#6f7979]" />
                    {label}
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#bfc8c9]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {outstanding > 0 && (
        <section className="bg-[#004649] rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#afedf2] mb-1">Outstanding Tuition</p>
              <p className="font-headline text-3xl font-extrabold">PKR {outstanding.toLocaleString()}</p>
              <p className="text-sm text-white/70 mt-1">Due Date: End of month</p>
            </div>
            <Link
              href="/parent/fees"
              className="rounded-xl bg-[#865300] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 shrink-0"
            >
              Review Billing
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
