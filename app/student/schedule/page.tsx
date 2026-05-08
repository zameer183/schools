import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader, Card } from '@/components/ui';
import { BookOpen, User2, Hash, Award } from 'lucide-react';

export const dynamic = 'force-dynamic';

const SUBJECT_COLORS = [
  { bg: 'bg-[#D1FAE5]', text: 'text-[#10B981]' },
  { bg: 'bg-[#E0EBEC]', text: 'text-[#1F5A5C]' },
  { bg: 'bg-[#F5E6CC]', text: 'text-[#D69E3F]' },
  { bg: 'bg-[#DBEAFE]', text: 'text-[#3B82F6]' },
  { bg: 'bg-[#FEE2E2]', text: 'text-[#EF4444]' },
  { bg: 'bg-[#EDE9FE]', text: 'text-[#7C3AED]' },
];

const getCachedStudentScheduleData = unstable_cache(
  async (userId: string) =>
    prisma.student.findUnique({
      where: { userId },
      include: {
        class: {
          include: {
            subjects: {
              include: {
                teacher: { include: { user: { select: { fullName: true } } } }
              },
              orderBy: { name: 'asc' }
            }
          }
        }
      }
    }),
  ['student-schedule-page-data'],
  { revalidate: 30 }
);

export default async function StudentSchedulePage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);
  const student = await getCachedStudentScheduleData(session.id);
  const subjects = student?.class?.subjects ?? [];
  const totalCredits = subjects.reduce((sum, s) => sum + s.creditHours, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Schedule"
        subtitle={student?.class ? `${student.class.name} — ${student.class.section}` : 'No class assigned.'}
        badge={
          subjects.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0EBEC] px-3 py-1.5 text-xs font-bold text-[#1F5A5C]">
              <BookOpen className="h-3 w-3" />
              {subjects.length} Subjects · {totalCredits} Credits
            </span>
          ) : undefined
        }
      />

      {subjects.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F3F4F6]">
              <BookOpen className="h-8 w-8 text-[#D1D5DB]" />
            </div>
            <p className="mt-4 text-sm font-semibold text-[#1F2937]">No subjects yet</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">Contact your administrator to assign a class.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject, i) => {
            const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
            return (
              <div
                key={subject.id}
                className="rounded-xl bg-white border border-[#E5E7EB] p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color.bg}`}>
                    <BookOpen className={`h-5 w-5 ${color.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#1F2937] leading-tight">{subject.name}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${color.bg} ${color.text}`}>
                      {subject.code}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                    <User2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium text-[#1F2937] truncate">
                      {subject.teacher?.user.fullName ?? 'TBA'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                    <Award className="h-3.5 w-3.5 shrink-0" />
                    <span>{subject.creditHours} credit hour{subject.creditHours !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                    <Hash className="h-3.5 w-3.5 shrink-0" />
                    <span>{subject.code}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
