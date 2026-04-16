import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getParentContext } from '@/lib/parent-data';

export const dynamic = 'force-dynamic';

export default async function ParentPerformancePage() {
  const session = await requireAuth([UserRole.PARENT, UserRole.ADMIN]);
  const context = await getParentContext(session.id);

  if (!context) {
    return (
      <div className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <h2 className="font-headline text-3xl font-extrabold text-[#004649]">Performance</h2>
        <p className="mt-2 text-[#5c6668]">Parent profile missing.</p>
      </div>
    );
  }

  const { childIds } = context;

  if (childIds.length === 0) {
    return (
      <div className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <h2 className="font-headline text-3xl font-extrabold text-[#004649]">Performance</h2>
        <p className="mt-2 text-[#5c6668]">No child records linked yet.</p>
      </div>
    );
  }

  const [results, progressLogs] = await Promise.all([
    prisma.result.findMany({
      where: { studentId: { in: childIds } },
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        subject: { select: { name: true } },
        exam: { select: { title: true, examDate: true, totalMarks: true, passingMarks: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 30
    }),
    prisma.studentProgress.findMany({
      where: { studentId: { in: childIds } },
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        class: { select: { name: true, section: true } },
        teacher: { include: { user: { select: { fullName: true } } } }
      },
      orderBy: { date: 'desc' },
      take: 20
    })
  ]);

  const passCount = results.filter((row) => Number(row.marksObtained) >= row.exam.passingMarks).length;
  const avgMarks = results.length ? Math.round(results.reduce((sum, row) => sum + Number(row.marksObtained), 0) / results.length) : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#6e7778]">Parent Hub</p>
        <h2 className="font-headline mt-2 text-4xl font-extrabold tracking-[-0.03em] text-[#004649]">Child Performance</h2>
        <p className="mt-2 text-[#5c6668]">Average marks: {avgMarks} | Passed exams: {passCount}/{results.length}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <p className="text-sm text-[#6e7778]">Results Logged</p>
          <p className="mt-2 text-3xl font-black text-[#004649]">{results.length}</p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <p className="text-sm text-[#6e7778]">Progress Entries</p>
          <p className="mt-2 text-3xl font-black text-[#1b5e62]">{progressLogs.length}</p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
          <p className="text-sm text-[#6e7778]">Pass Rate</p>
          <p className="mt-2 text-3xl font-black text-[#895100]">{results.length ? Math.round((passCount / results.length) * 100) : 0}%</p>
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <h3 className="font-headline text-2xl font-bold text-[#004649]">Exam Results</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f4f3] text-[#5c6668]">
              <tr>
                <th className="px-3 py-2 text-left">Student</th>
                <th className="px-3 py-2 text-left">Exam</th>
                <th className="px-3 py-2 text-left">Subject</th>
                <th className="px-3 py-2 text-left">Marks</th>
                <th className="px-3 py-2 text-left">Grade</th>
                <th className="px-3 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => {
                const obtained = Math.round(Number(result.marksObtained));
                return (
                  <tr key={result.id} className="border-b border-[#eef1f1]">
                    <td className="px-3 py-3">{result.student.user.fullName}</td>
                    <td className="px-3 py-3">{result.exam.title}</td>
                    <td className="px-3 py-3">{result.subject.name}</td>
                    <td className="px-3 py-3">{obtained}/{result.exam.totalMarks}</td>
                    <td className="px-3 py-3">{result.grade}</td>
                    <td className="px-3 py-3">{result.exam.examDate.toISOString().slice(0, 10)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {results.length === 0 ? <p className="mt-4 text-sm text-[#5c6668]">No results found yet.</p> : null}
      </section>

      <section className="rounded-[1.75rem] bg-white p-8 shadow-[0_12px_40px_rgba(0,70,73,0.06)]">
        <h3 className="font-headline text-2xl font-bold text-[#004649]">Daily Progress</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f3f4f3] text-[#5c6668]">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Student</th>
                <th className="px-3 py-2 text-left">Class</th>
                <th className="px-3 py-2 text-left">Lesson</th>
                <th className="px-3 py-2 text-left">Ayah</th>
                <th className="px-3 py-2 text-left">Teacher</th>
              </tr>
            </thead>
            <tbody>
              {progressLogs.map((log) => (
                <tr key={log.id} className="border-b border-[#eef1f1]">
                  <td className="px-3 py-3">{log.date.toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-3">{log.student.user.fullName}</td>
                  <td className="px-3 py-3">{log.class.name} - {log.class.section}</td>
                  <td className="px-3 py-3">{log.lessonType} {log.lessonNumber}</td>
                  <td className="px-3 py-3">{log.ayahFrom ?? '-'} to {log.ayahTo ?? '-'}</td>
                  <td className="px-3 py-3">{log.teacher.user.fullName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {progressLogs.length === 0 ? <p className="mt-4 text-sm text-[#5c6668]">No daily progress entries yet.</p> : null}
      </section>
    </div>
  );
}
