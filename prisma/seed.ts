import { PrismaClient, AssignmentStatus, AttendanceStatus, NotificationType, PaymentStatus, SubmissionStatus, TransactionType, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.messageRecipient.deleteMany();
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.fileAsset.deleteMany();
  await prisma.assignmentSubmission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.result.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.fee.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.teacherClass.deleteMany();
  await prisma.parentStudent.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await hash('Pass@123', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@stitchhms.com',
      fullName: 'System Admin',
      role: UserRole.ADMIN,
      passwordHash: defaultPassword
    }
  });

  const teacherUser = await prisma.user.create({
    data: {
      email: 'teacher@stitchhms.com',
      fullName: 'Amina Rao',
      role: UserRole.TEACHER,
      passwordHash: defaultPassword
    }
  });

  const studentUser = await prisma.user.create({
    data: {
      email: 'student@stitchhms.com',
      fullName: 'Ali Khan',
      role: UserRole.STUDENT,
      passwordHash: defaultPassword
    }
  });

  const parentUser = await prisma.user.create({
    data: {
      email: 'parent@stitchhms.com',
      fullName: 'Sara Khan',
      role: UserRole.PARENT,
      passwordHash: defaultPassword
    }
  });

  const class10A = await prisma.class.create({
    data: {
      name: 'Grade 10',
      section: 'A',
      roomNo: 'B-12',
      academicYear: '2026'
    }
  });

  const teacher = await prisma.teacher.create({
    data: {
      userId: teacherUser.id,
      employeeCode: 'TCH-001',
      qualification: 'MSc Mathematics',
      specialization: 'Math'
    }
  });

  await prisma.teacherClass.create({
    data: {
      teacherId: teacher.id,
      classId: class10A.id,
      isClassLead: true
    }
  });

  const student = await prisma.student.create({
    data: {
      userId: studentUser.id,
      admissionNo: 'ADM-2026-0001',
      classId: class10A.id
    }
  });

  const parent = await prisma.parent.create({
    data: {
      userId: parentUser.id,
      relationToChild: 'Mother'
    }
  });

  await prisma.parentStudent.create({
    data: {
      parentId: parent.id,
      studentId: student.id,
      isPrimary: true
    }
  });

  const math = await prisma.subject.create({
    data: {
      name: 'Mathematics',
      code: 'MATH-10-A',
      classId: class10A.id,
      teacherId: teacher.id,
      creditHours: 4
    }
  });

  await prisma.attendance.createMany({
    data: [
      {
        studentId: student.id,
        classId: class10A.id,
        markedById: teacher.id,
        date: new Date('2026-04-10'),
        status: AttendanceStatus.PRESENT
      },
      {
        studentId: student.id,
        classId: class10A.id,
        markedById: teacher.id,
        date: new Date('2026-04-11'),
        status: AttendanceStatus.LATE
      }
    ]
  });

  const exam = await prisma.exam.create({
    data: {
      title: 'Mid Term Mathematics',
      classId: class10A.id,
      subjectId: math.id,
      createdById: teacher.id,
      examDate: new Date('2026-04-20'),
      totalMarks: 100,
      passingMarks: 40
    }
  });

  await prisma.result.create({
    data: {
      examId: exam.id,
      studentId: student.id,
      subjectId: math.id,
      marksObtained: 86,
      grade: 'A',
      remarks: 'Excellent performance'
    }
  });

  const fee = await prisma.fee.create({
    data: {
      studentId: student.id,
      title: 'April Tuition Fee',
      dueDate: new Date('2026-04-25'),
      amount: 250,
      status: PaymentStatus.PARTIAL
    }
  });

  await prisma.payment.create({
    data: {
      feeId: fee.id,
      parentId: parent.id,
      amountPaid: 100,
      method: TransactionType.ONLINE,
      transactionRef: 'TRX-10001'
    }
  });

  const assignment = await prisma.assignment.create({
    data: {
      title: 'Quadratic Equations Worksheet',
      description: 'Solve all textbook exercises from chapter 6',
      classId: class10A.id,
      subjectId: math.id,
      teacherId: teacher.id,
      status: AssignmentStatus.PUBLISHED,
      dueDate: new Date('2026-04-22'),
      maxMarks: 20
    }
  });

  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: assignment.id,
      studentId: student.id,
      content: 'Submitted with solved PDF',
      status: SubmissionStatus.SUBMITTED
    }
  });

  const message = await prisma.message.create({
    data: {
      senderId: admin.id,
      subject: 'Fee Reminder',
      body: 'Please clear pending balance before due date.'
    }
  });

  await prisma.messageRecipient.create({
    data: {
      messageId: message.id,
      userId: parentUser.id
    }
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: studentUser.id,
        title: 'New Assignment Published',
        body: 'Quadratic Equations Worksheet has been added.',
        type: NotificationType.ACADEMIC
      },
      {
        userId: parentUser.id,
        title: 'Fee Partially Paid',
        body: 'A payment of $100 was recorded for April tuition.',
        type: NotificationType.FINANCIAL
      }
    ]
  });

  console.log('Seed complete.');
  console.log('Admin login: admin@stitchhms.com / Pass@123');
  console.log('Teacher login: teacher@stitchhms.com / Pass@123');
  console.log('Student login: student@stitchhms.com / Pass@123');
  console.log('Parent login: parent@stitchhms.com / Pass@123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
