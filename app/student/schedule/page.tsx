import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function StudentSchedulePage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);

  const student = await prisma.student.findUnique({
    where: { userId: session.id },
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
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Class Schedule</h2>
        <p className="mt-1 text-sm text-[#6f7979]">
          {student?.class ? `Class: ${student.class.name} - ${student.class.section}` : 'No class assigned yet.'}
        </p>
      </div>

      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h3 className="font-semibold text-[#1a1c1c] mb-4">Subjects</h3>
        {!student?.class || student.class.subjects.length === 0 ? (
          <p className="text-sm text-[#6f7979]">No schedule data available yet.</p>
        ) : (
          <div className="space-y-3">
            {student.class.subjects.map((subject) => (
              <div key={subject.id} className="rounded-lg border border-[#e2e8e8] px-4 py-3">
                <p className="font-semibold text-[#1a1c1c]">{subject.name}</p>
                <p className="text-sm text-[#6f7979]">Code: {subject.code}</p>
                <p className="text-sm text-[#6f7979]">Teacher: {subject.teacher?.user.fullName ?? 'TBA'}</p>
                <p className="text-sm text-[#6f7979]">Credit Hours: {subject.creditHours}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
