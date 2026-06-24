import { type Prisma, UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTeacherAccessMapByUserId } from '@/lib/teacher-access';
import { TeacherExamManagerClient } from './teacher-exam-manager-client';
import { TeacherResultsEntryClient } from './teacher-results-entry-client';
import { BookOpenCheck, ClipboardPlus } from 'lucide-react';

export const dynamic = 'force-dynamic';

type TeacherWithAcademics = Prisma.TeacherGetPayload<{
  include: {
    exams: {
      include: {
        subject: { select: { id: true; name: true } };
        class: { select: { id: true; name: true; section: true } };
        results: {
          include: {
            student: {
              include: { user: { select: { fullName: true } } };
            };
          };
        };
      };
    };
    classAssignments: {
      include: {
        class: {
          include: {
            subjects: {
              select: { id: true; name: true; classId: true; teacherId: true };
            };
            students: {
              include: { user: { select: { fullName: true } } };
            };
          };
        };
      };
    };
  };
}> | null;

type RestTeacher = {
  id: string;
  userId: string;
};

type RestTeacherClass = {
  teacherId: string;
  classId: string;
};

type RestClass = {
  id: string;
  name: string;
  section: string;
};

type RestSubject = {
  id: string;
  name: string;
  classId: string;
  teacherId: string | null;
};

type RestStudent = {
  id: string;
  userId: string;
  admissionNo: string;
  classId: string | null;
};

type RestUser = {
  id: string;
  fullName: string;
};

type RestExam = {
  id: string;
  title: string;
  classId: string;
  subjectId: string;
  examDate: string;
  totalMarks: number;
  passingMarks: number;
};

type RestResult = {
  id: string;
  examId: string;
  studentId: string;
  marksObtained: number | string;
  remarks: string | null;
};

const FULL_TEACHER_ACADEMICS_ACCESS: Awaited<ReturnType<typeof getTeacherAccessMapByUserId>> = {
  ACADEMICS: true,
  STUDENTS: true,
  ATTENDANCE: true,
  STAFF_ATTENDANCE: true,
  ASSIGNMENTS: true,
  PROGRESS: true,
  MESSAGES: true,
  EXAMS: true,
  FEES: true
};

function isLocalRestFallbackEnabled() {
  return process.env.FORCE_SUPABASE_REST_DATA_FALLBACK === '1';
}

function isDatabaseConnectionError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'PrismaClientInitializationError' ||
      error.message.includes("Can't reach database server") ||
      error.message.includes('Timed out fetching a new connection'))
  );
}

