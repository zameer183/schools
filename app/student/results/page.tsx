import { Prisma, UserRole } from '@prisma/client';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { FileText, Download, BookOpen, Award } from 'lucide-react';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

function toDateString(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toISOString().slice(0, 10);
}

function parseExamTitle(raw: string) {
  const value = raw.trim();
  const match = value.match(/^\[(.+?)\]\s*(.*)$/);
  if (!match) return { examType: 'Custom', title: value };
  return { examType: match[1].trim(), title: (match[2] ?? '').trim() || value };
}

type AssignmentFileRow = Prisma.FileAssetGetPayload<{
  include: { assignment: { include: { subject: { select: { name: true } } } } };
}>;

const getCachedStudentResultsData = unstable_cache(
  async (userId: string) => {
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true, classId: true, admissionNo: true }
    });

    if (!student) {
      return { student: null, results: [], attendance: [], assignmentFiles: [] };
    }

    const [results, attendance, assignmentFiles] = await Promise.all([
      prisma.result.findMany({
        where: { studentId: student.id },
        include: {
          exam: {
            select: {
              title: true,
              totalMarks: true,
              passingMarks: true,
              examDate: true,
              createdBy: { select: { user: { select: { fullName: true } } } }
            }
          },
          subject: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.attendance.findMany({
        where: { studentId: student.id },
        select: { status: true }
      }),
      student.classId
        ? prisma.fileAsset.findMany({
            where: { assignment: { classId: student.classId } },
            include: { assignment: { include: { subject: { select: { name: true } } } } },
            orderBy: { createdAt: 'desc' },
            take: 20
          })
        : Promise.resolve([] as AssignmentFileRow[])
    ]);

    return { student, results, attendance, assignmentFiles };
  },
  ['student-results-page-data'],
  { revalidate: 30 }
);

export default async function StudentResultsPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);
  const { student, results, attendance, assignmentFiles } = await getCachedStudentResultsData(session.id);

  if (!student) {
    return (
      <Card className="p-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1F2937]">Exam Results</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Student profile not found. Contact your administrator.</p>
      </Card>
    );
  }
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
    if (!grade) return 'text-[#6B7280]';
    if (grade.startsWith('A')) return 'text-[#10B981]';
    if (grade.startsWith('B')) return 'text-[#1F5A5C]';
    if (grade.startsWith('C')) return 'text-[#D69E3F]';
    return 'text-[#EF4444]';
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl overflow-hidden bg-[#1F5A5C]">
        <div className="p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Cumulative</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-white">{gpa.toFixed(2)}</span>
            <span className="text-xl font-semibold text-white/80">GPA</span>
          </div>
          <div className="mt-3">
            <span className="inline-block bg-[#D69E3F] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
              {gpa >= 3.8 ? 'Top 5%' : gpa >= 3.5 ? 'Top 15%' : gpa >= 3.0 ? 'Good' : 'Needs Improvement'}
            </span>
          </div>
        </div>
      </div>

      <Card className="p-5 md:p-6 overflow-hidden">
        <div className="flex border-b border-[#E5E7EB] mb-6">
          <Link href="/student/results?tab=notes" className="flex-1 py-3 text-center text-sm font-semibold text-[#1F2937] border-b-2 border-[#1F5A5C]" scroll={false}>Study Notes</Link>
          <Link href="/student/results?tab=results" className="flex-1 py-3 text-center text-sm font-medium text-[#6B7280] hover:text-[#1F2937]" scroll={false}>Exam Results</Link>
        </div>

        {subjectFiles.size === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-full bg-[#F5F1E8] flex items-center justify-center mx-auto mb-3">
              <BookOpen className="h-6 w-6 text-[#6B7280]" />
            </div>
            <p className="font-semibold text-[#1F2937]">No study notes yet</p>
            <p className="text-sm text-[#6B7280] mt-1">Teacher resources will appear here.</p>
          </div>
        ) : (
          <>
          <div className="space-y-6">
            {Array.from(subjectFiles.values()).map((subj) => (
              <div key={subj.name}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#1F2937]">{subj.name}</h3>
                  <span className="text-[10px] font-bold text-[#D69E3F] uppercase tracking-widest">{subj.files.length} Files</span>
                </div>
                <div className="space-y-2">
                  {subj.files.map((file) => {
                    const isPdf = file.mimeType.includes('pdf');
                    const isDoc = file.mimeType.includes('word') || file.originalName.endsWith('.docx');
                    return (
                      <div key={file.id} className="flex items-center gap-3 rounded-lg bg-[#F5F1E8] p-3 hover:bg-[#EEE9DE] transition-colors border border-[#E5E7EB]">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isPdf ? 'bg-[#FEE2E2]' : isDoc ? 'bg-[#DBEAFE]' : 'bg-[#D1FAE5]'}`}>
                          {isPdf ? (
                            <span className="text-[9px] font-black text-[#EF4444]">PDF</span>
                          ) : isDoc ? (
                            <FileText className="h-5 w-5 text-[#3B82F6]" />
                          ) : (
                            <FileText className="h-5 w-5 text-[#10B981]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1F2937] truncate">{file.originalName}</p>
                          <p className="text-xs text-[#6B7280]">{isPdf ? 'PDF' : isDoc ? 'Doc' : 'File'} • {(file.sizeInBytes / 1024).toFixed(0)} KB</p>
                        </div>
                        <button className="w-8 h-8 rounded-full bg-[#EEE9DE] hover:bg-[#E5DDD0] flex items-center justify-center shrink-0 transition-colors">
                          <Download className="h-4 w-4 text-[#1F2937]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#E5E7EB]">
            <div className="rounded-lg bg-[#F5F1E8] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#1F5A5C]/10 flex items-center justify-center">
                  <Award className="h-3 w-3 text-[#1F5A5C]" />
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#6B7280]">Attendance</p>
              </div>
              <p className="text-2xl font-bold text-[#1F2937]">{attendancePct}%</p>
            </div>
            <div className="rounded-lg bg-[#F5F1E8] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#D69E3F]/10 flex items-center justify-center">
                  <Award className="h-3 w-3 text-[#D69E3F]" />
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#6B7280]">Credits</p>
              </div>
              <p className="text-2xl font-bold text-[#1F2937]">{results.length * 3} <span className="text-sm font-medium text-[#6B7280]">/ 150</span></p>
            </div>
          </div>
          </>
        )}
      </Card>

      <Card className="p-5 md:p-6">
        <h3 className="text-lg font-semibold text-[#1F2937] mb-4">Exam Results</h3>
        {results.length === 0 ? (
          <p className="text-sm text-[#6B7280]">No results published yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F5F1E8]">
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Exam</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Type</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Subject</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Teacher</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Marks</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Grade</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Date</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {results.map((result) => {
                  const parsed = parseExamTitle(result.exam.title);
                  return (
                  <tr key={result.id}>
                    <td className="px-3 py-3 font-medium text-[#1F2937]">{parsed.title}</td>
                    <td className="px-3 py-3 text-[#6B7280] text-xs">{parsed.examType}</td>
                    <td className="px-3 py-3 text-[#6B7280]">{result.subject.name}</td>
                    <td className="px-3 py-3 text-[#6B7280] text-sm">{result.exam.createdBy?.user.fullName ?? '-'}</td>
                    <td className="px-3 py-3 font-semibold text-[#1F2937]">{Math.round(Number(result.marksObtained))}/{result.exam.totalMarks}</td>
                    <td className={`px-3 py-3 font-bold text-sm ${gradeColor(result.grade)}`}>{result.grade || '-'}</td>
                    <td className="px-3 py-3 text-[#6B7280] text-sm">{toDateString(result.exam.examDate)}</td>
                    <td className="px-3 py-3 text-[#6B7280] text-xs whitespace-pre-line max-w-xs">{result.remarks || '-'}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
