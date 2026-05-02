import Link from 'next/link';
import { AssignmentStatus, UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { KpiCard } from '@/components/ui/kpi-card';
import { Card } from '@/components/ui/Card';

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
      <Card className="p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">Student</p>
        <h1 className="mt-2 text-2xl md:text-4xl font-bold text-[#1F2937]">Welcome, {student.user.fullName}</h1>
        {student.class && (
          <p className="mt-2 text-sm md:text-base text-[#6B7280]">{student.class.name} — {student.class.section}</p>
        )}
      </Card>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard title="ATTENDANCE" value={`${attendancePercent}%`} subtitle={`${presentAttendance}/${totalAttendance} present`} />
        <KpiCard title="ASSIGNMENTS" value={`${submittedAssignments}/${totalAssignments}`} subtitle="Submitted vs published" />
        <KpiCard title="AVERAGE MARKS" value={`${averageMarks}`} subtitle="Latest exam results" />
        <KpiCard title="OUTSTANDING FEE" value={`PKR ${outstanding.toLocaleString()}`} subtitle={outstanding > 0 ? 'Amount due' : 'All paid'} />
      </div>

      {/* Subjects & Results */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1F2937]">Subjects</h3>
            <Link href="/student/schedule" className="text-xs font-semibold text-[#1F5A5C] hover:text-[#2a7478]">
              View schedule →
            </Link>
          </div>
          {subjects.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No subjects assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {subjects.map((subject) => (
                <div key={subject.id} className="rounded-lg bg-[#F5F1E8] px-4 py-3 border border-[#E5E7EB]">
                  <p className="text-sm font-semibold text-[#1F2937]">{subject.name}</p>
                  <p className="text-xs text-[#6B7280] mt-1">{subject.teacher?.user.fullName ?? 'TBA'}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1F2937]">Latest Results</h3>
            <Link href="/student/results" className="text-xs font-semibold text-[#1F5A5C] hover:text-[#2a7478]">
              Open all →
            </Link>
          </div>
          {resultRows.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No results published yet.</p>
          ) : (
            <div className="space-y-3">
              {resultRows.map((result) => (
                <div key={result.id} className="flex items-center justify-between py-3 border-b border-[#E5E7EB] last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1F2937]">{result.subject.name}</p>
                    <p className="text-xs text-[#6B7280]">{result.exam.title}</p>
                  </div>
                  <span className="ml-2 text-sm font-bold text-[#1F5A5C]">{result.grade}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Daily Progress */}
      <Card className="p-5 md:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[#1F2937]">Daily Progress Reports</h3>
          <p className="mt-1 text-xs text-[#6B7280]">Teacher entered Sabaq, Sabqi, and Manzil notes.</p>
        </div>
        {progressRows.length === 0 ? (
          <p className="text-sm text-[#6B7280]">No progress report published yet.</p>
        ) : (
          <div className="space-y-4">
            {progressRows.map((row) => (
              <div key={row.id} className="rounded-lg bg-[#F5F1E8] p-4 border border-[#E5E7EB]">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                  <p className="text-sm font-semibold text-[#1F2937]">{toDateString(row.date)}</p>
                  <p className="text-xs text-[#6B7280]">{row.class.name} - {row.class.section} | {row.teacher.user.fullName}</p>
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
