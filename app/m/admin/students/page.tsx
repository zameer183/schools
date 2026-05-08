import Link from 'next/link';
import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const STATUS_STYLES = {
  active:  'bg-[#1B4D4B]/10 text-[#1B4D4B]',
  feeDue:  'bg-[#E68A00]/20 text-[#854F0B]',
  onLeave: 'bg-[#6B7280]/20 text-[#444441]'
} as const;

export default async function MobileAdminStudentsPage() {
  const [students, totals] = await Promise.all([
    prisma.student.findMany({
      orderBy: { admissionNo: 'asc' },
      take: 30,
      include: {
        user: { select: { fullName: true } },
        class: { select: { name: true, section: true } },
        fees: { where: { status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] } }, select: { id: true } }
      }
    }),
    prisma.student.count()
  ]);

  const totalClasses = await prisma.class.count();

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between px-4 pt-5 pb-3">
        <div>
          <h1 className="text-lg font-semibold text-[#111]">Students</h1>
          <p className="text-[10px] text-[#6B7280]">{totals} total · {totalClasses} classes</p>
        </div>
        <Link
          href="/admin/students/enroll"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E68A00] text-white active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
        </Link>
      </header>

      <div className="px-4 pb-3">
        <div className="flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3">
          <Search className="h-3.5 w-3.5 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search students, classes, IDs…"
            className="flex-1 bg-transparent text-xs text-[#111] outline-none placeholder:text-[#6B7280]"
          />
          <SlidersHorizontal className="h-3.5 w-3.5 text-[#1B4D4B]" />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto px-4 pb-3">
        <span className="rounded-full bg-[#1B4D4B] px-3 py-1.5 text-[10px] font-medium text-white">All</span>
        <span className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-[10px] text-[#6B7280]">Active</span>
        <span className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-[10px] text-[#6B7280]">Fee due</span>
      </div>

      <ul className="flex flex-col gap-2 px-4 pb-4">
        {students.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[#E5E7EB] py-10 text-center text-xs text-[#6B7280]">
            No students enrolled yet
          </li>
        ) : (
          students.map((s) => {
            const initials = s.user.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
            const classLabel = s.class ? `Grade ${s.class.name}-${s.class.section}` : 'Unassigned';
            const status =
              s.fees.length > 0 ? 'feeDue' : 'active';
            const statusLabel = status === 'feeDue' ? 'Fee due' : 'Active';

            return (
              <li key={s.id}>
                <Link
                  href={`/admin/students/${s.id}`}
                  className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 active:scale-[0.99]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1B4D4B]/10 text-[11px] font-medium text-[#1B4D4B]">
                    {initials || 'ST'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-[#111]">{s.user.fullName}</p>
                    <p className="truncate text-[10px] text-[#6B7280]">{classLabel} · {s.admissionNo}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${STATUS_STYLES[status]}`}>
                    {statusLabel}
                  </span>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
