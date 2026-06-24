import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UserRole } from '@prisma/client';
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  CircleAlert,
  PlusCircle,
  Sparkles,
  UserCircle2
} from 'lucide-react';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTeacherAccessLevelsByUserId } from '@/lib/teacher-access';
import { Card, PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };
type SectionKey = 'SABAQ' | 'SABQI' | 'MANZIL';

async function getTeacherScope(userId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: { id: true, classAssignments: { select: { classId: true } } }
  });
  if (!teacher) return null;
  return { id: teacher.id, classIds: teacher.classAssignments.map((x) => x.classId) };
}

function formatDate(value: Date | string) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseProgressNotes(notes: string | null) {
  if (!notes) return null;

  const lines = notes
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: Record<SectionKey, { ranges: string[]; kaifiyat: string; taj: string; hifz: string }> = {
    SABAQ: { ranges: [], kaifiyat: '-', taj: '0', hifz: '0' },
    SABQI: { ranges: [], kaifiyat: '-', taj: '0', hifz: '0' },
    MANZIL: { ranges: [], kaifiyat: '-', taj: '0', hifz: '0' }
  };

  let current: SectionKey | null = null;
  let totalMistakes = 0;
  let overall = '-';

  let rangeDraft: { surah?: string; from?: string; to?: string } = {};

  const flushRange = () => {
    if (!current) return;
    if (rangeDraft.surah || rangeDraft.from || rangeDraft.to) {
      sections[current].ranges.push(`${rangeDraft.surah ?? '-'} (${rangeDraft.from ?? '-'}-${rangeDraft.to ?? '-'})`);
    }
    rangeDraft = {};
  };

  for (const line of lines) {
    if (line === '[SABAQ]' || line === '[SABQI]' || line === '[MANZIL]') {
      flushRange();
      current = line.replace(/[\[\]]/g, '') as SectionKey;
      continue;
    }

    if (line === '[SUMMARY]') {
      flushRange();
      current = null;
      continue;
    }

    if (line.startsWith('OverallPerformance:')) {
      overall = line.replace('OverallPerformance:', '').trim() || '-';
      continue;
    }

    if (line.startsWith('TotalMistakes:')) {
      totalMistakes = Number(line.replace('TotalMistakes:', '').trim()) || 0;
      continue;
    }

    if (!current) continue;

    if (line.startsWith('SurahName:')) rangeDraft.surah = line.replace('SurahName:', '').trim();
    if (line.startsWith('FromAyah:')) rangeDraft.from = line.replace('FromAyah:', '').trim();
    if (line.startsWith('ToAyah:')) {
      rangeDraft.to = line.replace('ToAyah:', '').trim();
      flushRange();
    }

    if (line.startsWith('Kaifiyat:')) sections[current].kaifiyat = line.replace('Kaifiyat:', '').trim() || '-';
    if (line.startsWith('TajweeditTotal:')) sections[current].taj = line.replace('TajweeditTotal:', '').trim() || '0';
    if (line.startsWith('HifzTotal:')) sections[current].hifz = line.replace('HifzTotal:', '').trim() || '0';
  }

  flushRange();

  return { sections, totalMistakes, overall };
}

