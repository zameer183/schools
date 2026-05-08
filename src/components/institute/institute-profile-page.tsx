import Link from 'next/link';
import { prisma } from '@/lib/prisma';

function asCurrency(value: unknown) {
  return Number(value ?? 0).toLocaleString('en-US');
}

export async function InstituteProfilePage({
  backHref,
  backLabel
}: {
  backHref: string;
  backLabel: string;
}) {
  const [
    totalStudents,
    totalTeachers,
    totalParents,
    totalClasses,
    totalSubjects,
    totalAttendance,
    totalResults,
    totalNotifications,
    feeAgg,
    paymentAgg,
    latestClasses
  ] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.parent.count(),
    prisma.class.count(),
    prisma.subject.count(),
    prisma.attendance.count(),
    prisma.result.count(),
    prisma.notification.count(),
    prisma.fee.aggregate({ _sum: { amount: true } }),
    prisma.payment.aggregate({ _sum: { amountPaid: true } }),
    prisma.class.findMany({
      select: { id: true, name: true, section: true, academicYear: true },
      orderBy: { createdAt: 'desc' },
      take: 6
    })
  ]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#e2e8e8] bg-white p-4 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6f7979]">Institution Profile</p>
        <h1 className="mt-2 break-words text-2xl font-bold text-[#1a1c1c] sm:text-3xl">Manarah Institute</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#5c6668]">
          Central profile for the institute across admin, teacher, and student panels. This page shows enrollment,
          academics, attendance, assessment, communication, and fee overview in one place.
        </p>
        <div className="mt-4 grid gap-2 text-xs text-[#1a1c1c] sm:flex sm:flex-wrap">
          <span className="rounded-full bg-[#f3f4f3] px-3 py-1 break-all sm:break-normal">Email: info@manarahinstitute.edu</span>
          <span className="rounded-full bg-[#f3f4f3] px-3 py-1">Phone: +92 300 0000000</span>
          <span className="rounded-full bg-[#f3f4f3] px-3 py-1">Campus: Main Academic Block</span>
        </div>
        <div className="mt-5">
          <Link href={backHref} className="inline-flex w-full justify-center rounded-lg border border-[#d4dee7] px-3 py-2 text-xs font-semibold text-[#1a1c1c] hover:bg-[#f5f7f5] sm:w-auto">
            Back to {backLabel}
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-[#e2e8e8] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Students</p><p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{totalStudents}</p></article>
        <article className="rounded-xl border border-[#e2e8e8] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Teachers</p><p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{totalTeachers}</p></article>
        <article className="rounded-xl border border-[#e2e8e8] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Parents</p><p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{totalParents}</p></article>
        <article className="rounded-xl border border-[#e2e8e8] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Classes</p><p className="mt-2 text-3xl font-bold text-[#1a1c1c]">{totalClasses}</p></article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-[#e2e8e8] bg-white p-5">
          <h2 className="text-lg font-bold text-[#1a1c1c]">Academic Overview</h2>
          <p className="mt-3 text-sm text-[#5c6668]">Subjects: <span className="font-semibold text-[#1a1c1c]">{totalSubjects}</span></p>
          <p className="mt-2 text-sm text-[#5c6668]">Results Published: <span className="font-semibold text-[#1a1c1c]">{totalResults}</span></p>
          <p className="mt-2 text-sm text-[#5c6668]">Attendance Entries: <span className="font-semibold text-[#1a1c1c]">{totalAttendance}</span></p>
        </article>

        <article className="rounded-xl border border-[#e2e8e8] bg-white p-5">
          <h2 className="text-lg font-bold text-[#1a1c1c]">Finance Overview</h2>
          <p className="mt-3 text-sm text-[#5c6668]">Fee Assigned: <span className="font-semibold text-[#1a1c1c]">${asCurrency(feeAgg._sum.amount)}</span></p>
          <p className="mt-2 text-sm text-[#5c6668]">Fee Collected: <span className="font-semibold text-[#1a1c1c]">${asCurrency(paymentAgg._sum.amountPaid)}</span></p>
        </article>

        <article className="rounded-xl border border-[#e2e8e8] bg-white p-5">
          <h2 className="text-lg font-bold text-[#1a1c1c]">Communication</h2>
          <p className="mt-3 text-sm text-[#5c6668]">Notifications Sent: <span className="font-semibold text-[#1a1c1c]">{totalNotifications}</span></p>
        </article>
      </section>

      <section className="rounded-xl border border-[#e2e8e8] bg-white p-4 sm:p-6">
        <h2 className="text-lg font-bold text-[#1a1c1c]">Latest Classes</h2>
        <div className="mt-3 space-y-2 md:hidden">
          {latestClasses.length === 0 ? (
            <p className="rounded-lg border border-[#e2e8e8] p-3 text-xs text-[#6f7979]">No class record found.</p>
          ) : (
            latestClasses.map((item) => (
              <div key={item.id} className="rounded-lg border border-[#e2e8e8] p-3">
                <p className="font-semibold text-[#1a1c1c]">{item.name} - {item.section}</p>
                <p className="mt-1 text-xs text-[#5c6668]">Academic Year: {item.academicYear}</p>
              </div>
            ))
          )}
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="hidden w-full min-w-[540px] text-sm md:table">
            <thead>
              <tr className="border-b border-[#e2e8e8]">
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Class</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Section</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Academic Year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8e8]">
              {latestClasses.length === 0 ? (
                <tr><td colSpan={3} className="py-4 text-center text-xs text-[#6f7979]">No class record found.</td></tr>
              ) : (
                latestClasses.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 font-medium text-[#1a1c1c]">{item.name}</td>
                    <td className="py-2.5 text-[#1a1c1c]">{item.section}</td>
                    <td className="py-2.5 text-[#5c6668]">{item.academicYear}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
