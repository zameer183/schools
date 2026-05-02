import Link from 'next/link';
import { AssignmentStatus, UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader, KpiCard, Card, SectionTitle, StatusBadge } from '@/components/ui';
import { BookOpen, Award, AlertCircle, Wallet, Users2, UserCog2, TrendingUp, ClipboardList } from 'lucide-react';

export const dynamic = 'force-dynamic';

function toDateString(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toISOString().slice(0, 10);
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

    const [attendanceRows, resultRows, feeRows, subjects, totalAssignments, submittedAssignments, progressRows, unreadNotifications] = await Promise.all([
      prisma.attendance.groupBy({
        by: ['status'],
        where: { studentId: student.id },
        _count: { _all: true }
      }),
      prisma.result.findMany({
        where: { studentId: student.id },
        include: {
          subject: { select: { name: true } },
          exam: { select: { title: true } }
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
      }),
      prisma.notification.count({
        where: { userId: student.userId, isRead: false }
      })
    ]);

    return { student, attendanceRows, resultRows, feeRows, subjects, totalAssignments, submittedAssignments, progressRows, unreadNotifications };
  },
  ['student-dashboard-page-data'],
  { revalidate: 30 }
);

export default async function StudentDashboardPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);
  const dashboardData = await getCachedStudentDashboardData(session.id);

  if (!dashboardData) {
    return (
      <Card className="p-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1F2937]">Student Profile Missing</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Your account is active but no student profile is linked yet. Contact admin.</p>
      </Card>
    );
  }

  const { student, attendanceRows, resultRows, feeRows, subjects, totalAssignments, submittedAssignments, progressRows } = dashboardData;

  const totalAttendance = attendanceRows.reduce((sum, row) => sum + row._count._all, 0);
  const presentAttendance = attendanceRows.filter((row) => row.status === 'PRESENT').reduce((sum, row) => sum + row._count._all, 0);
  const attendancePercent = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0;
  const totalFees = feeRows.reduce((sum, fee) => sum + Number(fee.amount) - Number(fee.discount), 0);
  const totalPaid = feeRows.reduce((sum, fee) => sum + fee.payments.reduce((ps, p) => ps + Number(p.amountPaid), 0), 0);
  const outstanding = Math.max(totalFees - totalPaid, 0);
  const averageMarks = resultRows.length > 0 ? Math.round(resultRows.reduce((sum, row) => sum + Number(row.marksObtained), 0) / resultRows.length) : 0;
  const assignmentPercent = totalAssignments > 0 ? Math.round((submittedAssignments / totalAssignments) * 100) : 0;

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

      {/* Subjects & Results */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0EBEC]">
                <BookOpen className="h-4 w-4 text-[#1F5A5C]" />
              </div>
              <p className="text-sm font-bold text-[#1F2937]">Subjects</p>
            </div>
            <Link href="/student/schedule" className="text-xs font-semibold text-[#1F5A5C] hover:underline">
              View
            </Link>
          </div>
          {subjects.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No subjects assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {subjects.map((subject) => (
                <div key={subject.id} className="rounded-lg bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]">
                  <p className="text-sm font-semibold text-[#1F2937]">{subject.name}</p>
                  <p className="text-xs text-[#6B7280] mt-1">{subject.teacher?.user?.fullName ?? 'TBA'}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

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
          {resultRows.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No results published yet.</p>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {resultRows.map((result) => (
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
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5E6CC]">
            <TrendingUp className="h-4 w-4 text-[#D69E3F]" />
          </div>
          <h3 className="text-sm font-bold text-[#1F2937]">Daily Progress Reports</h3>
        </div>
        <p className="text-xs text-[#6B7280] mb-4">Teacher entered Sabaq, Sabqi, and Manzil notes.</p>
        {progressRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <TrendingUp className="h-10 w-10 text-[#E5E7EB]" />
            <p className="mt-2 text-sm text-[#9CA3AF]">No progress report published yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {progressRows.map((row) => (
              <div key={row.id} className="rounded-lg bg-[#F9FAFB] p-4 border border-[#E5E7EB]">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                  <p className="text-sm font-semibold text-[#1F2937]">{toDateString(row.date)}</p>
                  <p className="text-xs text-[#6B7280]">{(row.class?.name && row.class?.section) ? `${row.class.name} - ${row.class.section}` : 'Class not assigned'} | {row.teacher?.user?.fullName ?? 'Teacher'}</p>
                </div>
                {(() => {
                  const parsed = parseProgressNotes(row.notes);
                  if (!parsed) {
                    return <pre className="mt-2 whitespace-pre-wrap text-sm text-[#3e4748]">{row.notes || '-'}</pre>;
                  }

                  const reportSections = [
                    {
                      title: 'Sabaq',
                      fields: [
                        { label: 'Amount', value: parsed.sabaqMiqdar },
                        { label: 'Performance', value: parsed.sabaqKaifiyat },
                        { label: 'Tajweedi', value: parsed.sabaqTajweedi },
                        { label: 'Hifz', value: parsed.sabaqHifz }
                      ]
                    },
                    {
                      title: 'Sabqi',
                      fields: [
                        { label: 'Amount', value: parsed.sabqiMiqdar },
                        { label: 'Performance', value: parsed.sabqiKaifiyat },
                        { label: 'Tajweedi', value: parsed.sabqiTajweedi },
                        { label: 'Hifz', value: parsed.sabqiHifz }
                      ]
                    },
                    {
                      title: 'Manzil',
                      fields: [
                        { label: 'Amount', value: parsed.manzilMiqdar },
                        { label: 'Performance', value: parsed.manzilKaifiyat },
                        { label: 'Tajweedi', value: parsed.manzilTajweedi },
                        { label: 'Hifz', value: parsed.manzilHifz }
                      ]
                    }
                  ];

                  return (
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      {reportSections.map((section) => (
                        <div key={section.title} className="rounded-lg bg-white p-3 border border-[#E5E7EB]">
                          <p className="text-xs font-bold text-[#1F5A5C]">{section.title}</p>
                          <div className="mt-2 space-y-2">
                            {section.fields.map((field) => (
                              <div key={field.label}>
                                <p className="text-[11px] font-semibold text-[#6B7280]">{field.label}</p>
                                <p className="text-sm text-[#1F2937]">{field.value || '-'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
