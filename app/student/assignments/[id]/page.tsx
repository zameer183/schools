import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Calendar, FileText, Download, Upload, CheckCircle2 } from 'lucide-react';
import { Card, StatusBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';

const getCachedStudentAssignmentDetailData = unstable_cache(
  async (userId: string, assignmentId: string) => {
    const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
    if (!student) return { student: null, assignment: null };

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        subject: { select: { name: true, code: true } },
        teacher: { include: { user: { select: { fullName: true } } } },
        files: true,
        submissions: { where: { studentId: student.id } }
      }
    });

    return { student, assignment };
  },
  ['student-assignment-detail-page-data'],
  { revalidate: 30 }
);

export default async function StudentAssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAuth([UserRole.STUDENT]);
  const { student, assignment } = await getCachedStudentAssignmentDetailData(session.id, id);
  if (!student) notFound();

  if (!assignment) notFound();

  const submission = assignment.submissions[0] ?? null;
  const isOverdue = !submission && new Date(assignment.dueDate) < new Date();
  const statusLabel = submission
    ? submission.status === 'GRADED' ? 'Graded' : 'Submitted'
    : isOverdue ? 'Overdue' : 'Pending Submission';
  const statusVariant = submission
    ? submission.status === 'GRADED' ? 'success' : 'info'
    : isOverdue ? 'danger' : 'pending';

  const fileIcon = (mime: string) => {
    if (mime.includes('pdf')) return (
      <div className="w-10 h-10 rounded-lg bg-[#FEE2E2] flex items-center justify-center shrink-0">
        <span className="text-[9px] font-black text-[#EF4444]">PDF</span>
      </div>
    );
    if (mime.includes('video')) return (
      <div className="w-10 h-10 rounded-lg bg-[#DBEAFE] flex items-center justify-center shrink-0">
        <FileText className="h-5 w-5 text-[#3B82F6]" />
      </div>
    );
    return (
      <div className="w-10 h-10 rounded-lg bg-[#D1FAE5] flex items-center justify-center shrink-0">
        <FileText className="h-5 w-5 text-[#10B981]" />
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/student/assignments" className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1F2937] transition">
        <ChevronLeft className="h-4 w-4" />
        Back to Assignments
      </Link>

      <Card>
        <div className="mb-4">
          <StatusBadge variant={statusVariant}>{statusLabel}</StatusBadge>
        </div>
        <h2 className="text-2xl font-bold text-[#1F2937]">{assignment.title}</h2>
        <div className="flex items-center gap-2 mt-2 text-sm text-[#6B7280]">
          <Calendar className="h-4 w-4" />
          {new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-[#F9FAFB] p-4 border border-[#E5E7EB]">
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B7280]">Weightage</p>
            <p className="mt-1 text-lg font-bold text-[#1F2937]">15%</p>
          </div>
          <div className="rounded-lg bg-[#F9FAFB] p-4 border border-[#E5E7EB]">
            <p className="text-xs font-bold uppercase tracking-widest text-[#6B7280]">Max Points</p>
            <p className="mt-1 text-lg font-bold text-[#1F2937]">{assignment.maxMarks}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0EBEC]">
            <FileText className="h-4 w-4 text-[#1F5A5C]" />
          </div>
          <h3 className="text-sm font-bold text-[#1F2937]">Instructions</h3>
        </div>
        <p className="text-sm text-[#4B5563] leading-relaxed whitespace-pre-line">{assignment.description}</p>
        {isOverdue && (
          <div className="mt-4 rounded-lg bg-[#FEE2E2] border border-[#FECACA] p-4">
            <p className="text-sm text-[#991B1B] font-medium">
              Late submissions incur 10% penalty per day unless arranged with department.
            </p>
          </div>
        )}
      </Card>

      {assignment.files.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5E6CC]">
              <FileText className="h-4 w-4 text-[#D69E3F]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F2937]">Resources</h3>
          </div>
          <div className="space-y-3">
            {assignment.files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 rounded-lg bg-[#F9FAFB] p-3 hover:bg-[#F3F4F6] transition-colors border border-[#E5E7EB]">
                {fileIcon(file.mimeType)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1F2937] truncate">{file.originalName}</p>
                  <p className="text-xs text-[#6B7280]">{(file.sizeInBytes / 1024).toFixed(0)} KB</p>
                </div>
                <button className="w-8 h-8 rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] flex items-center justify-center transition-colors">
                  <Download className="h-4 w-4 text-[#1F2937]" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {submission ? (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
            <h3 className="text-sm font-bold text-[#1F2937]">Submission</h3>
          </div>
          <div className="rounded-lg bg-[#D1FAE5] border border-[#10B981]/30 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-[#10B981] shrink-0" />
            <div>
              <p className="font-semibold text-[#10B981]">Submitted</p>
              <p className="text-xs text-[#10B981]/70">
                {new Date(submission.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {submission.marksObtained != null && ` · ${submission.marksObtained}/${assignment.maxMarks} marks`}
              </p>
            </div>
          </div>
          {submission.feedback && (
            <div className="mt-3 rounded-lg bg-[#F9FAFB] p-4 border border-[#E5E7EB]">
              <p className="text-xs font-bold uppercase tracking-widest text-[#6B7280] mb-2">Feedback</p>
              <p className="text-sm text-[#4B5563]">{submission.feedback}</p>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5E6CC]">
              <Upload className="h-4 w-4 text-[#D69E3F]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F2937]">Submit Work</h3>
          </div>
          <div className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-8 text-center mb-4 cursor-pointer hover:border-[#1F5A5C]/40 hover:bg-[#F9FAFB] transition-colors">
            <Upload className="h-10 w-10 text-[#6B7280] mx-auto mb-3" />
            <p className="font-semibold text-[#1F2937]">Drag files or click to upload</p>
            <p className="text-xs text-[#6B7280] mt-1">PDF, DOCX, or ZIP • Max 100MB</p>
          </div>
          <textarea
            placeholder="Add comments..."
            rows={3}
            className="w-full rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] px-4 py-3 text-sm text-[#1F2937] placeholder:text-[#6B7280]/60 outline-none transition focus:ring-2 focus:ring-[#1F5A5C]/20 resize-none mb-4"
          />
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1F5A5C] hover:bg-[#1a4a4d] py-3 text-sm font-bold text-white transition-colors active:scale-[0.98]">
            <Upload className="h-4 w-4" />
            Submit
          </button>
          <p className="mt-3 text-center text-xs text-[#6B7280]">
            Need help?{' '}
            <button type="button" className="font-semibold text-[#1F5A5C] hover:underline">Contact support</button>
          </p>
        </Card>
      )}
    </div>
  );
}