export default async function TeacherStudentProgressPage({ params }: Props) {
  const session = await requireAuth([UserRole.TEACHER, UserRole.ADMIN]);
  const { id } = await params;

  if (session.role === UserRole.TEACHER) {
    const access = await getTeacherAccessLevelsByUserId(session.id);
    if (access.STUDENTS === 'NONE' || access.PROGRESS === 'NONE') notFound();
  }

  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true,
      admissionNo: true,
      classId: true,
      class: { select: { id: true, name: true, section: true } },
      user: { select: { fullName: true, isActive: true } },
      attendance: { select: { status: true } }
    }
  });

  if (!student) notFound();

  if (session.role === UserRole.TEACHER) {
    const scope = await getTeacherScope(session.id);
    if (!scope || (student.classId && !scope.classIds.includes(student.classId))) notFound();
  }

  const progressRows = await prisma.studentProgress.findMany({
    where: { studentId: student.id },
    orderBy: { date: 'desc' },
    take: 120
  });

  const ctaHref = `/teacher/progress?studentId=${student.id}${student.class?.id ? `&classId=${student.class.id}` : ''}`;
  const hasProgress = progressRows.length > 0;
  const presentLikeCount = student.attendance.filter(
    (a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'EXCUSED'
  ).length;
  const attendancePct = student.attendance.length ? Math.round((presentLikeCount / student.attendance.length) * 100) : 0;
  const avgMistakes = hasProgress
    ? Math.round(
        progressRows.reduce((sum, row) => sum + (parseProgressNotes(row.notes)?.totalMistakes ?? 0), 0) /
          progressRows.length
      )
    : 0;
  const latestDate = progressRows[0] ? formatDate(progressRows[0].date) : '-';

  return (
    <div className="space-y-4 bg-[#F4F7F8] pb-28">
      <div className="sticky top-2 z-20 rounded-[22px] border border-white/80 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,118,110,0.12)] backdrop-blur-md">
        <PageHeader title="Student Progress" subtitle="View progress history for selected student." />
      </div>

      <Card className="rounded-[24px] border border-white/80 bg-[linear-gradient(150deg,#ffffff,#ecfdf9)] p-4 shadow-[0_14px_30px_rgba(15,118,110,0.1)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#084750] text-white shadow-[0_10px_20px_rgba(8,71,80,0.28)]">
              <UserCircle2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-[#0F172A]">{student.user.fullName}</p>
              <p className="truncate text-sm text-[#64748B]">
                #{student.admissionNo} {student.class ? `· ${student.class.name} - ${student.class.section}` : ''}
              </p>
              <div className="mt-2 inline-flex rounded-full bg-[#E6F4F1] px-2.5 py-1 text-[11px] font-semibold text-[#0F766E]">
                {student.user.isActive ? 'Active Student' : 'Inactive'}
              </div>
            </div>
          </div>
          <Link href={ctaHref} className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#084750] px-3 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(8,71,80,0.28)]">
            <PlusCircle className="h-4 w-4" />
            {hasProgress ? 'Update Progress' : 'Add Progress'}
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-[#D7E3E8] bg-white p-3">
            <p className="text-[11px] text-[#64748B]">Attendance</p>
            <p className="mt-1 text-base font-bold text-[#0F172A]">{attendancePct}%</p>
          </div>
          <div className="rounded-2xl border border-[#D7E3E8] bg-white p-3">
            <p className="text-[11px] text-[#64748B]">Reports</p>
            <p className="mt-1 text-base font-bold text-[#0F172A]">{progressRows.length}</p>
          </div>
          <div className="rounded-2xl border border-[#D7E3E8] bg-white p-3">
            <p className="text-[11px] text-[#64748B]">Avg Mistakes</p>
            <p className="mt-1 text-base font-bold text-[#0F172A]">{avgMistakes}</p>
          </div>
          <div className="rounded-2xl border border-[#D7E3E8] bg-white p-3">
            <p className="text-[11px] text-[#64748B]">Last Update</p>
            <p className="mt-1 text-sm font-bold text-[#0F172A]">{latestDate}</p>
          </div>
        </div>
      </Card>

      {!hasProgress ? (
        <Card className="rounded-[24px] border border-white/80 bg-white p-6 text-center shadow-[0_12px_26px_rgba(15,118,110,0.08)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6F4F1] text-[#0F766E]">
            <CircleAlert className="h-6 w-6" />
          </div>
          <p className="mt-3 text-base font-semibold text-[#0F172A]">No progress added yet</p>
          <p className="mt-1 text-sm text-[#64748B]">Start by creating the first daily progress report for this student.</p>
          <Link href={ctaHref} className="mx-auto mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#084750] px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(8,71,80,0.28)]">
            <PlusCircle className="h-4 w-4" />
            Add Progress
          </Link>
        </Card>
      ) : (
        <div className="relative space-y-4 pl-5">
          <div className="absolute bottom-0 left-2 top-2 w-[2px] rounded-full bg-[#DDEBE9]" />
          {progressRows.map((row) => {
            const parsed = parseProgressNotes(row.notes);
            const sectionOrder: SectionKey[] = ['SABAQ', 'SABQI', 'MANZIL'];

            return (
              <Card key={row.id} className="relative rounded-[22px] border border-[#E2E8F0] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
                <span className="absolute -left-[18px] top-7 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#14B8A6] shadow-[0_0_0_3px_#DDEBE9]" />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F4F1] px-2.5 py-1 text-[11px] font-semibold text-[#0F766E]">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(row.date)}
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-semibold text-[#475569]">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {row.lessonType}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-[#ECFEFF] px-2.5 py-1 text-[11px] font-semibold text-[#0F766E]">Lesson {row.lessonNumber}</span>
                  <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-semibold text-[#475569]">Juzz {row.juzzNumber ?? '-'}</span>
                  <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-semibold text-[#475569]">Ayah {row.ayahFrom ?? '-'}-{row.ayahTo ?? '-'}</span>
                  <span className="rounded-full bg-[#FEF3C7] px-2.5 py-1 text-[11px] font-semibold text-[#92400E]">Mistakes {parsed?.totalMistakes ?? 0}</span>
                </div>

                <div className="mt-3 grid gap-2">
                  {sectionOrder.map((key) => {
                    const sec = parsed?.sections[key];
                    const hasContent =
                      sec &&
                      (sec.ranges.length > 0 || sec.kaifiyat !== '-' || sec.taj !== '0' || sec.hifz !== '0');

                    return (
                      <div key={key} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                        <div className="mb-1.5 flex items-center justify-between">
                          <p className="text-xs font-semibold text-[#0F172A]">{key}</p>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#64748B]">
                            {sec?.kaifiyat ?? '-'}
                          </span>
                        </div>
                        {hasContent ? (
                          <>
                            <p className="text-xs text-[#475569]">{sec?.ranges.length ? sec.ranges.join(' · ') : 'No range'}</p>
                            <p className="mt-1 text-[11px] text-[#64748B]">Tajweed: {sec?.taj ?? '0'} · Hifz: {sec?.hifz ?? '0'}</p>
                          </>
                        ) : (
                          <p className="text-xs text-[#94A3B8]">No entry in this section.</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-xl border border-[#DCEFEA] bg-[#F4FFFC] p-3">
                  <p className="text-[11px] font-semibold text-[#0F766E]">Summary</p>
                  <p className="mt-1 text-sm font-medium text-[#0F172A]">{parsed?.overall ?? 'No summary available.'}</p>
                </div>

                <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#64748B]">
                  <Sparkles className="h-3.5 w-3.5 text-[#14B8A6]" />
                  Structured progress timeline
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Link href={`/teacher/students/${student.id}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#D7E3E8] bg-white px-3 text-sm font-semibold text-[#0F172A]">
        <ChevronLeft className="h-4 w-4 text-[#0F766E]" />
        Back to Student
      </Link>
    </div>
  );
}

