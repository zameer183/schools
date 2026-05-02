import Link from 'next/link';
import { Prisma, UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { Calendar, ChevronRight } from 'lucide-react';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { KpiCard } from '@/components/ui/kpi-card';
import { Card } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

type AssignmentRow = Prisma.AssignmentGetPayload<{
  include: {
    subject: { select: { name: true } };
    teacher: { include: { user: { select: { fullName: true } } } };
    submissions: true;
  };
}>;

const getCachedStudentAssignmentsData = unstable_cache(
  async (userId: string) => {
    const student = await prisma.student.findUnique({ where: { userId }, select: { id: true, classId: true } });
    if (!student) return { student: null, assignments: [] as AssignmentRow[] };
    if (!student.classId) return { student, assignments: [] as AssignmentRow[] };

    const assignments = await prisma.assignment.findMany({
      where: { classId: student.classId },
      include: {
        subject: { select: { name: true } },
        teacher: { include: { user: { select: { fullName: true } } } },
        submissions: { where: { studentId: student.id } }
      },
      orderBy: { dueDate: 'asc' }
    });

    return { student, assignments };
  },
  ['student-assignments-page-data'],
  { revalidate: 30 }
);

export default async function StudentAssignmentsPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);
  const { student, assignments } = await getCachedStudentAssignmentsData(session.id);
  const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));

  if (!student?.classId) {
    return (
      <Card className="p-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1F2937]">Assignments</h2>
        <p className="mt-2 text-sm text-[#6B7280]">No class assigned yet. Contact your administrator.</p>
      </Card>
    );
  }

  const pending = assignments.filter((a) => !a.submissions[0] && toDate(a.dueDate) > new Date()).length;
  const submitted = assignments.filter((a) => a.submissions[0]).length;
  const overdue = assignments.filter((a) => !a.submissions[0] && toDate(a.dueDate) < new Date()).length;

  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">Assignments</p>
        <h2 className="mt-2 text-2xl md:text-3xl font-bold text-[#1F2937]">Track submissions</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Pending, submitted, and overdue assignments.</p>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard title="PENDING" value={pending.toString()} subtitle="Awaiting submission" />
        <KpiCard title="SUBMITTED" value={submitted.toString()} subtitle="Completed assignments" />
        <KpiCard title="OVERDUE" value={overdue.toString()} subtitle="Past due date" />
      </div>

      <Card className="p-5 md:p-6">
        <h3 className="text-lg font-semibold text-[#1F2937] mb-4">All Assignments</h3>
        {assignments.length === 0 ? (
          <p className="text-sm text-[#6B7280]">No assignments available yet.</p>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const mine = assignment.submissions[0];
              const isOverdue = !mine && toDate(assignment.dueDate) < new Date();
              const statusLabel = mine ? 'Submitted' : isOverdue ? 'Overdue' : 'Pending';
              const statusBgColor = mine ? 'bg-[#D1FAE5]' : isOverdue ? 'bg-[#FEE2E2]' : 'bg-[#FEF3C7]';
              const statusTextColor = mine ? 'text-[#10B981]' : isOverdue ? 'text-[#EF4444]' : 'text-[#D69E3F]';

              return (
                <Link key={assignment.id} href={`/student/assignments/${assignment.id}`} className="block">
                  <article className="rounded-lg bg-[#F5F1E8] p-4 hover:bg-[#EEE9DE] transition-colors cursor-pointer group border border-[#E5E7EB]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#1F2937] group-hover:text-[#1F5A5C] transition-colors">{assignment.title}</p>
                        <p className="text-xs text-[#6B7280] mt-0.5">{assignment.subject.name} · {assignment.teacher.user.fullName}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusBgColor} ${statusTextColor}`}>
                          {statusLabel}
                        </span>
                        <ChevronRight className="h-4 w-4 text-[#6B7280] group-hover:text-[#1F5A5C] transition-colors" />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-[#6B7280]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Due {toDate(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span>Max {assignment.maxMarks} pts</span>
                      {mine?.marksObtained != null && (
                        <span className="text-[#10B981] font-semibold">{mine.marksObtained} pts earned</span>
                      )}
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
