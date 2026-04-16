import { PrismaClient, UserRole } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertUser(email, fullName, role, passwordHash) {
  return prisma.user.upsert({
    where: { email },
    update: { fullName, role, passwordHash, isActive: true },
    create: { email, fullName, role, passwordHash, isActive: true }
  });
}

async function main() {
  const passwordHash = await bcryptjs.hash('Pass@123', 12);

  const admin = await upsertUser('shots_admin@stitchhms.com', 'Shots Admin', UserRole.ADMIN, passwordHash);
  const teacherUser = await upsertUser('shots_teacher@stitchhms.com', 'Shots Teacher', UserRole.TEACHER, passwordHash);
  const studentUser = await upsertUser('shots_student@stitchhms.com', 'Shots Student', UserRole.STUDENT, passwordHash);
  const parentUser = await upsertUser('shots_parent@stitchhms.com', 'Shots Parent', UserRole.PARENT, passwordHash);

  const klass = await prisma.class.upsert({
    where: { name_section_academicYear: { name: 'Grade 9', section: 'S', academicYear: '2026' } },
    update: {},
    create: { name: 'Grade 9', section: 'S', academicYear: '2026', roomNo: 'C-01' }
  });

  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: { employeeCode: 'SHOTS-TCH-001' },
    create: { userId: teacherUser.id, employeeCode: 'SHOTS-TCH-001', qualification: 'M.Ed' }
  });

  await prisma.teacherClass.upsert({
    where: { teacherId_classId: { teacherId: teacher.id, classId: klass.id } },
    update: {},
    create: { teacherId: teacher.id, classId: klass.id, isClassLead: true }
  });

  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: { classId: klass.id, admissionNo: 'SHOTS-ADM-001' },
    create: { userId: studentUser.id, admissionNo: 'SHOTS-ADM-001', classId: klass.id }
  });

  const parent = await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: { relationToChild: 'Guardian' },
    create: { userId: parentUser.id, relationToChild: 'Guardian' }
  });

  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
    update: {},
    create: { parentId: parent.id, studentId: student.id, isPrimary: true }
  });

  await prisma.subject.upsert({
    where: { code: 'SHOTS-SUB-001' },
    update: { classId: klass.id, teacherId: teacher.id },
    create: { code: 'SHOTS-SUB-001', name: 'General Studies', classId: klass.id, teacherId: teacher.id, creditHours: 2 }
  });

  console.log('Screenshot accounts ready');
  console.log('shots_admin@stitchhms.com / Pass@123');
  console.log('shots_teacher@stitchhms.com / Pass@123');
  console.log('shots_student@stitchhms.com / Pass@123');
  console.log('shots_parent@stitchhms.com / Pass@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
