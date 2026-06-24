import { notFound } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import StudentProfileClient from './profile-client';

export const dynamic = 'force-dynamic';

type StudentProfilePageProps = { params: Promise<{ id: string }> };

export default async function StudentProfilePage({ params }: StudentProfilePageProps) {
  await requireAuth([UserRole.ADMIN]);
  const { id } = await params;

  const [student, classes, attendance, results, fees] = await Promise.all([
    prisma.student.findUnique({
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
    }),
    prisma.class.findMany({
      select: { id: true, name: true, section: true },
      orderBy: [{ name: 'asc' }, { section: 'asc' }]
    }),
    prisma.attendance.findMany({
      where: { studentId: id },
      select: {
        id: true,
        date: true,
        status: true,
        class: { select: { name: true, section: true } }
      },
      orderBy: { date: 'desc' }
    }),
    prisma.result.findMany({
      where: { studentId: id },
      select: {
        id: true,
        marksObtained: true,
        grade: true,
        remarks: true,
        subject: { select: { name: true } },
        exam: {
          select: {
            title: true,
            examDate: true,
            totalMarks: true,
            createdBy: { select: { user: { select: { fullName: true } } } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    prisma.fee.findMany({
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
  ]);

  if (!student) notFound();

  const collectedFee = fees.reduce(
    (s, f) => s + f.payments.reduce((a, p) => a + Number(p.amountPaid), 0),
    0
  );
  const currentFee = fees[0] ?? null;
  const dueFee = currentFee
    ? Math.max(
        Number(currentFee.amount) -
          Number(currentFee.discount) -
          currentFee.payments.reduce((a, p) => a + Number(p.amountPaid), 0),
        0
      )
    : 0;

  return (
    <StudentProfileClient
      student={{
        ...student,
        dateOfBirth: student.dateOfBirth?.toISOString() ?? null,
        joinDate: student.joinDate?.toISOString() ?? null
      }}
      classes={classes}
      attendance={attendance.map((a) => ({ ...a, date: a.date.toISOString() }))}
      results={results.map((r) => ({
        ...r,
        exam: { ...r.exam, examDate: r.exam.examDate.toISOString() }
      }))}
      fees={fees.map((f) => ({
        ...f,
        dueDate: f.dueDate.toISOString(),
        fromDate: f.fromDate?.toISOString() ?? null,
        toDate: f.toDate?.toISOString() ?? null,
        amount: Number(f.amount),
        discount: Number(f.discount),
        payments: f.payments.map((p) => ({ amountPaid: Number(p.amountPaid) }))
      }))}
      collectedFee={collectedFee}
      dueFee={dueFee}
    />
  );
}
