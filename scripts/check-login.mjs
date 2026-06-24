// Usage:
//   node scripts/check-login.mjs <email> <password>
// Example:
//   node scripts/check-login.mjs zameerahmedmehsood@gmail.com 12345678
//
// Reads DATABASE_URL from .env, mirrors the same checks as
// app/api/auth/login/route.ts so you can confirm whether a login will succeed.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Minimal .env loader so we don't need the `dotenv` package.
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
} catch {
  /* ignore — fall back to ambient env */
}

const { PrismaClient } = await import('@prisma/client');
const bcrypt = (await import('bcryptjs')).default;

const [, , rawEmail, rawPassword] = process.argv;
if (!rawEmail || !rawPassword) {
  console.error('Usage: node scripts/check-login.mjs <email> <password>');
  process.exit(2);
}

const email = String(rawEmail).trim().toLowerCase();
const password = String(rawPassword).trim();

const prisma = new PrismaClient();

try {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      studentProfile: { include: { class: true } },
      teacherProfile: true,
      parentProfile: true
    }
  });

  if (!user) {
    console.log(JSON.stringify({ found: false, email, reason: 'user_not_found' }, null, 2));
    process.exit(1);
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  const result = {
    found: true,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    passwordMatches: passwordOk,
    willLoginSucceed: !!user.isActive && passwordOk,
    student: user.studentProfile
      ? {
          admissionNo: user.studentProfile.admissionNo,
          classId: user.studentProfile.classId,
          className: user.studentProfile.class?.name ?? null
        }
      : null,
    teacher: user.teacherProfile ? { id: user.teacherProfile.id } : null,
    parent: user.parentProfile ? { id: user.parentProfile.id } : null
  };

  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error('ERROR:', err.message);
  process.exit(3);
} finally {
  await prisma.$disconnect();
}
