import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader, Card } from '@/components/ui';
import { BookOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Schedule"
        subtitle={student?.class ? `${student.class.name} — ${student.class.section}` : 'No class assigned.'}
      />

      <Card>
        {!student?.class || student.class.subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BookOpen className="h-10 w-10 text-[#E5E7EB]" />
            <p className="mt-2 text-sm text-[#9CA3AF]">No schedule data yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {student.class.subjects.map((subject) => (
              <div key={subject.id} className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-colors">
                <p className="text-sm font-semibold text-[#1F2937]">{subject.name}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-[#6B7280]">
                  <span>Code: <span className="font-medium text-[#1F2937]">{subject.code}</span></span>
                  <span>Credits: <span className="font-medium text-[#1F2937]">{subject.creditHours}</span></span>
                </div>
                <p className="text-xs text-[#6B7280] mt-1">Teacher: <span className="font-medium text-[#1F2937]">{subject.teacher?.user.fullName ?? 'TBA'}</span></p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
