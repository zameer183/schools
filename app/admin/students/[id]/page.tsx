import { notFound } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import StudentProfileClient from './profile-client';

export const dynamic = 'force-dynamic';

type StudentProfilePageProps = { params: Promise<{ id: string }> };

type ViewModel = {
  student: {
    id: string;
    admissionNo: string;
    dateOfBirth: string | null;
    joinDate: string | null;
    currentAddress: string | null;
    emergencyContact: string | null;
    guardianPhone: string | null;
    guardianEmail: string | null;
    fatherName: string | null;
    gender: string | null;
    aadharNo: string | null;
    rollNumber: string | null;
    whatsApp: string | null;
    schoolName: string | null;
    classId: string | null;
    class: { id: string; name: string; section: string } | null;
    user: { id: string; fullName: string; email: string; phone: string | null; isActive: boolean };
  };
  classes: Array<{ id: string; name: string; section: string }>;
  attendance: Array<{ id: string; date: string; status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'; class: { name: string; section: string } }>;
  results: Array<{
    id: string;
    marksObtained: number;
    grade: string;
    remarks: string | null;
    subject: { name: string };
    exam: {
      title: string;
      examDate: string;
      totalMarks: number;
      createdBy: { user: { fullName: string } } | null;
    };
  }>;
  fees: Array<{
    id: string;
    title: string;
    dueDate: string;
    fromDate: string | null;
    toDate: string | null;
    amount: number;
    discount: number;
    status: string;
    payments: { amountPaid: number }[];
  }>;
  collectedFee: number;
  dueFee: number;
  monthlyFee: number | null;
  classTeacher: string | null;
};

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isDatabaseConnectionError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'PrismaClientInitializationError' ||
      error.message.includes("Can't reach database server") ||
      error.message.includes('Timed out fetching a new connection') ||
      error.message.includes('Connection terminated unexpectedly'))
  );
}

