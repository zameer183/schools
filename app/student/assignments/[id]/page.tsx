import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function StudentAssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAuth([UserRole.STUDENT]);

  const student = await prisma.student.findUnique({ where: { userId: session.id }, select: { id: true } });
  if (!student) notFound();

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      subject: { select: { name: true, code: true } },
      teacher: { include: { user: { select: { fullName: true } } } },
      files: true,
      submissions: { where: { studentId: student.id } }
    }
  });

  if (!assignment) notFound();

  const submission = assignment.submissions[0] ?? null;
  const isOverdue = !submission && new Date(assignment.dueDate) < new Date();
  const statusLabel = submission
    ? submission.status === 'GRADED' ? 'Graded' : 'Submitted'
    : isOverdue ? 'Overdue' : 'Pending Submission';
  const statusColor = submission
    ? submission.status === 'GRADED' ? 'bg-[#e8f5e9] text-[#004649]' : 'bg-[#e8f0ff] text-[#1a4bcc]'
    : isOverdue ? 'bg-[#fce4ec] text-[#ba1a1a]' : 'bg-[#fff3e0] text-[#865300]';

  const fileIcon = (mime: string) => {
    if (mime.includes('pdf')) return (
      <div className="w-10 h-10 rounded-xl bg-[#fce4ec] flex items-center justify-center shrink-0">
        <span className="text-[10px] font-black text-[#ba1a1a]">PDF</span>
      </div>
    );
    if (mime.includes('video')) return (
      <div className="w-10 h-10 rounded-xl bg-[#e3f2fd] flex items-center justify-center shrink-0">
        <svg className="h-5 w-5 text-[#1565c0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      </div>
    );
    return (
      <div className="w-10 h-10 rounded-xl bg-[#e8f5e9] flex items-center justify-center shrink-0">
        <svg className="h-5 w-5 text-[#004649]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/student/assignments" className="flex items-center gap-1.5 text-sm text-[#6f7979] hover:text-[#1a1c1c] transition">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Academics · {assignment.subject.name} · Assignment Details
      </Link>

      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3 ${statusColor}`}>
          {statusLabel}
        </span>
        <h2 className="text-2xl font-bold text-[#1a1c1c]">{assignment.title}</h2>
        <div className="flex items-center gap-2 mt-2 text-sm text-[#6f7979]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          Due: {new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-[#f5f7f5] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Weightage</p>
            <p className="mt-1 text-lg font-bold text-[#1a1c1c]">15% of Grade</p>
          </div>
          <div className="rounded-xl bg-[#f5f7f5] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Max Points</p>
            <p className="mt-1 text-lg font-bold text-[#1a1c1c]">{assignment.maxMarks} pts</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h3 className="font-bold text-[#1a1c1c] mb-3 flex items-center gap-2">
          <svg className="h-5 w-5 text-[#004649]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
          </svg>
          Instructions
        </h3>
        <p className="text-sm text-[#3d4a4a] leading-relaxed whitespace-pre-line">{assignment.description}</p>
        {isOverdue && (
          <div className="mt-4 rounded-xl bg-[#fff3e0] border border-[#fdb24f]/30 p-4">
            <p className="text-sm text-[#865300] font-medium">
              <span className="font-bold">Note:</span> Late submissions will incur a 10% penalty per day unless prior arrangements have been made with the department.
            </p>
          </div>
        )}
      </div>

      {assignment.files.length > 0 && (
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <h3 className="font-bold text-[#1a1c1c] mb-3 flex items-center gap-2">
            <svg className="h-5 w-5 text-[#004649]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            Study Resources
          </h3>
          <div className="space-y-3">
            {assignment.files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 rounded-xl border border-[#e2e8e8] p-3 hover:bg-[#f5f7f5]">
                {fileIcon(file.mimeType)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1a1c1c] truncate">{file.originalName}</p>
                  <p className="text-xs text-[#6f7979]">{(file.sizeInBytes / 1024).toFixed(0)} KB</p>
                </div>
                <button className="w-8 h-8 rounded-full border border-[#e2e8e8] flex items-center justify-center hover:bg-[#f5f7f5]">
                  <svg className="h-4 w-4 text-[#1a1c1c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {submission ? (
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <h3 className="font-bold text-[#1a1c1c] mb-3">Your Submission</h3>
          <div className="rounded-xl bg-[#e8f5e9] border border-[#004649]/20 p-4 flex items-center gap-3">
            <svg className="h-6 w-6 text-[#004649] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div>
              <p className="font-semibold text-[#004649]">Submitted successfully</p>
              <p className="text-xs text-[#004649]/70">
                {new Date(submission.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {submission.marksObtained != null && ` · ${submission.marksObtained} / ${assignment.maxMarks} marks`}
              </p>
            </div>
          </div>
          {submission.feedback && (
            <div className="mt-3 rounded-xl bg-[#f5f7f5] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6f7979] mb-1">Teacher Feedback</p>
              <p className="text-sm text-[#3d4a4a]">{submission.feedback}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
          <h3 className="font-bold text-[#1a1c1c] mb-3 flex items-center gap-2">
            <svg className="h-5 w-5 text-[#004649]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            Your Submission
          </h3>
          <div className="border-2 border-dashed border-[#e2e8e8] rounded-xl p-8 text-center mb-4 cursor-pointer hover:border-[#004649]/40 hover:bg-[#f5f7f5] transition-colors">
            <svg className="h-10 w-10 text-[#6f7979] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <p className="font-semibold text-[#1a1c1c]">Click to upload or drag &amp; drop</p>
            <p className="text-xs text-[#6f7979] mt-1">PDF, DOCX, or ZIP (MAX 100MB)</p>
          </div>
          <textarea
            placeholder="Add a comment for the professor..."
            rows={3}
            className="w-full rounded-xl bg-[#f5f7f5] px-4 py-3 text-sm text-[#1a1c1c] placeholder:text-[#6f7979]/60 outline-none ring-[#004649]/20 transition focus:ring-2 resize-none mb-4"
          />
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#004649] py-3 text-sm font-bold text-white hover:opacity-90 transition">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            Submit Assignment
          </button>
          <p className="mt-3 text-center text-xs text-[#6f7979]">
            Need help with the portal?{' '}
            <a href="#" className="font-semibold text-[#865300] hover:underline">Contact technical support</a>
          </p>
        </div>
      )}
    </div>
  );
}
