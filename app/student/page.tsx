import Link from 'next/link';
import { AssignmentStatus, UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader, KpiCard, Card } from '@/components/ui';
import { BookOpen, Award, Wallet, TrendingUp, ClipboardList, WifiOff } from 'lucide-react';

export const dynamic = 'force-dynamic';

function DbOfflineBanner() {
  return (
    <Card className="p-8">
      <div className="flex flex-col items-center py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fef2f2]">
          <WifiOff className="h-7 w-7 text-[#ef4444]" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-[#1F2937]">Database Unreachable</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Unable to load student dashboard data. Please refresh.</p>
      </div>
    </Card>
  );
}

function toDateString(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toISOString().slice(0, 10);
}

function isPlaceholderResult(result: {
  exam: { title: string; totalMarks?: number | null };
  subject: { name: string };
  marksObtained: number | string | { toString(): string };
  remarks: string | null;
}) {
  const title = result.exam.title.trim().toLowerCase();
  const subject = result.subject.name.trim().toLowerCase();
  const marks = Number(result.marksObtained);
  const remarks = (result.remarks ?? '').trim();

  return title === 'new' && subject === 'general' && result.exam.totalMarks === 100 && marks === 100 && remarks === '80';
}

const progressLineKeyMap = {
  'Sabaq Report: Miqdar': 'sabaqMiqdar',
  'Kaifiyat:': 'kaifiyat',
  'Tajweedi Ghaltiyan:': 'tajweedi',
  'Hifz ki Ghaltiyan:': 'hifz',
  'Sabqi Report: Miqdar': 'sabqiMiqdar',
  'Manzil Report: Miqdar': 'manzilMiqdar'
} as const;

type ParsedProgress = {
  sabaqMiqdar: string;
  sabaqKaifiyat: string;
  sabaqTajweedi: string;
  sabaqHifz: string;
  sabqiMiqdar: string;
  sabqiKaifiyat: string;
  sabqiTajweedi: string;
  sabqiHifz: string;
  manzilMiqdar: string;
  manzilKaifiyat: string;
  manzilTajweedi: string;
  manzilHifz: string;
};

function parseProgressNotes(notes: string | null): ParsedProgress | null {
  if (!notes) return null;

  const lines = notes
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line !== '________________________');

  const parsed: ParsedProgress = {
    sabaqMiqdar: '-',
    sabaqKaifiyat: '-',
    sabaqTajweedi: '-',
    sabaqHifz: '-',
    sabqiMiqdar: '-',
    sabqiKaifiyat: '-',
    sabqiTajweedi: '-',
    sabqiHifz: '-',
    manzilMiqdar: '-',
    manzilKaifiyat: '-',
    manzilTajweedi: '-',
    manzilHifz: '-'
  };

  if (notes.includes('[SABAQ]') || notes.includes('[SABQI]') || notes.includes('[MANZIL]')) {
    const applyStructuredSection = (sectionKey: 'sabaq' | 'sabqi' | 'manzil') => {
      const upper = sectionKey.toUpperCase();
      const block = notes.match(new RegExp(`\\[${upper}\\]([\\s\\S]*?)(?=\\[|$)`))?.[1] ?? '';
      if (!block) return;

      const ranges = block
        .split(/Range:\d+/)
        .slice(1)
        .map((rangeBlock) => {
          const surahName = rangeBlock.match(/SurahName:([^\n\r]+)/)?.[1]?.trim();
          const fromAyah = rangeBlock.match(/FromAyah:(\d+)/)?.[1];
          const toAyah = rangeBlock.match(/ToAyah:(\d+)/)?.[1];
          return surahName && surahName !== '-' && fromAyah && toAyah
            ? `${surahName} (${fromAyah}-${toAyah})`
            : null;
        })
        .filter((value): value is string => Boolean(value));

      parsed[`${sectionKey}Miqdar`] = ranges.length ? ranges.join(', ') : '-';
      parsed[`${sectionKey}Kaifiyat`] = block.match(/Kaifiyat:([^\n\r]+)/)?.[1]?.trim() ?? '-';
      parsed[`${sectionKey}Tajweedi`] =
        block.match(/TajweeditTotal:(\d+)/)?.[1] ??
        block.match(/TajweediGhalat:(\d+)/)?.[1] ??
        '-';
      parsed[`${sectionKey}Hifz`] =
        block.match(/HifzTotal:(\d+)/)?.[1] ??
        block.match(/HifzGhalat:(\d+)/)?.[1] ??
        '-';
    };

    applyStructuredSection('sabaq');
    applyStructuredSection('sabqi');
    applyStructuredSection('manzil');
    return parsed;
  }

  let currentMode: 'sabaq' | 'sabqi' | 'manzil' | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] as keyof typeof progressLineKeyMap;

    if (line === 'Sabaq Report: Miqdar') currentMode = 'sabaq';
    if (line === 'Sabqi Report: Miqdar') currentMode = 'sabqi';
    if (line === 'Manzil Report: Miqdar') currentMode = 'manzil';

    if (!(line in progressLineKeyMap) || !currentMode) continue;

    const nextValue = lines[i + 1] && !(lines[i + 1] in progressLineKeyMap) ? lines[i + 1] : '-';

    if (line === 'Sabaq Report: Miqdar') parsed.sabaqMiqdar = nextValue;
    if (line === 'Sabqi Report: Miqdar') parsed.sabqiMiqdar = nextValue;
    if (line === 'Manzil Report: Miqdar') parsed.manzilMiqdar = nextValue;
    if (line === 'Kaifiyat:') parsed[`${currentMode}Kaifiyat`] = nextValue;
    if (line === 'Tajweedi Ghaltiyan:') parsed[`${currentMode}Tajweedi`] = nextValue;
    if (line === 'Hifz ki Ghaltiyan:') parsed[`${currentMode}Hifz`] = nextValue;
  }

  return parsed;
}

