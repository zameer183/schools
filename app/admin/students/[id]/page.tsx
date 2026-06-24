import { notFound } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import StudentProfileClient from './profile-client';

export const dynamic = 'force-dynamic';

type StudentProfilePageProps = { params: Promise<{ id: string }> };

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
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

    if (!student) notFound();

    const classes = await prisma.class
      .findMany({
        select: { id: true, name: true, section: true },
        orderBy: [{ name: 'asc' }, { section: 'asc' }]
      })
      .catch((error) => {
        console.error('[admin/student-profile] classes failed', error);
        return [];
      });

    const classesById = new Map(classes.map((classItem) => [classItem.id, classItem]));

    const [attendanceRows, resultRows, fees] = await Promise.all([
      prisma.attendance
        .findMany({
          where: { studentId: id },
          select: { id: true, date: true, status: true, classId: true },
          orderBy: { date: 'desc' }
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
            select: { id: true, user: { select: { fullName: true } } }
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

    return (
      <StudentProfileClient
        student={{
          ...student,
          dateOfBirth: toIso(student.dateOfBirth),
          joinDate: toIso(student.joinDate)
        }}
        classes={classes}
        attendance={attendanceRows.map((attendance) => {
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
        })}
        results={resultRows.map((result) => {
          const exam = examsById.get(result.examId);
          const teacher = exam?.createdById ? teachersById.get(exam.createdById) : null;
          return {
            id: result.id,
            marksObtained: result.marksObtained,
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
        })}
        fees={fees.map((fee) => ({
          id: fee.id,
          title: fee.title,
          dueDate: fee.dueDate.toISOString(),
          fromDate: toIso(fee.fromDate),
          toDate: toIso(fee.toDate),
          amount: Number(fee.amount),
          discount: Number(fee.discount),
          status: fee.status,
          payments: fee.payments.map((payment) => ({ amountPaid: Number(payment.amountPaid) }))
        }))}
        collectedFee={collectedFee}
        dueFee={dueFee}
      />
    );
  } catch (error) {
    console.error('[admin/student-profile] fatal', error);
    return <DatabaseFallback />;
  }
}
