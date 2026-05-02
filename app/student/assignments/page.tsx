import Link from 'next/link';
import { Prisma, UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { Calendar, ChevronRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader, KpiCard, Card, StatusBadge } from '@/components/ui';

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
      <PageHeader
        title="Assignments"
        subtitle="Pending, submitted, and overdue assignments."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard variant="primary" icon={<Clock />} label="Pending" value={pending} />
        <KpiCard variant="success" icon={<CheckCircle2 />} label="Submitted" value={submitted} />
        <KpiCard variant="danger" icon={<AlertCircle />} label="Overdue" value={overdue} />
      </section>

      <Card>
        {assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-[#E5E7EB]" />
            <p className="mt-2 text-sm text-[#9CA3AF]">No assignments available yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const mine = assignment.submissions[0];
              const isOverdue = !mine && toDate(assignment.dueDate) < new Date();
              const statusVariant = mine ? 'success' : isOverdue ? 'danger' : 'pending';

              return (
                <Link key={assignment.id} href={`/student/assignments/${assignment.id}`} className="block transition active:scale-[0.98]">
                  <article className="rounded-lg bg-[#F9FAFB] p-4 hover:bg-[#F3F4F6] transition-colors cursor-pointer group border border-[#E5E7EB]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#1F2937] group-hover:text-[#1F5A5C] transition-colors">{assignment.title}</p>
                        <p className="text-xs text-[#6B7280] mt-0.5">{assignment.subject.name} · {assignment.teacher.user.fullName}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge variant={statusVariant}>
                          {mine ? 'Submitted' : isOverdue ? 'Overdue' : 'Pending'}
                        </StatusBadge>
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
