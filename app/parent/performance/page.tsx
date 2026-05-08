import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getParentContext } from '@/lib/parent-data';
import { PageHeader, KpiCard, Card, StatusBadge } from '@/components/ui';
import { Award, AlertCircle, BookOpen, TrendingUp, Users2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

function parseExamTitle(raw: string) {
  const value = raw.trim();
  const match = value.match(/^\[(.+?)\]\s*(.*)$/);
  if (!match) return { examType: 'Custom', title: value };
  return { examType: match[1].trim(), title: (match[2] ?? '').trim() || value };
}

function toDateString(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toISOString().slice(0, 10);
}

export default async function ParentPerformancePage() {
  const session = await requireAuth([UserRole.PARENT, UserRole.ADMIN]);
  const context = await getParentContext(session.id);

  if (!context) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center text-center py-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FEE2E2]">
            <AlertCircle className="h-7 w-7 text-[#EF4444]" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[#1F2937]">Performance Unavailable</h2>
          <p className="mt-1 max-w-sm text-sm text-[#6B7280]">Parent profile missing. Contact your administrator.</p>
        </div>
      </Card>
    );
  }

  const { childIds } = context;

  if (childIds.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Child Performance" subtitle="No linked children yet." />
        <Card className="p-8">
          <div className="flex flex-col items-center text-center py-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F5E6CC]">
              <Users2 className="h-7 w-7 text-[#D69E3F]" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#1F2937]">No Children Linked</h3>
            <p className="mt-1 max-w-sm text-sm text-[#6B7280]">
              No child records linked yet. Please contact the admin office.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const [results, progressLogs] = await Promise.all([
    prisma.result.findMany({
      where: { studentId: { in: childIds } },
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        subject: { select: { name: true } },
        exam: {
          select: {
            title: true,
            examDate: true,
            totalMarks: true,
            passingMarks: true,
            createdBy: { select: { user: { select: { fullName: true } } } }
          }
        }
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
  const avgMarks = results.length
    ? Math.round(results.reduce((sum, row) => sum + Number(row.marksObtained), 0) / results.length)
    : 0;
  const passRate = results.length ? Math.round((passCount / results.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Child Performance"
        subtitle={`Average marks: ${avgMarks} | Passed exams: ${passCount}/${results.length}`}
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard variant="primary" icon={<Award />} label="Results" value={results.length} />
        <KpiCard variant="success" icon={<TrendingUp />} label="Pass Rate" value={`${passRate}%`} />
        <KpiCard variant="primary" icon={<Award />} label="Avg Marks" value={avgMarks} />
        <KpiCard variant="accent" icon={<BookOpen />} label="Progress Logs" value={progressLogs.length} />
      </section>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D1FAE5]">
            <Award className="h-4 w-4 text-[#10B981]" />
          </div>
          <h3 className="text-sm font-bold text-[#1F2937]">Exam Results</h3>
        </div>

        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Award className="h-10 w-10 text-[#E5E7EB]" />
            <p className="mt-2 text-sm text-[#9CA3AF]">No results found yet</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {results.map((result) => {
                const obtained = Math.round(Number(result.marksObtained));
                const parsed = parseExamTitle(result.exam.title);
                const passed = obtained >= result.exam.passingMarks;
                return (
                  <div key={result.id} className="rounded-lg bg-[#F9FAFB] p-3 border border-[#E5E7EB]">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#1F2937] truncate">{result.student.user.fullName}</p>
                        <p className="text-xs text-[#6B7280] truncate">{parsed.title}</p>
                      </div>
                      <StatusBadge variant={passed ? 'success' : 'danger'}>{result.grade}</StatusBadge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[#6B7280]">
                      <span>
                        Type: <span className="text-[#1F2937] font-semibold">{parsed.examType}</span>
                      </span>
                      <span>
                        Subject: <span className="text-[#1F2937] font-semibold">{result.subject.name}</span>
                      </span>
                      <span>
                        Marks:{' '}
                        <span className="text-[#1F2937] font-semibold">
                          {obtained}/{result.exam.totalMarks}
                        </span>
                      </span>
                      <span>
                        Date:{' '}
                        <span className="text-[#1F2937] font-semibold">{toDateString(result.exam.examDate)}</span>
                      </span>
                    </div>
                    {result.remarks ? <p className="mt-2 text-xs text-[#6B7280]">Remarks: {result.remarks}</p> : null}
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Student</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Exam</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Type</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Subject</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Teacher</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Marks</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Grade</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {results.map((result) => {
                    const obtained = Math.round(Number(result.marksObtained));
                    const parsed = parseExamTitle(result.exam.title);
                    const passed = obtained >= result.exam.passingMarks;
                    return (
                      <tr key={result.id}>
                        <td className="px-3 py-3 font-medium text-[#1F2937]">{result.student.user.fullName}</td>
                        <td className="px-3 py-3 text-[#1F2937]">{parsed.title}</td>
                        <td className="px-3 py-3 text-[#6B7280]">{parsed.examType}</td>
                        <td className="px-3 py-3 text-[#1F2937]">{result.subject.name}</td>
                        <td className="px-3 py-3 text-[#6B7280]">
                          {result.exam.createdBy?.user.fullName ?? '-'}
                        </td>
                        <td className="px-3 py-3 font-semibold text-[#1F2937]">
                          {obtained}/{result.exam.totalMarks}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge variant={passed ? 'success' : 'danger'}>{result.grade}</StatusBadge>
                        </td>
                        <td className="px-3 py-3 text-[#6B7280]">{toDateString(result.exam.examDate)}</td>
                        <td className="px-3 py-3 text-[#6B7280] whitespace-pre-line">{result.remarks || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5E6CC]">
            <TrendingUp className="h-4 w-4 text-[#D69E3F]" />
          </div>
          <h3 className="text-sm font-bold text-[#1F2937]">Daily Progress</h3>
        </div>

        {progressLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <TrendingUp className="h-10 w-10 text-[#E5E7EB]" />
            <p className="mt-2 text-sm text-[#9CA3AF]">No daily progress entries yet</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {progressLogs.map((log) => (
                <div key={log.id} className="rounded-lg bg-[#F9FAFB] p-3 border border-[#E5E7EB]">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-[#1F2937]">{log.student.user.fullName}</p>
                    <span className="shrink-0 text-xs text-[#6B7280]">{toDateString(log.date)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[#6B7280]">
                    <span>
                      Class:{' '}
                      <span className="text-[#1F2937] font-semibold">
                        {log.class.name} - {log.class.section}
                      </span>
                    </span>
                    <span>
                      Teacher: <span className="text-[#1F2937] font-semibold">{log.teacher.user.fullName}</span>
                    </span>
                    <span>
                      Lesson:{' '}
                      <span className="text-[#1F2937] font-semibold">
                        {log.lessonType} {log.lessonNumber}
                      </span>
                    </span>
                    <span>
                      Ayah:{' '}
                      <span className="text-[#1F2937] font-semibold">
                        {log.ayahFrom ?? '-'} – {log.ayahTo ?? '-'}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Student</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Class</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Lesson</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Ayah</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-[#6B7280]">Teacher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {progressLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-3 py-3 text-[#1F2937]">{toDateString(log.date)}</td>
                      <td className="px-3 py-3 text-[#1F2937]">{log.student.user.fullName}</td>
                      <td className="px-3 py-3 text-[#6B7280]">
                        {log.class.name} - {log.class.section}
                      </td>
                      <td className="px-3 py-3 text-[#1F2937]">
                        {log.lessonType} {log.lessonNumber}
                      </td>
                      <td className="px-3 py-3 text-[#6B7280]">
                        {log.ayahFrom ?? '-'} to {log.ayahTo ?? '-'}
                      </td>
                      <td className="px-3 py-3 text-[#1F2937]">{log.teacher.user.fullName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
