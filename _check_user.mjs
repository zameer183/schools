import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
const email = 'zameerahmedmehsood@gmail.com';
const pw = '12345678';
const u = await prisma.user.findFirst({
  where: { email: { equals: email, mode: 'insensitive' } },
  include: { student: { include: { class: true } }, teacher: true, parent: true }
});
if (!u) {
  console.log('USER_NOT_FOUND for', email);
} else {
  console.log('FOUND user:', { id: u.id, email: u.email, role: u.role, fullName: u.fullName, isActive: u.isActive });
  const ok = await bcrypt.compare(pw, u.passwordHash);
  console.log('PASSWORD_MATCH:', ok);
  if (u.student) console.log('STUDENT profile:', { admissionNo: u.student.admissionNo, classId: u.student.classId, className: u.student.class?.name });
  if (u.teacher) console.log('TEACHER profile:', u.teacher);
  if (u.parent) console.log('PARENT profile:', u.parent);
}
await prisma.$disconnect();
