import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import StudentFeesClient from './fees-client';

export const dynamic = 'force-dynamic';

async function getStudentFeesData(studentId: string) {
  const [student, fees] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        admissionNo: true,
        whatsApp: true,
        guardianPhone: true,
        user: { select: { fullName: true, isActive: true } },
        class: { select: { name: true, section: true } }
      }
    }),
    prisma.fee.findMany({
      where: { studentId },
      select: {
        id: true,
        title: true,
        dueDate: true,
        amount: true,
        discount: true,
        status: true,
        payments: {
          select: { id: true, amountPaid: true, method: true, paidAt: true, transactionRef: true }
        }
      },
      orderBy: { dueDate: 'desc' }
    })
  ]);

  if (!student) notFound();
  return { student, fees };
}

export default async function StudentFeesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth([UserRole.ADMIN]);
  const { id } = await params;
  const { student, fees } = await getStudentFeesData(id);

  const serializedFees = fees.map((f) => ({
    id: f.id,
    title: f.title,
    dueDate: f.dueDate instanceof Date ? f.dueDate.toISOString() : f.dueDate,
    amount: typeof f.amount === 'number' ? f.amount : Number(f.amount),
    discount: typeof f.discount === 'number' ? f.discount : Number(f.discount),
    status: f.status,
    payments: f.payments.map((p) => ({
      id: p.id,
      amountPaid: typeof p.amountPaid === 'number' ? p.amountPaid : Number(p.amountPaid),
      method: p.method,
      paidAt: p.paidAt.toISOString(),
      transactionRef: p.transactionRef ?? null
    }))
  }));

  const totalAssigned = serializedFees.reduce(
    (sum, f) => sum + (f.amount - f.discount),
    0
  );

  const totalPaid = serializedFees.reduce(
    (sum, f) => sum + f.payments.reduce((s, p) => s + p.amountPaid, 0),
    0
  );

  const totalRemaining = totalAssigned - totalPaid;

  const totalOverdue = serializedFees.reduce((sum, f) => {
    if (f.status === 'OVERDUE') {
      const netAmount = f.amount - f.discount;
      const paid = f.payments.reduce((s, p) => s + p.amountPaid, 0);
      return sum + Math.max(netAmount - paid, 0);
    }
    return sum;
  }, 0);

  return (
    <StudentFeesClient
      student={student}
      fees={serializedFees}
      totalAssigned={totalAssigned}
      totalPaid={totalPaid}
      totalRemaining={totalRemaining}
      totalOverdue={totalOverdue}
    />
  );
}
