import Link from 'next/link';
import { UserRole } from '@prisma/client';
import { ArrowRight, BookOpen, Users2 } from 'lucide-react';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, PageHeader, StatusBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function TeacherClassesPage() {
  const session = await requireAuth([UserRole.TEACHER, UserRole.ADMIN]);

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.id },
    include: {
      classAssignments: {
        include: {
          class: {
            include: {
              _count: { select: { students: true } }
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!teacher) {
    return (
      <Card className="rounded-2xl p-6">
        <h2 className="text-xl font-bold text-[#0F172A]">Teacher profile missing</h2>
        <p className="mt-2 text-sm text-[#64748B]">No teacher profile is linked to this account yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Classes" subtitle="All classes assigned to you." />

      <Card className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E6F4F1]">
            <BookOpen className="h-4 w-4 text-[#1F5A5C]" />
          </div>
          <p className="text-sm font-semibold text-[#0F172A]">Assigned Classes</p>
          <span className="rounded-full bg-[#E6F4F1] px-2 py-0.5 text-xs font-semibold text-[#1F5A5C]">
            {teacher.classAssignments.length}
          </span>
        </div>

        {teacher.classAssignments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-6 text-center text-sm text-[#64748B]">
            No classes assigned yet.
          </p>
        ) : (
          <div className="space-y-3">
            {teacher.classAssignments.map((assignment) => (
              <Link
                key={assignment.classId}
                href={`/teacher/students?classId=${assignment.classId}`}
                className="flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3.5 transition hover:bg-white"
              >
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {assignment.class.name} - {assignment.class.section}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F4F1] px-2 py-0.5 text-[11px] font-semibold text-[#1F5A5C]">
                      <Users2 className="h-3 w-3" />
                      {assignment.class._count.students} students
                    </span>
                    {assignment.isClassLead ? <StatusBadge variant="info">Lead</StatusBadge> : null}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#64748B]" />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
