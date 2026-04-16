import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function StudentResultsPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);

  const student = await prisma.student.findUnique({
    where: { userId: session.id },
    select: { id: true, classId: true, admissionNo: true }
  });

  if (!student) {
    return (
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-8">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Exam Results</h2>
        <p className="mt-2 text-sm text-[#6f7979]">Student profile not found. Please contact your administrator.</p>
      </div>
    );
  }

  const [results, attendance, assignmentFiles] = await Promise.all([
    prisma.result.findMany({
      where: { studentId: student.id },
      include: {
        exam: { select: { title: true, totalMarks: true, passingMarks: true, examDate: true } },
        subject: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.attendance.findMany({
      where: student.classId ? { classId: student.classId } : { studentId: student.id },
      select: { status: true }
    }),
    prisma.fileAsset.findMany({
      where: {},
      include: { assignment: { include: { subject: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
  ]);

  const totalMarksMax = results.reduce((sum, r) => sum + r.exam.totalMarks, 0);
  const totalMarksObt = results.reduce((sum, r) => sum + Number(r.marksObtained), 0);
  const gpa = results.length ? Math.min(4.0, (totalMarksObt / Math.max(totalMarksMax, 1)) * 4.0) : 0;
  const presentCount = attendance.filter((a) => a.status === 'PRESENT').length;
  const attendancePct = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 100;

  const subjectFiles = new Map<string, { name: string; files: typeof assignmentFiles }>();
  for (const file of assignmentFiles) {
    if (!file.assignment) continue;
    const subName = file.assignment.subject.name;
    if (!subjectFiles.has(subName)) subjectFiles.set(subName, { name: subName, files: [] });
    subjectFiles.get(subName)!.files.push(file);
  }

  const gradeColor = (grade: string | null) => {
    if (!grade) return 'text-[#6f7979]';
    if (grade.startsWith('A')) return 'text-[#004649]';
    if (grade.startsWith('B')) return 'text-[#1565c0]';
    if (grade.startsWith('C')) return 'text-[#865300]';
    return 'text-[#ba1a1a]';
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden" style={{ background: '#004649' }}>
        <div className="p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Cumulative Performance</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-white">{gpa.toFixed(2)}</span>
            <span className="text-xl font-semibold text-white/80">GPA</span>
          </div>
          <div className="mt-3">
            <span className="inline-block bg-[#865300] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
              {gpa >= 3.8 ? 'Top 5% Class Rank' : gpa >= 3.5 ? 'Top 15% Class Rank' : gpa >= 3.0 ? 'Good Standing' : 'Needs Improvement'}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-[#e2e8e8] overflow-hidden">
        <div className="flex border-b border-[#e2e8e8]">
          <a href="?tab=notes" className="flex-1 py-3 text-center text-sm font-semibold text-[#1a1c1c] bg-white border-b-2 border-[#004649]">Study Notes</a>
          <a href="?tab=results" className="flex-1 py-3 text-center text-sm font-medium text-[#6f7979] hover:bg-[#f5f7f5]">Exam Results</a>
        </div>

        <div className="p-6 space-y-6">
          {subjectFiles.size === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-[#f5f7f5] flex items-center justify-center mx-auto mb-3">
                <svg className="h-6 w-6 text-[#6f7979]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <p className="font-semibold text-[#1a1c1c]">No study notes yet</p>
              <p className="text-sm text-[#6f7979] mt-1">Resources uploaded by teachers will appear here.</p>
            </div>
          ) : (
            Array.from(subjectFiles.values()).map((subj) => (
              <div key={subj.name}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-[#1a1c1c]">{subj.name}</h3>
                  <span className="text-[10px] font-bold text-[#865300] uppercase tracking-widest">{subj.files.length} Files</span>
                </div>
                <div className="space-y-2">
                  {subj.files.map((file) => {
                    const isPdf = file.mimeType.includes('pdf');
                    const isDoc = file.mimeType.includes('word') || file.originalName.endsWith('.docx');
                    return (
                      <div key={file.id} className="flex items-center gap-3 rounded-xl border border-[#e2e8e8] p-3 hover:bg-[#f5f7f5]">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPdf ? 'bg-[#fce4ec]' : isDoc ? 'bg-[#e3f2fd]' : 'bg-[#e8f5e9]'}`}>
                          {isPdf ? (
                            <span className="text-[9px] font-black text-[#ba1a1a]">PDF</span>
                          ) : isDoc ? (
                            <svg className="h-5 w-5 text-[#1565c0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5 text-[#004649]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1a1c1c] truncate">{file.originalName}</p>
                          <p className="text-xs text-[#6f7979]">{isPdf ? 'PDF' : isDoc ? 'Docx' : 'File'}, {(file.sizeInBytes / 1024).toFixed(0)} KB</p>
                        </div>
                        <button className="w-8 h-8 rounded-full border border-[#e2e8e8] flex items-center justify-center hover:bg-[#f5f7f5] shrink-0">
                          <svg className="h-4 w-4 text-[#1a1c1c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-[#e2e8e8] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-[#004649]/10 flex items-center justify-center">
                  <svg className="h-3.5 w-3.5 text-[#004649]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#6f7979]">Attendance</p>
              </div>
              <p className="text-2xl font-bold text-[#1a1c1c]">{attendancePct}%</p>
            </div>
            <div className="rounded-xl border border-[#e2e8e8] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-[#865300]/10 flex items-center justify-center">
                  <svg className="h-3.5 w-3.5 text-[#865300]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
                  </svg>
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#6f7979]">Credits</p>
              </div>
              <p className="text-2xl font-bold text-[#1a1c1c]">{results.length * 3} <span className="text-sm font-medium text-[#6f7979]">/ 150</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h3 className="font-bold text-[#1a1c1c] mb-4">Exam Results</h3>
        {results.length === 0 ? (
          <p className="text-sm text-[#6f7979]">No results published yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e2e8e8]">
                  <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Exam</th>
                  <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Subject</th>
                  <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Marks</th>
                  <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Grade</th>
                  <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8e8]">
                {results.map((result) => (
                  <tr key={result.id}>
                    <td className="py-3 font-medium text-[#1a1c1c]">{result.exam.title}</td>
                    <td className="py-3 text-[#6f7979]">{result.subject.name}</td>
                    <td className="py-3 font-semibold text-[#1a1c1c]">{Math.round(Number(result.marksObtained))} / {result.exam.totalMarks}</td>
                    <td className={`py-3 font-bold ${gradeColor(result.grade)}`}>{result.grade}</td>
                    <td className="py-3 text-[#6f7979]">{result.exam.examDate.toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