const getCachedStudentDashboardData = unstable_cache(
  async (userId: string) => {
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        user: { select: { fullName: true } },
        class: { select: { id: true, name: true, section: true } }
      }
    });

    if (!student) {
      return null;
    }

    const [attendanceRows, resultRows, feeRows, subjects, totalAssignments, submittedAssignments, progressRows] = await Promise.all([
      prisma.attendance.groupBy({
        by: ['status'],
        where: { studentId: student.id },
        _count: { _all: true }
      }),
      prisma.result.findMany({
        where: { studentId: student.id },
        include: {
          subject: { select: { name: true } },
          exam: { select: { title: true, totalMarks: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 5
      }),
      prisma.fee.findMany({
        where: { studentId: student.id },
        include: { payments: { select: { amountPaid: true } } }
      }),
      student.classId
        ? prisma.subject.findMany({
            where: { classId: student.classId },
            include: { teacher: { include: { user: { select: { fullName: true } } } } },
            orderBy: { name: 'asc' },
            take: 6
          })
        : Promise.resolve([]),
      student.classId ? prisma.assignment.count({ where: { classId: student.classId, status: AssignmentStatus.PUBLISHED } }) : Promise.resolve(0),
      prisma.assignmentSubmission.count({ where: { studentId: student.id } }),
      prisma.studentProgress.findMany({
        where: { studentId: student.id },
        include: {
          class: { select: { name: true, section: true } },
          teacher: { include: { user: { select: { fullName: true } } } }
        },
        orderBy: { date: 'desc' },
        take: 5
      })
    ]);

    return { student, attendanceRows, resultRows, feeRows, subjects, totalAssignments, submittedAssignments, progressRows };
  },
  ['student-dashboard-page-data'],
  { revalidate: 30 }
);

export default async function StudentDashboardPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);
  let dashboardData: Awaited<ReturnType<typeof getCachedStudentDashboardData>> = null;
  try {
    dashboardData = await getCachedStudentDashboardData(session.id);
  } catch {
    return <DbOfflineBanner />;
  }

  if (!dashboardData) {
    return (
      <Card className="p-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1F2937]">Student Profile Missing</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Your account is active but no student profile is linked yet. Contact admin.</p>
      </Card>
    );
  }

  const { student, attendanceRows, resultRows, feeRows, totalAssignments, submittedAssignments, progressRows } = dashboardData;

  const totalAttendance = attendanceRows.reduce((sum, row) => sum + row._count._all, 0);
  const presentAttendance = attendanceRows.filter((row) => row.status === 'PRESENT').reduce((sum, row) => sum + row._count._all, 0);
  const attendancePercent = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0;
  const totalFees = feeRows.reduce((sum, fee) => sum + Number(fee.amount) - Number(fee.discount), 0);
  const totalPaid = feeRows.reduce((sum, fee) => sum + fee.payments.reduce((ps, p) => ps + Number(p.amountPaid), 0), 0);
  const outstanding = Math.max(totalFees - totalPaid, 0);
  const visibleResultRows = resultRows.filter((row) => !isPlaceholderResult(row));
  const averageMarks = visibleResultRows.length > 0 ? Math.round(visibleResultRows.reduce((sum, row) => sum + Number(row.marksObtained), 0) / visibleResultRows.length) : 0;
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${student.user.fullName}`}
        subtitle={student.class ? `${student.class.name} - ${student.class.section}` : 'Student'}
      />

      {/* KPI Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard variant="success" icon={<ClipboardList />} label="Attendance" value={`${attendancePercent}%`} />
        <KpiCard variant="primary" icon={<BookOpen />} label="Assignments" value={`${submittedAssignments}/${totalAssignments}`} />
        <KpiCard variant="primary" icon={<Award />} label="Average Mark" value={averageMarks} />
        <KpiCard variant={outstanding > 0 ? 'danger' : 'success'} icon={<Wallet />} label="Outstanding Fee" value={outstanding > 0 ? `PKR ${outstanding.toLocaleString()}` : 'Paid'} />
      </section>

      {/* Results */}
      <div>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D1FAE5]">
                <Award className="h-4 w-4 text-[#10B981]" />
              </div>
              <p className="text-sm font-bold text-[#1F2937]">Latest Results</p>
            </div>
            <Link href="/student/results" className="text-xs font-semibold text-[#10B981] hover:underline">
              View
            </Link>
          </div>
          {visibleResultRows.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No results published yet.</p>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {visibleResultRows.map((result) => (
                <div key={result.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1F2937]">{result.subject.name}</p>
                    <p className="text-xs text-[#6B7280]">{result.exam.title}</p>
                  </div>
                  <span className="ml-2 text-sm font-bold text-[#10B981]">{result.grade}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Daily Progress */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5E6CC]">
              <TrendingUp className="h-4 w-4 text-[#D69E3F]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F2937]">Daily Progress Reports</h3>
          </div>
          {progressRows.length > 0 && (
            <span className="rounded-full bg-[#F5E6CC] px-2.5 py-1 text-[10px] font-bold text-[#D69E3F]">
              {progressRows.length} entries
            </span>
          )}
        </div>
        <p className="text-xs text-[#6B7280] mb-4 mt-1">Sabaq, Sabqi, and Manzil — entered by teacher daily.</p>

        {progressRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F9FAFB]">
              <TrendingUp className="h-7 w-7 text-[#D1D5DB]" />
            </div>
            <p className="mt-3 text-sm font-semibold text-[#1F2937]">No progress reports yet</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">Your teacher will add daily entries here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {progressRows.map((row) => {
              const parsed = parseProgressNotes(row.notes);
              const sectionThemes = [
                { title: 'Sabaq', bg: 'bg-[#D1FAE5]', border: 'border-[#A7F3D0]', titleColor: 'text-[#10B981]', fields: parsed ? [{ label: 'Amount', value: parsed.sabaqMiqdar }, { label: 'Performance', value: parsed.sabaqKaifiyat }, { label: 'Tajweedi Errors', value: parsed.sabaqTajweedi }, { label: 'Hifz Errors', value: parsed.sabaqHifz }] : [] },
                { title: 'Sabqi', bg: 'bg-[#FEF3C7]', border: 'border-[#FDE68A]', titleColor: 'text-[#D69E3F]', fields: parsed ? [{ label: 'Amount', value: parsed.sabqiMiqdar }, { label: 'Performance', value: parsed.sabqiKaifiyat }, { label: 'Tajweedi Errors', value: parsed.sabqiTajweedi }, { label: 'Hifz Errors', value: parsed.sabqiHifz }] : [] },
                { title: 'Manzil', bg: 'bg-[#E0EBEC]', border: 'border-[#B2D8DB]', titleColor: 'text-[#1F5A5C]', fields: parsed ? [{ label: 'Amount', value: parsed.manzilMiqdar }, { label: 'Performance', value: parsed.manzilKaifiyat }, { label: 'Tajweedi Errors', value: parsed.manzilTajweedi }, { label: 'Hifz Errors', value: parsed.manzilHifz }] : [] },
              ];

              return (
                <div key={row.id} className="rounded-xl border border-[#E5E7EB] overflow-hidden">
                  <div className="flex items-center justify-between bg-[#F9FAFB] px-4 py-2.5 border-b border-[#E5E7EB]">
                    <p className="text-sm font-bold text-[#1F2937]">{toDateString(row.date)}</p>
                    <p className="text-xs text-[#6B7280]">
                      {row.class?.name && row.class?.section ? `${row.class.name} · ${row.class.section}` : 'No class'} &middot; {row.teacher?.user?.fullName ?? 'Teacher'}
                    </p>
                  </div>
                  {!parsed ? (
                    <pre className="p-4 whitespace-pre-wrap text-sm text-[#3e4748]">{row.notes || '-'}</pre>
                  ) : (
                    <div className="grid divide-y divide-[#E5E7EB] md:grid-cols-3 md:divide-x md:divide-y-0">
                      {sectionThemes.map((section) => (
                        <div key={section.title} className="p-4">
                          <div className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${section.bg} ${section.titleColor} border ${section.border} mb-3`}>
                            {section.title}
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                            {section.fields.map((field) => (
                              <div key={field.label}>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">{field.label}</p>
                                <p className="text-sm font-semibold text-[#1F2937] mt-0.5">{field.value || '—'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
