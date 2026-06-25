import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminAcademicsPageClient from './page.client';

export const dynamic = 'force-dynamic';
function isDatabaseConnectionError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'PrismaClientInitializationError' ||
      error.message.includes("Can't reach database server") ||
      error.message.includes('Timed out fetching a new connection') ||
      error.message.includes('Connection terminated unexpectedly'))
  );
}

const getCachedAcademicsData = unstable_cache(
  async () => {
    const [classes, subjects, teachers, exams] = await prisma.$transaction([
      prisma.class.findMany({
        select: {
          id: true,
          name: true,
          section: true,
          roomNo: true,
          academicYear: true,
          _count: { select: { students: true, subjects: true } }
        },
        orderBy: [{ name: 'asc' }, { section: 'asc' }]
      }),
      prisma.subject.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          classId: true,
          class: { select: { name: true, section: true } },
          teacher: { select: { user: { select: { fullName: true } } } }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.teacher.findMany({
        select: { id: true, user: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.exam.findMany({
        select: {
          id: true,
          title: true,
          examDate: true,
          totalMarks: true,
          passingMarks: true,
          classId: true,
          subjectId: true,
          createdById: true,
          class: { select: { name: true, section: true } },
          subject: { select: { name: true } },
          createdBy: { select: { user: { select: { fullName: true } } } },
          _count: { select: { results: true } }
        },
        orderBy: { examDate: 'desc' }
      })
    ]);

    return { classes, subjects, teachers, exams };
  },
  ['admin-academics-page-data'],
  { revalidate: 30 }
);

function parseExamTitle(rawTitle: unknown) {
  const value = typeof rawTitle === 'string' ? rawTitle.trim() : '';
  if (!value) return { title: 'Untitled Exam', examType: 'Custom' };
  const match = value.match(/^\[(.+?)\]\s*(.*)$/);
  if (!match) {
    return { title: value, examType: 'Custom' };
  }
  return { examType: match[1].trim(), title: (match[2] ?? '').trim() || value };
}

function safeToIso(input: unknown) {
  if (input instanceof Date && !Number.isNaN(input.getTime())) return input.toISOString();
  if (typeof input === 'string') {
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

export default async function AdminAcademicsPage() {
  await requireAuth([UserRole.ADMIN]);
  let data: Awaited<ReturnType<typeof getCachedAcademicsData>> | null = null;
  try {
    data = await getCachedAcademicsData();
  } catch (error) {
    console.error('[admin/academics] load failed', error);
    if (!isDatabaseConnectionError(error)) throw error;
  }

  if (!data) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
        <h1 className="font-headline text-2xl font-bold text-[#1a1c1c]">Academics</h1>
        <h2 className="mt-3 text-lg font-bold text-[#111827]">Database Unreachable</h2>
        <p className="mt-2 text-sm text-[#6b7280]">
          Academics data is temporarily unavailable. Please refresh once the database connection recovers.
        </p>
      </div>
    );
  }

  const { classes, subjects, teachers, exams } = data;

  const normalizedExams = exams.map((exam) => {
    const parsed = parseExamTitle(exam.title);
    const examDateIso = safeToIso(exam.examDate);
    return {
      ...exam,
      title: parsed.title,
      examType: parsed.examType,
      examDate: examDateIso,
      dueDate: examDateIso,
      teacherName: exam.createdBy?.user?.fullName ?? '-',
      resultsCount: exam._count.results
    };
  });

  return (
    <AdminAcademicsPageClient
      initialClasses={classes}
      initialSubjects={subjects}
      initialTeachers={teachers}
      initialExams={normalizedExams}
    />
  );
}
