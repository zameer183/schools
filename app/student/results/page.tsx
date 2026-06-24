import { Prisma, UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui';

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

function isPlaceholderResult(result: {
  exam: { title: string; totalMarks: number };
  subject: { name: string };
  marksObtained: Prisma.Decimal | number | string;
  remarks: string | null;
}) {
  const title = result.exam.title.trim().toLowerCase();
  const subject = result.subject.name.trim().toLowerCase();
  const marks = Number(result.marksObtained);
  const remarks = (result.remarks ?? '').trim();

  return title === 'new' && subject === 'general' && result.exam.totalMarks === 100 && marks === 100 && remarks === '80';
}

type AssignmentFileRow = Prisma.FileAssetGetPayload<{
  include: { assignment: { include: { subject: { select: { name: true } } } } };
}>;

const getCachedStudentResultsData = unstable_cache(
  async (userId: string) => {
    try {
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
    } catch (error) {
      console.error('[student/results] failed to load data', error);
      return { student: null, results: [], attendance: [], assignmentFiles: [] };
    }
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
  const visibleResults = results.filter((result) => !isPlaceholderResult(result));
  const totalMarksMax = visibleResults.reduce((sum, r) => sum + r.exam.totalMarks, 0);
  const totalMarksObt = visibleResults.reduce((sum, r) => sum + Number(r.marksObtained), 0);
  const gpa = visibleResults.length ? Math.min(4.0, (totalMarksObt / Math.max(totalMarksMax, 1)) * 4.0) : 0;
  void attendance;
  void assignmentFiles;

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
        <h3 className="text-lg font-semibold text-[#1F2937] mb-4">Exam Results</h3>
        {visibleResults.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-10 text-center">
            <p className="text-base font-semibold text-[#1F2937]">No exams found</p>
            <p className="mt-1 text-sm text-[#6B7280]">Exam results will appear here after a teacher publishes them.</p>
          </div>
        ) : (
          <>
          <div className="space-y-3 md:hidden">
            {visibleResults.map((result) => {
              const parsed = parseExamTitle(result.exam.title);
              return (
                <div key={result.id} className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1F2937]">{parsed.title}</p>
                      <p className="text-xs text-[#6B7280]">{parsed.examType} • {result.subject.name}</p>
                    </div>
                    <span className={`text-sm font-bold ${gradeColor(result.grade)}`}>{result.grade || '-'}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[#6B7280]">Marks</p>
                      <p className="font-semibold text-[#1F2937]">{Math.round(Number(result.marksObtained))}/{result.exam.totalMarks}</p>
                    </div>
                    <div>
                      <p className="text-[#6B7280]">Date</p>
                      <p className="font-semibold text-[#1F2937]">{toDateString(result.exam.examDate)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[#6B7280]">Teacher</p>
                      <p className="font-semibold text-[#1F2937]">{result.exam.createdBy?.user.fullName ?? '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[#6B7280]">Notes</p>
                      <p className="font-medium text-[#1F2937]">{result.remarks || '-'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden md:block overflow-x-auto">
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
                {visibleResults.map((result) => {
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
          </>
        )}
      </Card>
    </div>
  );
}
