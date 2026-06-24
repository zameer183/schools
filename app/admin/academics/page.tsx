import { Prisma, UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminAcademicsPageClient from './page.client';

export const dynamic = 'force-dynamic';
type ClassRow = Prisma.ClassGetPayload<{ include: { _count: { select: { students: true; subjects: true } } } }>;
type SubjectRow = Prisma.SubjectGetPayload<{ include: { class: true; teacher: { include: { user: true } } } }>;
type TeacherRow = Prisma.TeacherGetPayload<{ select: { id: true; user: { select: { fullName: true } } } }>;
type ExamRow = Prisma.ExamGetPayload<{ include: { class: true; subject: true; createdBy: { include: { user: true } }; _count: { select: { results: true } } } }>;
type StudentRow = Prisma.StudentGetPayload<{ include: { user: { select: { fullName: true } } } }>;

const getCachedAcademicsData = unstable_cache(
  async () => {
    try {
      const [classes, subjects, teachers, exams, students] = await Promise.all([
        prisma.class.findMany({
          include: { _count: { select: { students: true, subjects: true } } },
          orderBy: [{ name: 'asc' }, { section: 'asc' }]
        }),
        prisma.subject.findMany({
          include: { class: true, teacher: { include: { user: true } } },
          orderBy: { name: 'asc' }
        }),
        prisma.teacher.findMany({
          select: { id: true, user: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.exam.findMany({
          include: { class: true, subject: true, createdBy: { include: { user: true } }, _count: { select: { results: true } } },
          orderBy: { examDate: 'desc' }
        }),
        prisma.student.findMany({
          include: { user: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      return { classes, subjects, teachers, exams, students };
    } catch (error) {
      console.error('[admin/academics] failed to load academics data', error);
      return {
        classes: [] as ClassRow[],
        subjects: [] as SubjectRow[],
        teachers: [] as TeacherRow[],
        exams: [] as ExamRow[],
        students: [] as StudentRow[]
      };
    }
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
  const { classes, subjects, teachers, exams, students } = await getCachedAcademicsData();

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
      initialStudents={students.map((s) => ({
        id: s.id,
        classId: s.classId,
        admissionNo: s.admissionNo,
        fullName: s.user.fullName
      }))}
    />
  );
}
