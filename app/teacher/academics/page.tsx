import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTeacherAccessMapByUserId } from '@/lib/teacher-access';
import { PageHeader, Card } from '@/components/ui';
import { ClipboardList } from 'lucide-react';

export const dynamic = 'force-dynamic';

const getCachedTeacherAcademicsData = unstable_cache(
  async (userId: string) => {
    const [access, teacher] = await Promise.all([
      getTeacherAccessMapByUserId(userId),
      prisma.teacher.findUnique({
        where: { userId },
        include: {
          exams: {
            include: {
              subject: { select: { name: true } },
              class: { select: { name: true, section: true } },
              results: {
                include: {
                  student: {
                    include: { user: { select: { fullName: true } } }
                  }
                }
              }
            },
            orderBy: { examDate: 'desc' }
          },
          classAssignments: {
            include: {
              class: {
                include: {
                  students: {
                    include: { user: { select: { fullName: true } } }
                  }
                }
              }
            }
          }
        }
      })
    ]);

    return { access, teacher };
  },
  ['teacher-academics-page-data'],
  { revalidate: 30 }
);

function parseExamTitle(raw: string) {
  const value = raw.trim();
  const match = value.match(/^\[(.+?)\]\s*(.*)$/);
  if (!match) return { examType: 'Custom', title: value };
  return { examType: match[1].trim(), title: (match[2] ?? '').trim() || value };
}

export default async function TeacherAcademicsPage() {
  const session = await requireAuth([UserRole.TEACHER]);
  const { access, teacher } = await getCachedTeacherAcademicsData(session.id);
  if (access && !access.ACADEMICS) {
    return (
      <Card>
        <h2 className="text-3xl font-bold text-[#1F2937]">Academics Access Disabled</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Admin has disabled your academics module access.</p>
      </Card>
    );
  }
  const exams = (teacher?.exams ?? []).map((exam) => ({
    ...exam,
    examDate: exam.examDate instanceof Date ? exam.examDate : new Date(exam.examDate)
  }));
  const allStudents = teacher?.classAssignments.flatMap((ca) =>
    ca.class.students.map((s) => ({
      id: s.id,
      admissionNo: s.admissionNo,
      fullName: s.user.fullName,
      className: `${ca.class.name} - ${ca.class.section}`
    }))
  ) ?? [];
  const uniqueStudents = Array.from(new Map(allStudents.map((s) => [s.id, s])).values());

  const activeExam = exams[0] ?? null;
  const activeResults = activeExam?.results ?? [];

  const gradeFor = (marks: number, total: number) => {
    const pct = (marks / total) * 100;
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
  };

  function initials(name: string) {
    return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academics"
        subtitle="Manage exams and enter student marks for your classes."
      />

      {exams.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ClipboardList className="h-10 w-10 text-[#E5E7EB]" />
            <p className="mt-2 text-sm font-semibold text-[#1F2937]">No exams created yet</p>
            <p className="mt-1 text-xs text-[#6B7280]">Exams created by admin will appear here for marks entry.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] px-1">Select Exam</p>
            {exams.map((exam) => (
              <div
                key={exam.id}
                className={`rounded-xl border p-4 cursor-pointer transition-colors ${exam.id === activeExam?.id ? 'border-[#1F5A5C] bg-[#D1FAE5]' : 'border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#1F2937]">{parseExamTitle(exam.title).title}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">{exam.subject.name} · {exam.class.name} {exam.class.section}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-[#F5E6CC] text-[#D69E3F] px-2 py-1 rounded-full shrink-0">
                    {exam.examDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-[#6B7280]">
                  <span>{exam.results.length} / {uniqueStudents.length} graded</span>
                  <span>·</span>
                  <span>Max {exam.totalMarks} marks</span>
                </div>
              </div>
            ))}
          </div>

          <Card className="lg:col-span-2">
            {activeExam && (
              <>
                <div className="border-b border-[#E5E7EB] pb-4 mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#D69E3F] mb-2">Examination Entry</p>
                  <h3 className="text-2xl font-bold text-[#1F2937]">{parseExamTitle(activeExam.title).title}</h3>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs font-semibold rounded-full bg-[#D1FAE5] px-3 py-1 text-[#10B981]">
                      {parseExamTitle(activeExam.title).examType}
                    </span>
                    <span className="text-xs font-semibold bg-[#F5E6CC] text-[#D69E3F] px-3 py-1 rounded-full">
                      {activeExam.examDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <span className="text-xs text-[#6B7280]">· {uniqueStudents.length} Students Total</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-2.5">
                    <svg className="h-4 w-4 text-[#6B7280] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input placeholder="Search student name or roll no..." className="bg-transparent text-sm text-[#1F2937] placeholder:text-[#6B7280] outline-none flex-1" />
                  </div>
                </div>

                <div className="divide-y divide-[#E5E7EB] -mx-6">
                  {uniqueStudents.length === 0 ? (
                    <div className="px-6 py-6 text-center text-sm text-[#6B7280]">No students in your classes.</div>
                  ) : (
                    uniqueStudents.map((student) => {
                      const result = activeResults.find((r) => r.studentId === student.id);
                      const hasMark = result !== undefined;
                      const grade = result ? gradeFor(Number(result.marksObtained), activeExam.totalMarks) : null;
                      return (
                        <div key={student.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[#F9FAFB] transition-colors">
                          <div className="relative">
                            <div className="w-11 h-11 rounded-full bg-[#E0EBEC] flex items-center justify-center text-sm font-bold text-[#1F5A5C]">
                              {initials(student.fullName)}
                            </div>
                            {hasMark && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center">
                                <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#1F2937]">{student.fullName}</p>
                            <p className="text-xs text-[#6B7280]">ID: #{student.admissionNo}</p>
                          </div>
                          <div className="text-right">
                            {hasMark ? (
                              <>
                                <p className="text-xl font-bold text-[#1F2937]">{Math.round(Number(result!.marksObtained))}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#10B981]">Saved · {grade}</p>
                              </>
                            ) : (
                              <>
                                <input
                                  type="number"
                                  min={0}
                                  max={activeExam.totalMarks}
                                  placeholder="—"
                                  className="w-16 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] px-2 py-1.5 text-sm text-center text-[#1F2937] outline-none focus:ring-2 focus:ring-[#1F5A5C]/20"
                                />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#D69E3F] mt-0.5">Draft</p>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-[#E5E7EB] pt-4 mt-4">
                  <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#1F5A5C] to-[#2a7579] shadow-[0_8px_20px_rgba(31,90,92,0.12)] active:scale-[0.98] transition-all py-3 text-sm font-bold text-white">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    Submit All Marks
                  </button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
