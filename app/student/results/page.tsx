import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function StudentResultsPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);

  const student = await prisma.student.findUnique({ where: { userId: session.id }, select: { id: true } });

  if (!student) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h2 className="font-headline text-4xl font-extrabold text-slate-900">Results</h2>
        <p className="mt-2 text-slate-600">Student profile missing.</p>
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
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h2 className="font-headline text-4xl font-extrabold tracking-tight text-slate-900">Results</h2>
        <p className="mt-2 text-slate-600">Average Marks: {average}</p>
      </section>

      <section className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Exam</th>
                <th className="px-3 py-2 text-left">Subject</th>
                <th className="px-3 py-2 text-left">Marks</th>
                <th className="px-3 py-2 text-left">Grade</th>
                <th className="px-3 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{result.exam.title}</td>
                  <td className="px-3 py-2">{result.subject.name}</td>
                  <td className="px-3 py-2">
                    {Math.round(Number(result.marksObtained))} / {result.exam.totalMarks}
                    {Number(result.marksObtained) < result.exam.passingMarks ? ' (Below pass)' : ''}
                  </td>
                  <td className="px-3 py-2">{result.grade}</td>
                  <td className="px-3 py-2">{result.exam.examDate.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {results.length === 0 ? <p className="mt-4 text-sm text-slate-600">No results published yet.</p> : null}
      </section>
    </div>
  );
}