import Link from 'next/link';
import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getParentContext } from '@/lib/parent-data';

export const dynamic = 'force-dynamic';

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
      <p className="text-sm text-[#6e7778]">{title}</p>
      <p className="mt-2 text-3xl font-black text-[#004649]">{value}</p>
      <p className="mt-1 text-xs text-[#5c6668]">{hint}</p>
    </div>
  );
}

export default async function ParentDashboardPage() {
  const session = await requireAuth([UserRole.PARENT, UserRole.ADMIN]);
  const context = await getParentContext(session.id);

  if (!context) {
    return (
      <div className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <h2 className="font-headline text-3xl font-extrabold text-[#004649]">Parent Profile Missing</h2>
        <p className="mt-2 text-[#5c6668]">Your account is active but no parent profile is linked yet. Contact admin.</p>
      </div>
    );
  }

  const { children, childIds, parent } = context;

  if (children.length === 0) {
    return (
      <div className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <h2 className="font-headline text-3xl font-extrabold text-[#004649]">Parent Dashboard</h2>
        <p className="mt-2 text-[#5c6668]">No children are linked with your profile yet. Please contact the admin office.</p>
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
  const present = attendanceSummary
    .filter((row) => row.status === 'PRESENT')
    .reduce((sum, row) => sum + row._count._all, 0);
  const attendanceRate = totalAttendance > 0 ? Math.round((present / totalAttendance) * 100) : 0;

  const totalDue = feeRows.reduce((sum, fee) => sum + Number(fee.amount) - Number(fee.discount), 0);
  const totalPaid = feeRows.reduce(
    (sum, fee) => sum + fee.payments.reduce((paymentSum, payment) => paymentSum + Number(payment.amountPaid), 0),
    0
  );
  const outstanding = Math.max(totalDue - totalPaid, 0);

  const averageMarks =
    resultRows.length > 0 ? Math.round(resultRows.reduce((sum, row) => sum + Number(row.marksObtained), 0) / resultRows.length) : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#6e7778]">Parent Hub</p>
        <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.03em] text-[#004649]">Welcome, {parent.user.fullName}</h2>
        <p className="mt-2 text-[#5c6668]">Children linked: {children.length}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Children" value={`${children.length}`} hint="Linked student profiles" />
        <StatCard title="Attendance" value={`${attendanceRate}%`} hint={`${present}/${totalAttendance} present records`} />
        <StatCard title="Average Marks" value={`${averageMarks}`} hint="Latest result performance" />
        <StatCard title="Outstanding Fees" value={`PKR ${outstanding.toLocaleString()}`} hint={`${unreadNotifications} unread notifications`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[1.75rem] bg-white p-6 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-2xl font-bold text-[#004649]">My Children</h3>
            <Link href="/parent/performance" className="text-sm font-semibold text-[#004649] hover:underline">
              View progress
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {children.map((child) => (
              <article key={child.id} className="rounded-2xl border border-[#e3e8e9] bg-[#f8f9fa] p-4">
                <p className="font-semibold text-[#1a1c1c]">{child.user.fullName}</p>
                <p className="text-sm text-[#5c6668]">Admission: {child.admissionNo}</p>
                <p className="text-sm text-[#5c6668]">
                  Class: {child.class ? `${child.class.name} - ${child.class.section}` : 'Not assigned'}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-white p-6 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-2xl font-bold text-[#004649]">Latest Results</h3>
            <Link href="/parent/performance" className="text-sm font-semibold text-[#004649] hover:underline">
              Open all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {resultRows.length === 0 ? (
              <p className="rounded-2xl bg-[#f3f4f3] p-4 text-sm text-[#5c6668]">No result records found yet.</p>
            ) : (
              resultRows.map((result) => (
                <article key={result.id} className="rounded-2xl border border-[#e3e8e9] bg-white p-4">
                  <p className="font-semibold text-[#1a1c1c]">{result.student.user.fullName}</p>
                  <p className="text-sm text-[#5c6668]">{result.subject.name} - {result.exam.title}</p>
                  <p className="mt-1 text-sm font-semibold text-[#004649]">Marks: {Math.round(Number(result.marksObtained))}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
