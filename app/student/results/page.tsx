import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function StudentResultsPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);

  const student = await prisma.student.findUnique({ where: { userId: session.id }, select: { id: true } });

  if (!student) {
    return (
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-8">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Exam Results</h2>
        <p className="mt-2 text-sm text-[#6f7979]">Student profile not found. Please contact your administrator.</p>
      </div>
    );
  }

  const results = await prisma.result.findMany({
    where: { studentId: student.id },
    include: {
      exam: { select: { title: true, totalMarks: true, passingMarks: true, examDate: true } },
      subject: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const average = results.length
    ? Math.round(results.reduce((sum, result) => sum + Number(result.marksObtained), 0) / results.length)
    : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <h2 className="text-3xl font-bold text-[#1a1c1c]">Results</h2>
        <p className="mt-1 text-sm text-[#6f7979]">Average Marks: {average}</p>
      </div>

      <div className="rounded-xl bg-white border border-[#e2e8e8] p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8e8]">
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Exam</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Subject</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Marks</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Grade</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#6f7979]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8e8]">
              {results.map((result) => (
                <tr key={result.id}>
                  <td className="py-3 font-medium text-[#1a1c1c]">{result.exam.title}</td>
                  <td className="py-3 text-[#6f7979]">{result.subject.name}</td>
                  <td className="py-3 font-semibold text-[#1a1c1c]">{Math.round(Number(result.marksObtained))} / {result.exam.totalMarks}</td>
                  <td className="py-3 font-bold text-[#004649]">{result.grade}</td>
                  <td className="py-3 text-[#6f7979]">{result.exam.examDate.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length === 0 ? <p className="mt-4 text-sm text-[#6f7979]">No results published yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
