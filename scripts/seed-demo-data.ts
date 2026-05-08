import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const classSeed = [
  { name: 'Grade 1', section: 'A', roomNo: 'R-101', academicYear: '2026' },
  { name: 'Grade 2', section: 'A', roomNo: 'R-102', academicYear: '2026' },
  { name: 'Grade 3', section: 'A', roomNo: 'R-103', academicYear: '2026' },
  { name: 'Grade 4', section: 'A', roomNo: 'R-104', academicYear: '2026' },
  { name: 'Grade 5', section: 'A', roomNo: 'R-105', academicYear: '2026' }
];

const teacherSeed = [
  { fullName: 'Amina Rao', email: 'teacher1@stitchhms.com', employeeCode: 'TCH-101', position: 'Senior Lecturer', department: 'Academics' },
  { fullName: 'Zameer Ahmed', email: 'teacher2@stitchhms.com', employeeCode: 'TCH-102', position: 'Lecturer', department: 'Registrar Office' },
  { fullName: 'Shots Teacher', email: 'teacher3@stitchhms.com', employeeCode: 'TCH-103', position: 'Assistant Lecturer', department: 'Academics' },
  { fullName: 'Sara Khan', email: 'teacher4@stitchhms.com', employeeCode: 'TCH-104', position: 'Coordinator', department: 'Administration' }
];

const studentSeed = [
  { fullName: 'Ali Khan', email: 'student1@stitchhms.com', admissionNo: 'ADM-2026-1001' },
  { fullName: 'Rahma Lone', email: 'student2@stitchhms.com', admissionNo: 'ADM-2026-1002' },
  { fullName: 'Sadia Jameel', email: 'student3@stitchhms.com', admissionNo: 'ADM-2026-1003' },
  { fullName: 'Sameera Abdul Rasheed', email: 'student4@stitchhms.com', admissionNo: 'ADM-2026-1004' },
  { fullName: 'Iqra Hanif', email: 'student5@stitchhms.com', admissionNo: 'ADM-2026-1005' },
  { fullName: 'MaliKha Muzammil', email: 'student6@stitchhms.com', admissionNo: 'ADM-2026-1006' },
  { fullName: 'Umar Farooq', email: 'student7@stitchhms.com', admissionNo: 'ADM-2026-1007' },
  { fullName: 'Noor Fatima', email: 'student8@stitchhms.com', admissionNo: 'ADM-2026-1008' },
  { fullName: 'Hassan Raza', email: 'student9@stitchhms.com', admissionNo: 'ADM-2026-1009' },
  { fullName: 'Areeba Noor', email: 'student10@stitchhms.com', admissionNo: 'ADM-2026-1010' }
];

async function upsertUser(email: string, fullName: string, role: UserRole, passwordHash: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { fullName, role, isActive: true }
    });
  }

  return prisma.user.create({
    data: { email, fullName, role, passwordHash, isActive: true }
  });
}

async function main() {
  const passwordHash = await hash('Pass@123', 12);

  const classes = [] as { id: string; name: string; section: string }[];
  for (const cls of classSeed) {
    const existing = await prisma.class.findFirst({
      where: { name: cls.name, section: cls.section, academicYear: cls.academicYear }
    });

    if (existing) {
      classes.push(existing);
      continue;
    }

    const created = await prisma.class.create({ data: cls });
    classes.push(created);
  }

  const teachers = [] as { id: string; userId: string }[];
  for (let i = 0; i < teacherSeed.length; i += 1) {
    const seed = teacherSeed[i];
    const user = await upsertUser(seed.email, seed.fullName, UserRole.TEACHER, passwordHash);

    const existingTeacher = await prisma.teacher.findUnique({ where: { userId: user.id } });

    let teacher = existingTeacher;
    if (!teacher) {
      teacher = await prisma.teacher.create({
        data: {
          userId: user.id,
          employeeCode: seed.employeeCode,
          specialization: seed.position,
          qualification: seed.department
        }
      });
    } else {
      teacher = await prisma.teacher.update({
        where: { id: teacher.id },
        data: {
          specialization: seed.position,
          qualification: seed.department
        }
      });
    }

    teachers.push({ id: teacher.id, userId: user.id });

    const classToAssign = classes[i % classes.length];
    await prisma.teacherClass.upsert({
      where: { teacherId_classId: { teacherId: teacher.id, classId: classToAssign.id } },
      update: {},
      create: { teacherId: teacher.id, classId: classToAssign.id, isClassLead: true }
    });
  }

  for (let i = 0; i < studentSeed.length; i += 1) {
    const seed = studentSeed[i];
    const assignedClass = classes[i % classes.length];

    const user = await upsertUser(seed.email, seed.fullName, UserRole.STUDENT, passwordHash);
    const existingStudent = await prisma.student.findUnique({ where: { userId: user.id } });

    if (!existingStudent) {
      await prisma.student.create({
        data: {
          userId: user.id,
          admissionNo: seed.admissionNo,
          classId: assignedClass.id
        }
      });
    } else {
      await prisma.student.update({
        where: { id: existingStudent.id },
        data: { classId: assignedClass.id }
      });
    }
  }

  console.log('Done: 5 classes, 4 teachers, 10 students are ready.');
  console.log('Teacher login passwords: Pass@123');
  console.log('Student login passwords: Pass@123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