async function supabaseRest<T>(table: string, params: Record<string, string>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase REST fallback is not configured');
  }

  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Supabase REST ${table} failed with ${response.status}`);
  }

  return (await response.json()) as T[];
}

function inFilter(ids: string[]) {
  return `in.(${ids.join(',')})`;
}

async function getTeacherAcademicsViaSupabaseRest(userId: string): Promise<TeacherWithAcademics> {
  const [teacher] = await supabaseRest<RestTeacher>('Teacher', {
    select: 'id,userId',
    userId: `eq.${userId}`,
    limit: '1'
  });
  if (!teacher) return null;

  const [classLinks, teacherSubjects, exams] = await Promise.all([
    supabaseRest<RestTeacherClass>('TeacherClass', {
      select: 'teacherId,classId',
      teacherId: `eq.${teacher.id}`
    }),
    supabaseRest<RestSubject>('Subject', {
      select: 'id,name,classId,teacherId',
      teacherId: `eq.${teacher.id}`,
      order: 'name.asc'
    }),
    supabaseRest<RestExam>('Exam', {
      select: 'id,title,classId,subjectId,examDate,totalMarks,passingMarks',
      createdById: `eq.${teacher.id}`,
      order: 'examDate.desc'
    })
  ]);

  const assignedClassIds = Array.from(new Set(classLinks.map((link) => link.classId).filter(Boolean)));
  const examClassIds = exams.map((exam) => exam.classId).filter(Boolean);
  const subjectClassIds = teacherSubjects.map((subject) => subject.classId).filter(Boolean);
  const allClassIds = Array.from(new Set([...assignedClassIds, ...examClassIds, ...subjectClassIds]));
  const examSubjectIds = Array.from(new Set(exams.map((exam) => exam.subjectId).filter(Boolean)));

  const [classes, students, examSubjects, results] = await Promise.all([
    allClassIds.length
      ? supabaseRest<RestClass>('Class', {
          select: 'id,name,section',
          id: inFilter(allClassIds)
        })
      : Promise.resolve([]),
    assignedClassIds.length
      ? supabaseRest<RestStudent>('Student', {
          select: 'id,userId,admissionNo,classId',
          classId: inFilter(assignedClassIds)
        })
      : Promise.resolve([]),
    examSubjectIds.length
      ? supabaseRest<RestSubject>('Subject', {
          select: 'id,name,classId,teacherId',
          id: inFilter(examSubjectIds)
        })
      : Promise.resolve([]),
    exams.length
      ? supabaseRest<RestResult>('Result', {
          select: 'id,examId,studentId,marksObtained,remarks',
          examId: inFilter(exams.map((exam) => exam.id))
        })
      : Promise.resolve([])
  ]);

  const studentUserIds = Array.from(new Set(students.map((student) => student.userId).filter(Boolean)));
  const users = studentUserIds.length
    ? await supabaseRest<RestUser>('User', {
        select: 'id,fullName',
        id: inFilter(studentUserIds)
      })
    : [];

  const classById = new Map(classes.map((item) => [item.id, item]));
  const userById = new Map(users.map((user) => [user.id, user]));
  const subjectById = new Map([...teacherSubjects, ...examSubjects].map((subject) => [subject.id, subject]));
  const subjectsByClassId = new Map<string, RestSubject[]>();
  for (const subject of teacherSubjects) {
    subjectsByClassId.set(subject.classId, [...(subjectsByClassId.get(subject.classId) ?? []), subject]);
  }
  const studentsByClassId = new Map<string, RestStudent[]>();
  for (const student of students) {
    if (!student.classId) continue;
    studentsByClassId.set(student.classId, [...(studentsByClassId.get(student.classId) ?? []), student]);
  }
  const resultsByExamId = new Map<string, RestResult[]>();
  for (const result of results) {
    resultsByExamId.set(result.examId, [...(resultsByExamId.get(result.examId) ?? []), result]);
  }

  return {
    ...teacher,
    exams: exams.map((exam) => {
      const subject = subjectById.get(exam.subjectId);
      const cls = classById.get(exam.classId);
      return {
        ...exam,
        examDate: new Date(exam.examDate),
        subject: subject ? { id: subject.id, name: subject.name } : null,
        class: cls ? { id: cls.id, name: cls.name, section: cls.section } : null,
        results: (resultsByExamId.get(exam.id) ?? []).map((result) => {
          const student = students.find((item) => item.id === result.studentId);
          return {
            ...result,
            marksObtained: Number(result.marksObtained),
            student: {
              ...(student ?? { id: result.studentId, userId: '', admissionNo: '', classId: null }),
              user: { fullName: student ? userById.get(student.userId)?.fullName ?? 'Unknown Student' : 'Unknown Student' }
            }
          };
        })
      };
    }),
    classAssignments: classLinks.map((link) => {
      const cls = classById.get(link.classId);
      return {
        ...link,
        class: {
          ...(cls ?? { id: link.classId, name: 'Unknown Class', section: '' }),
          subjects: (subjectsByClassId.get(link.classId) ?? []).map((subject) => ({
            id: subject.id,
            name: subject.name,
            classId: subject.classId,
            teacherId: subject.teacherId
          })),
          students: (studentsByClassId.get(link.classId) ?? []).map((student) => ({
            ...student,
            user: { fullName: userById.get(student.userId)?.fullName ?? 'Unknown Student' }
          }))
        }
      };
    })
  } as TeacherWithAcademics;
}

function parseExamTitle(raw: string) {
  const value = raw.trim();
  const match = value.match(/^\[(.+?)\]\s*(.*)$/);
  if (!match) return { examType: 'Custom', title: value };
  return { examType: match[1].trim(), title: (match[2] ?? '').trim() || value };
}

export default async function TeacherAcademicsPage() {
  const session = await requireAuth([UserRole.TEACHER]);
  let access: Awaited<ReturnType<typeof getTeacherAccessMapByUserId>> | null = null;
  let teacher: TeacherWithAcademics = null;
  try {
    if (isLocalRestFallbackEnabled()) {
      access = FULL_TEACHER_ACADEMICS_ACCESS;
      teacher = await getTeacherAcademicsViaSupabaseRest(session.id);
    } else {
      [access, teacher] = await Promise.all([
        getTeacherAccessMapByUserId(session.id),
        prisma.teacher.findUnique({
          where: { userId: session.id },
          include: {
              exams: {
                include: {
                  subject: { select: { id: true, name: true } },
                  class: { select: { id: true, name: true, section: true } },
                  results: {
                    include: {
                      student: {
                      include: { user: { select: { fullName: true } } }
                    }
                  }
                }
              },
              orderBy: { examDate: 'desc' }
            },
            classAssignments: {
              include: {
                class: {
                  include: {
                    subjects: {
                      select: { id: true, name: true, classId: true, teacherId: true }
                    },
                    students: {
                      include: { user: { select: { fullName: true } } }
                    }
                  }
                }
              }
            }
          }
        })
      ]);
    }
  } catch (error) {
    console.error('[teacher/academics][load]', error);
    if (isDatabaseConnectionError(error)) {
      try {
        access = FULL_TEACHER_ACADEMICS_ACCESS;
        teacher = await getTeacherAcademicsViaSupabaseRest(session.id);
      } catch (fallbackError) {
        console.error('[teacher/academics][rest-fallback]', fallbackError);
      }
    }
  }
  if (access && (!access.ACADEMICS || !access.EXAMS)) {
    return (
      <div className="rounded-2xl bg-white shadow-[0_12px_40px_rgba(43,103,110,0.06)] p-8">
        <h2 className="font-headline text-3xl font-bold text-[#1a1c1c]">Academics Access Disabled</h2>
        <p className="mt-2 text-sm text-[#6f7979]">Admin has disabled your academics module access.</p>
      </div>
    );
  }

  const exams = (teacher?.exams ?? []).map((exam) => ({
    ...exam,
    examDate: exam.examDate instanceof Date ? exam.examDate : new Date(exam.examDate)
  })).filter((exam) => exam.subject && exam.class);

  const allStudents = teacher?.classAssignments.flatMap((ca) =>
    ca.class.students.map((s) => ({
      id: s.id,
      admissionNo: s.admissionNo,
      fullName: s.user.fullName,
      className: `${ca.class.name} - ${ca.class.section}`
    }))
  ) ?? [];
  const uniqueStudents = Array.from(new Map(allStudents.map((s) => [s.id, s])).values());

  const examClasses = (teacher?.classAssignments ?? []).map((item) => ({
    id: item.class.id,
    name: item.class.name,
    section: item.class.section
  }));


  const examCards = exams.map((exam) => {
    const parsed = parseExamTitle(exam.title);
    return {
      id: exam.id,
      title: parsed.title,
      examType: parsed.examType,
      examDateLabel: exam.examDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      subjectId: exam.subject?.id ?? '',
      subjectName: exam.subject?.name ?? 'Unknown Subject',
      classLabel: `${exam.class?.name ?? 'Unknown Class'} ${exam.class?.section ?? ''}`.trim(),
      classId: exam.class?.id ?? '',
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      examDateRaw: exam.examDate.toISOString().slice(0, 10),
      results: exam.results.map((result) => ({
        studentId: result.studentId,
        marksObtained: Number(result.marksObtained),
        remarks: result.remarks ?? null
      }))
    };
  });

  return (
    <div className="space-y-5 bg-[#F7F9FB] pb-28">
      <section className="rounded-[22px] bg-[#084750] p-5 text-white shadow-[0_16px_30px_rgba(8,71,80,0.22)]">
        <div className="flex items-center gap-4">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-white">
            <BookOpenCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold leading-tight text-white">Teacher Academics</h2>
            <p className="mt-1 text-sm leading-snug text-[#D5FFF8]">Manage exams, publish marks, and track class performance.</p>
          </div>
        </div>
      </section>

      <TeacherExamManagerClient classes={examClasses} />

      {exams.length === 0 ? (
        <div className="rounded-lg border border-[#E6E8EA] bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_6px_rgba(15,23,42,0.05)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[#E6F4F1]">
            <svg className="h-7 w-7 text-[#084750]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-[#191C1E]">No exams created yet</p>
          <p className="mt-1 text-sm text-[#40474F]">Create your first test for marks entry.</p>
          <button
            type="button"
            className="mx-auto mt-5 inline-flex items-center gap-2 rounded-lg bg-[#084750] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(8,71,80,0.22)]"
          >
            <ClipboardPlus className="h-4 w-4" />
            Create Exam
          </button>
        </div>
      ) : (
        <TeacherResultsEntryClient
          exams={examCards}
          students={uniqueStudents.map((student) => ({
            id: student.id,
            admissionNo: student.admissionNo,
            fullName: student.fullName
          }))}
        />
      )}
    </div>
  );
}
