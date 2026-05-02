import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/Card';

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
      <Card className="p-6 md:p-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1F2937]">Class Schedule</h2>
        <p className="mt-2 text-sm text-[#6B7280]">
          {student?.class ? `${student.class.name} — ${student.class.section}` : 'No class assigned.'}
        </p>
      </Card>

      <Card className="p-5 md:p-6">
        <h3 className="text-lg font-semibold text-[#1F2937] mb-4">Subjects</h3>
        {!student?.class || student.class.subjects.length === 0 ? (
          <p className="text-sm text-[#6B7280]">No schedule data yet.</p>
        ) : (
          <div className="space-y-3">
            {student.class.subjects.map((subject) => (
              <div key={subject.id} className="rounded-lg bg-[#F5F1E8] px-4 py-3 border border-[#E5E7EB]">
                <p className="text-sm font-semibold text-[#1F2937]">{subject.name}</p>
                <p className="text-xs text-[#6B7280] mt-1">Code: {subject.code}</p>
                <p className="text-xs text-[#6B7280]">Teacher: {subject.teacher?.user.fullName ?? 'TBA'}</p>
                <p className="text-xs text-[#6B7280]">Credits: {subject.creditHours}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
