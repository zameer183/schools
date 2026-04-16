import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function TeacherAcademicsPage() {
  const session = await requireAuth([UserRole.TEACHER]);

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.id },
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
  });

  const exams = teacher?.exams ?? [];
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
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Academics</h2>
        <p className="mt-1 text-sm text-[#6f7979]">Manage exams and enter student marks for your classes.</p>
      </div>

      {exams.length === 0 ? (
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-[#f5f7f5] flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-[#6f7979]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
            </svg>
          </div>
          <p className="font-semibold text-[#1a1c1c]">No exams created yet</p>
          <p className="text-sm text-[#6f7979] mt-1">Exams created by admin will appear here for marks entry.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979] px-1">Select Exam</p>
            {exams.map((exam) => (
              <div
                key={exam.id}
                className={`rounded-xl border p-4 cursor-pointer transition-colors ${exam.id === activeExam?.id ? 'border-[#004649] bg-[#e8f5e9]' : 'border-[#e2e8e8] bg-white hover:bg-[#f5f7f5]'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#1a1c1c]">{exam.title}</p>
                    <p className="text-xs text-[#6f7979] mt-0.5">{exam.subject.name} · {exam.class.name} {exam.class.section}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-[#fff3e0] text-[#865300] px-2 py-1 rounded-full shrink-0">
                    {exam.examDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-[#6f7979]">
                  <span>{exam.results.length} / {uniqueStudents.length} graded</span>
                  <span>·</span>
                  <span>Max {exam.totalMarks} marks</span>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2 rounded-xl bg-white border border-[#e2e8e8] overflow-hidden">
            {activeExam && (
              <>
                <div className="p-5 border-b border-[#e2e8e8]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#865300] mb-1">Examination Entry</p>
                  <h3 className="text-2xl font-bold text-[#1a1c1c]">{activeExam.title}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs font-semibold bg-[#fff3e0] text-[#865300] px-3 py-1 rounded-full">
                      {activeExam.examDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <span className="text-xs text-[#6f7979]">· {uniqueStudents.length} Students Total</span>
                  </div>
                </div>

                <div className="p-4 border-b border-[#e2e8e8]">
                  <div className="flex items-center gap-2 rounded-xl bg-[#f5f7f5] px-3 py-2.5">
                    <svg className="h-4 w-4 text-[#6f7979] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input placeholder="Search student name or roll no..." className="bg-transparent text-sm text-[#1a1c1c] placeholder:text-[#6f7979] outline-none flex-1" />
                  </div>
                </div>

                <div className="divide-y divide-[#e2e8e8]">
                  {uniqueStudents.length === 0 ? (
                    <div className="p-6 text-center text-sm text-[#6f7979]">No students in your classes.</div>
                  ) : (
                    uniqueStudents.map((student) => {
                      const result = activeResults.find((r) => r.studentId === student.id);
                      const hasMark = result !== undefined;
                      const grade = result ? gradeFor(Number(result.marksObtained), activeExam.totalMarks) : null;
                      return (
                        <div key={student.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#f5f7f5]">
                          <div className="relative">
                            <div className="w-11 h-11 rounded-full bg-[#f0f2f0] flex items-center justify-center text-sm font-bold text-[#004649]">
                              {initials(student.fullName)}
                            </div>
                            {hasMark && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#004649] flex items-center justify-center">
                                <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#1a1c1c]">{student.fullName}</p>
                            <p className="text-xs text-[#6f7979]">ID: #{student.admissionNo}</p>
                          </div>
                          <div className="text-right">
                            {hasMark ? (
                              <>
                                <p className="text-xl font-bold text-[#1a1c1c]">{Math.round(Number(result!.marksObtained))}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#004649]">Saved · {grade}</p>
                              </>
                            ) : (
                              <>
                                <input
                                  type="number"
                                  min={0}
                                  max={activeExam.totalMarks}
                                  placeholder="—"
                                  className="w-16 rounded-lg border border-[#e2e8e8] px-2 py-1.5 text-sm text-center text-[#1a1c1c] outline-none focus:border-[#004649]"
                                />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#865300] mt-0.5">Draft</p>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-4 border-t border-[#e2e8e8]">
                  <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#004649] py-3 text-sm font-bold text-white hover:opacity-90 transition">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    Submit All Marks
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
