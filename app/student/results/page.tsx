import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function StudentResultsPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);

  const student = await prisma.student.findUnique({ where: { userId: session.id }, select: { id: true } });

  if (!student) {
    return (
      <div className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#6e7778]">Student Hub</p>
        <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.03em] text-[#004649]">Exam Results</h2>
        <p className="mt-2 text-[#5c6668]">Student profile not found. Please contact your administrator.</p>
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

  const passCount = results.filter((r) => Number(r.marksObtained) >= r.exam.passingMarks).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#6e7778]">Student Hub</p>
        <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.03em] text-[#004649]">Exam Results</h2>
        <p className="mt-2 text-[#5c6668]">Your academic performance across all exams and subjects.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">Average Marks</p>
          <p className="font-headline mt-2 text-3xl font-extrabold text-[#004649]">{average}</p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">Exams Passed</p>
          <p className="font-headline mt-2 text-3xl font-extrabold text-emerald-700">{passCount}</p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6e7778]">Total Exams</p>
          <p className="font-headline mt-2 text-3xl font-extrabold text-[#1a1c1c]">{results.length}</p>
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <h3 className="font-headline text-2xl font-bold tracking-[-0.02em] text-[#004649]">Results Register</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f4f3] text-[#596364]">
              <tr>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Exam</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Subject</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Marks</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Grade</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Result</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]">Date</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => {
                const obtained = Math.round(Number(result.marksObtained));
                const passed = obtained >= result.exam.passingMarks;
                return (
                  <tr key={result.id} className="border-b border-[#eef1f1]">
                    <td className="px-3 py-3 font-semibold text-[#1a1c1c]">{result.exam.title}</td>
                    <td className="px-3 py-3 text-[#596364]">{result.subject.name}</td>
                    <td className="px-3 py-3 font-semibold">{obtained} / {result.exam.totalMarks}</td>
                    <td className="px-3 py-3 font-bold text-[#004649]">{result.grade}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {passed ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[#596364]">{result.exam.examDate.toISOString().slice(0, 10)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {results.length === 0 ? <p className="mt-4 text-sm text-[#5c6668]">No results published yet.</p> : null}
        </div>
      </section>
    </div>
  );
}