function isLocalRestFallbackEnabled() {
  return process.env.FORCE_SUPABASE_REST_DATA_FALLBACK === '1';
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
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase REST ${table} failed with ${response.status}: ${text}`);
  }

  return (await response.json()) as T[];
}

function inFilter(ids: string[]) {
  return `in.(${ids.join(',')})`;
}

async function loadProfileViaRest(id: string): Promise<ViewModel | null> {
  const [student] = await supabaseRest<{
    id: string;
    userId: string;
    admissionNo: string;
    dateOfBirth: string | null;
    joinDate: string | null;
    currentAddress: string | null;
    emergencyContact: string | null;
    guardianPhone: string | null;
    guardianEmail: string | null;
    fatherName: string | null;
    gender: string | null;
    aadharNo: string | null;
    rollNumber: string | null;
    whatsApp: string | null;
    schoolName: string | null;
    classId: string | null;
  }>('Student', {
    select: 'id,userId,admissionNo,dateOfBirth,joinDate,currentAddress,emergencyContact,guardianPhone,guardianEmail,fatherName,gender,aadharNo,rollNumber,whatsApp,schoolName,classId',
    id: `eq.${id}`,
    limit: '1'
  });
  if (!student) return null;

  const [users, classes, attendanceRows, feeRows, resultRows] = await Promise.all([
    supabaseRest<{ id: string; fullName: string; email: string; phone: string | null; isActive: boolean }>('User', {
      select: 'id,fullName,email,phone,isActive',
      id: `eq.${student.userId}`,
      limit: '1'
    }),
    supabaseRest<{ id: string; name: string; section: string }>('Class', {
      select: 'id,name,section',
      order: 'name.asc,section.asc'
    }).catch(() => []),
    supabaseRest<{ id: string; date: string; status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'; classId: string }>('Attendance', {
      select: 'id,date,status,classId',
      studentId: `eq.${student.id}`,
      order: 'date.desc'
    }).catch(() => []),
    supabaseRest<{
      id: string;
      title: string;
      dueDate: string;
      amount: string | number;
      discount: string | number;
      status: string;
      createdAt: string;
      fromDate: string | null;
      toDate: string | null;
    }>('Fee', {
      select: 'id,title,dueDate,amount,discount,status,createdAt,fromDate,toDate,studentId',
      studentId: `eq.${student.id}`,
      order: 'createdAt.desc,dueDate.desc'
    }).catch(() => []),
    supabaseRest<{
      id: string;
      examId: string;
      studentId: string;
      subjectId: string;
      marksObtained: number | string;
      grade: string;
      remarks: string | null;
      createdAt: string;
    }>('Result', {
      select: 'id,examId,studentId,subjectId,marksObtained,grade,remarks,createdAt',
      studentId: `eq.${student.id}`,
      order: 'createdAt.desc'
    }).catch(() => [])
  ]);

  const attendanceClassIds = Array.from(new Set(attendanceRows.map((row) => row.classId).filter(Boolean)));
  const feeIds = Array.from(new Set(feeRows.map((fee) => fee.id)));
  const subjectIds = Array.from(new Set(resultRows.map((row) => row.subjectId).filter(Boolean)));
  const examIds = Array.from(new Set(resultRows.map((row) => row.examId).filter(Boolean)));

  const [attendanceClasses, paymentsRows, subjects, exams] = await Promise.all([
    attendanceClassIds.length
      ? supabaseRest<{ id: string; name: string; section: string }>('Class', {
          select: 'id,name,section',
          id: inFilter(attendanceClassIds)
        }).catch(() => [])
      : Promise.resolve([]),
    feeIds.length
      ? supabaseRest<{ feeId: string; amountPaid: string | number }>('Payment', {
          select: 'feeId,amountPaid',
          feeId: inFilter(feeIds)
        }).catch(() => [])
      : Promise.resolve([]),
    subjectIds.length
      ? supabaseRest<{ id: string; name: string }>('Subject', {
          select: 'id,name',
          id: inFilter(subjectIds)
        }).catch(() => [])
      : Promise.resolve([]),
    examIds.length
      ? supabaseRest<{
          id: string;
          title: string;
          examDate: string;
          totalMarks: number;
          createdById: string;
        }>('Exam', {
          select: 'id,title,examDate,totalMarks,createdById',
          id: inFilter(examIds)
        }).catch(() => [])
      : Promise.resolve([])
  ]);

  const teacherIds = Array.from(new Set(exams.map((exam) => exam.createdById).filter(Boolean)));
  const teachers = teacherIds.length
    ? await supabaseRest<{ id: string; userId: string }>('Teacher', {
        select: 'id,userId',
        id: inFilter(teacherIds)
      }).catch(() => [])
    : [];
  const teacherUsers = teachers.length
    ? await supabaseRest<{ id: string; fullName: string }>('User', {
        select: 'id,fullName',
        id: inFilter(teachers.map((teacher) => teacher.userId).filter(Boolean))
      }).catch(() => [])
    : [];

  const classesById = new Map(classes.map((classItem) => [classItem.id, classItem]));
  const attendanceClassesById = new Map(attendanceClasses.map((classItem) => [classItem.id, classItem]));
  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]));
  const examsById = new Map(exams.map((exam) => [exam.id, exam]));
  const teachersById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const teacherUsersById = new Map(teacherUsers.map((user) => [user.id, user]));
  const paymentsByFeeId = new Map<string, Array<{ amountPaid: string | number }>>();
  for (const payment of paymentsRows) {
    paymentsByFeeId.set(payment.feeId, [...(paymentsByFeeId.get(payment.feeId) ?? []), { amountPaid: payment.amountPaid }]);
  }

  const mappedFees = feeRows.map((fee) => {
    const amount = Number(fee.amount ?? 0);
    const discount = Number(fee.discount ?? 0);
    const paidAmount = (paymentsByFeeId.get(fee.id) ?? []).reduce((sum, payment) => sum + Number(payment.amountPaid), 0);
    const remaining = Math.max(amount - discount - paidAmount, 0);
    return {
      id: fee.id,
      title: fee.title,
      dueDate: fee.dueDate,
      fromDate: fee.fromDate,
      toDate: fee.toDate,
      amount,
      discount,
      status: fee.status,
      payments: (paymentsByFeeId.get(fee.id) ?? []).map((payment) => ({ amountPaid: Number(payment.amountPaid) }))
    };
  });

  const collectedFee = mappedFees.reduce(
    (sum, fee) => sum + fee.payments.reduce((paymentSum, payment) => paymentSum + Number(payment.amountPaid), 0),
    0
  );
  const currentFee = mappedFees[0] ?? null;
  const dueFee = currentFee
    ? Math.max(currentFee.amount - currentFee.discount - currentFee.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0), 0)
    : 0;

  return {
    student: {
      id: student.id,
      admissionNo: student.admissionNo,
      dateOfBirth: toIso(student.dateOfBirth),
      joinDate: toIso(student.joinDate),
      currentAddress: student.currentAddress,
      emergencyContact: student.emergencyContact,
      guardianPhone: student.guardianPhone,
      guardianEmail: student.guardianEmail,
      fatherName: student.fatherName,
      gender: student.gender,
      aadharNo: student.aadharNo,
      rollNumber: student.rollNumber,
      whatsApp: student.whatsApp,
      schoolName: student.schoolName,
      classId: student.classId,
      class: student.classId ? classesById.get(student.classId) ?? null : null,
      user: users[0] ?? { id: student.userId, fullName: 'Unknown Student', email: '', phone: null, isActive: false }
    },
    classes,
    attendance: attendanceRows.map((attendance) => {
      const classItem = attendanceClassesById.get(attendance.classId);
      return {
        id: attendance.id,
        date: attendance.date,
        status: attendance.status,
        class: {
          name: classItem?.name ?? 'Class',
          section: classItem?.section ?? '-'
        }
      };
    }),
    results: resultRows.map((result) => {
      const exam = examsById.get(result.examId);
      const teacher = exam?.createdById ? teachersById.get(exam.createdById) : null;
      const teacherUser = teacher?.userId ? teacherUsersById.get(teacher.userId) : null;
      return {
        id: result.id,
        marksObtained: Number(result.marksObtained ?? 0),
        grade: result.grade,
        remarks: result.remarks,
        subject: { name: subjectsById.get(result.subjectId)?.name ?? 'General' },
        exam: {
          title: exam?.title ?? 'Exam',
          examDate: exam?.examDate ?? result.createdAt,
          totalMarks: Number(exam?.totalMarks ?? 100),
          createdBy: teacherUser ? { user: { fullName: teacherUser.fullName } } : null
        }
      };
    }),
    fees: mappedFees,
    collectedFee,
    dueFee,
    monthlyFee: mappedFees[0] ? mappedFees[0].amount : null,
    classTeacher: null
  };
}

async function loadClassTeacherName(classId: string | null | undefined): Promise<string | null> {
  if (!classId) return null;
  try {
    const lead = await prisma.teacherClass.findFirst({
      where: { classId, isClassLead: true },
      select: { teacher: { select: { user: { select: { fullName: true } } } } }
    });
    if (lead?.teacher?.user?.fullName) return lead.teacher.user.fullName;

    const anyTeacher = await prisma.teacherClass.findFirst({
      where: { classId },
      orderBy: { createdAt: 'asc' },
      select: { teacher: { select: { user: { select: { fullName: true } } } } }
    });
    return anyTeacher?.teacher?.user?.fullName ?? null;
  } catch (error) {
    console.error('[admin/student-profile] class teacher failed', error);
    return null;
  }
}

async function loadProfileViaPrisma(id: string): Promise<ViewModel | null> {
  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true,
      admissionNo: true,
      dateOfBirth: true,
      joinDate: true,
      currentAddress: true,
      emergencyContact: true,
      guardianPhone: true,
      guardianEmail: true,
      fatherName: true,
      gender: true,
      aadharNo: true,
      rollNumber: true,
      whatsApp: true,
      schoolName: true,
      classId: true,
      user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true } },
      class: { select: { id: true, name: true, section: true } }
    }
  });

  if (!student) return null;

  const classesPromise = prisma.class
    .findMany({
      select: { id: true, name: true, section: true },
      orderBy: [{ name: 'asc' }, { section: 'asc' }]
    })
    .catch((error) => {
      console.error('[admin/student-profile] classes failed', error);
      return [];
    });

  const [classes, attendanceRows, resultRows, fees] = await Promise.all([
    classesPromise,
    prisma.attendance
      .findMany({
        where: { studentId: id },
        select: { id: true, date: true, status: true, classId: true },
        orderBy: { date: 'desc' },
        take: 120
      })
      .catch((error) => {
        console.error('[admin/student-profile] attendance failed', error);
        return [];
      }),
    prisma.result
      .findMany({
        where: { studentId: id },
        select: {
          id: true,
          examId: true,
          subjectId: true,
          marksObtained: true,
          grade: true,
          remarks: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
      .catch((error) => {
        console.error('[admin/student-profile] results failed', error);
        return [];
      }),
    prisma.fee
      .findMany({
        where: { studentId: id },
        select: {
          id: true,
          title: true,
          dueDate: true,
          amount: true,
          discount: true,
          status: true,
          createdAt: true,
          fromDate: true,
          toDate: true,
          payments: { select: { amountPaid: true } }
        },
        orderBy: [{ createdAt: 'desc' }, { dueDate: 'desc' }],
        take: 20
      })
      .catch((error) => {
        console.error('[admin/student-profile] fees failed', error);
        return [];
      })
  ]);

  const classesById = new Map(classes.map((classItem) => [classItem.id, classItem]));

  const subjectIds = [...new Set(resultRows.map((row) => row.subjectId).filter(Boolean))];
  const examIds = [...new Set(resultRows.map((row) => row.examId).filter(Boolean))];

  const [subjects, exams] = await Promise.all([
    subjectIds.length
      ? prisma.subject
          .findMany({
            where: { id: { in: subjectIds } },
            select: { id: true, name: true }
          })
          .catch((error) => {
            console.error('[admin/student-profile] subjects failed', error);
            return [];
          })
      : [],
    examIds.length
      ? prisma.exam
          .findMany({
            where: { id: { in: examIds } },
            select: { id: true, title: true, examDate: true, totalMarks: true, createdById: true }
          })
          .catch((error) => {
            console.error('[admin/student-profile] exams failed', error);
            return [];
          })
      : []
  ]);

  const teacherIds = [...new Set(exams.map((exam) => exam.createdById).filter(Boolean))];
  const teachers = teacherIds.length
    ? await prisma.teacher
        .findMany({
          where: { id: { in: teacherIds } },
          select: { id: true, user: { select: { id: true, fullName: true } } }
        })
        .catch((error) => {
          console.error('[admin/student-profile] teachers failed', error);
          return [];
        })
    : [];

  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]));
  const examsById = new Map(exams.map((exam) => [exam.id, exam]));
  const teachersById = new Map(teachers.map((teacher) => [teacher.id, teacher]));

  const collectedFee = fees.reduce(
    (sum, fee) => sum + fee.payments.reduce((paymentSum, payment) => paymentSum + Number(payment.amountPaid), 0),
    0
  );
  const currentFee = fees[0] ?? null;
  const dueFee = currentFee
    ? Math.max(
        Number(currentFee.amount) -
          Number(currentFee.discount) -
          currentFee.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0),
        0
      )
    : 0;

  const classTeacher = await loadClassTeacherName(student.classId);

  return {
    student: {
      ...student,
      dateOfBirth: toIso(student.dateOfBirth),
      joinDate: toIso(student.joinDate)
    },
    classes,
    attendance: attendanceRows.map((attendance) => {
      const classItem = classesById.get(attendance.classId);
      return {
        id: attendance.id,
        date: attendance.date.toISOString(),
        status: attendance.status,
        class: {
          name: classItem?.name ?? 'Class',
          section: classItem?.section ?? '-'
        }
      };
    }),
    results: resultRows.map((result) => {
      const exam = examsById.get(result.examId);
      const teacher = exam?.createdById ? teachersById.get(exam.createdById) : null;
      return {
        id: result.id,
        marksObtained: Number(result.marksObtained),
        grade: result.grade,
        remarks: result.remarks,
        subject: { name: subjectsById.get(result.subjectId)?.name ?? 'General' },
        exam: {
          title: exam?.title ?? 'Exam',
          examDate: (exam?.examDate ?? result.createdAt).toISOString(),
          totalMarks: exam?.totalMarks ?? 100,
          createdBy: teacher ? { user: { fullName: teacher.user.fullName } } : null
        }
      };
    }),
    fees: fees.map((fee) => ({
      id: fee.id,
      title: fee.title,
      dueDate: fee.dueDate.toISOString(),
      fromDate: toIso(fee.fromDate),
      toDate: toIso(fee.toDate),
      amount: Number(fee.amount),
      discount: Number(fee.discount),
      status: fee.status,
      payments: fee.payments.map((payment) => ({ amountPaid: Number(payment.amountPaid) }))
    })),
    collectedFee,
    dueFee,
    monthlyFee: currentFee ? Number(currentFee.amount) : null,
    classTeacher
  };
}

function renderProfile(data: ViewModel) {
  return (
    <StudentProfileClient
      student={data.student}
      classes={data.classes}
      attendance={data.attendance}
      results={data.results}
      fees={data.fees}
      collectedFee={data.collectedFee}
      dueFee={data.dueFee}
      monthlyFee={data.monthlyFee}
      classTeacher={data.classTeacher}
    />
  );
}

function DatabaseFallback() {
  return (
    <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
      <h2 className="font-headline text-xl font-bold text-[#111827]">Database Unreachable</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#64748b]">
        Cannot load this student profile right now. Please refresh once after the database connection recovers.
      </p>
    </div>
  );
}

export default async function StudentProfilePage({ params }: StudentProfilePageProps) {
  await requireAuth([UserRole.ADMIN]);
  const { id } = await params;

  try {
    const data = await loadProfileViaPrisma(id);
    if (!data) notFound();
    return renderProfile(data);
  } catch (error) {
    console.error('[admin/student-profile] prisma load failed', error);

    try {
      const restData = await loadProfileViaRest(id);
      if (!restData) notFound();
      return renderProfile(restData);
    } catch (restError) {
      console.error('[admin/student-profile][rest-fallback] fatal', restError);
      return <DatabaseFallback />;
    }
  }
}
