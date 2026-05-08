import { prisma } from '@/lib/prisma';

export type TeacherAccessModule =
  | 'ACADEMICS'
  | 'STUDENTS'
  | 'ATTENDANCE'
  | 'STAFF_ATTENDANCE'
  | 'ASSIGNMENTS'
  | 'PROGRESS'
  | 'MESSAGES'
  | 'EXAMS'
  | 'FEES';

export const TEACHER_ACCESS_MODULES: TeacherAccessModule[] = [
  'ACADEMICS',
  'STUDENTS',
  'ATTENDANCE',
  'STAFF_ATTENDANCE',
  'ASSIGNMENTS',
  'PROGRESS',
  'MESSAGES',
  'EXAMS',
  'FEES',
];

export type TeacherAccessMap = Record<TeacherAccessModule, boolean>;
export type TeacherCompensation = {
  baseSalary: number;
  bonus: number;
  deduction: number;
  netSalary: number;
};

type AccessRow = {
  ACADEMICS: boolean;
  STUDENTS: boolean;
  ATTENDANCE: boolean;
  STAFF_ATTENDANCE: boolean;
  ASSIGNMENTS: boolean;
  PROGRESS: boolean;
  MESSAGES: boolean;
  EXAMS: boolean;
  FEES: boolean;
};

type CompensationRow = {
  baseSalary: string | number;
  bonus: string | number;
  deduction: string | number;
};

const DEFAULT_ACCESS: TeacherAccessMap = {
  ACADEMICS: true,
  STUDENTS: true,
  ATTENDANCE: true,
  STAFF_ATTENDANCE: true,
  ASSIGNMENTS: true,
  PROGRESS: true,
  MESSAGES: true,
  EXAMS: true,
  FEES: true,
};

export async function ensureTeacherControlTables(): Promise<void> {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "TeacherAccess" (
        "id" TEXT PRIMARY KEY,
        "teacherId" TEXT NOT NULL UNIQUE REFERENCES "Teacher"("id") ON DELETE CASCADE,
        "ACADEMICS" BOOLEAN NOT NULL DEFAULT true,
        "STUDENTS" BOOLEAN NOT NULL DEFAULT true,
        "ATTENDANCE" BOOLEAN NOT NULL DEFAULT true,
        "STAFF_ATTENDANCE" BOOLEAN NOT NULL DEFAULT true,
        "ASSIGNMENTS" BOOLEAN NOT NULL DEFAULT true,
        "PROGRESS" BOOLEAN NOT NULL DEFAULT true,
        "MESSAGES" BOOLEAN NOT NULL DEFAULT true,
        "EXAMS" BOOLEAN NOT NULL DEFAULT true,
        "FEES" BOOLEAN NOT NULL DEFAULT true,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "TeacherCompensation" (
        "id" TEXT PRIMARY KEY,
        "teacherId" TEXT NOT NULL UNIQUE REFERENCES "Teacher"("id") ON DELETE CASCADE,
        "baseSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "deduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
  } catch (error) {
    console.error('[teacher-access] ensureTeacherControlTables failed', error);
  }
}

export async function getTeacherAccessMapByTeacherId(teacherId: string): Promise<TeacherAccessMap> {
  try {
    const rows = await prisma.$queryRaw<AccessRow[]>`
      SELECT "ACADEMICS","STUDENTS","ATTENDANCE","STAFF_ATTENDANCE",
             "ASSIGNMENTS","PROGRESS","MESSAGES","EXAMS","FEES"
      FROM "TeacherAccess"
      WHERE "teacherId" = ${teacherId}
      LIMIT 1;
    `;
    if (rows.length === 0) return { ...DEFAULT_ACCESS };
    const row = rows[0];
    return {
      ACADEMICS: Boolean(row.ACADEMICS),
      STUDENTS: Boolean(row.STUDENTS),
      ATTENDANCE: Boolean(row.ATTENDANCE),
      STAFF_ATTENDANCE: Boolean(row.STAFF_ATTENDANCE),
      ASSIGNMENTS: Boolean(row.ASSIGNMENTS),
      PROGRESS: Boolean(row.PROGRESS),
      MESSAGES: Boolean(row.MESSAGES),
      EXAMS: Boolean(row.EXAMS),
      FEES: Boolean(row.FEES),
    };
  } catch {
    return { ...DEFAULT_ACCESS };
  }
}

export async function getTeacherAccessMapByUserId(userId: string): Promise<TeacherAccessMap> {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId }, select: { id: true } });
    if (!teacher) return { ...DEFAULT_ACCESS };
    return getTeacherAccessMapByTeacherId(teacher.id);
  } catch {
    return { ...DEFAULT_ACCESS };
  }
}

export async function hasTeacherAccessByUserId(userId: string, module: TeacherAccessModule): Promise<boolean> {
  const map = await getTeacherAccessMapByUserId(userId);
  return map[module];
}

export async function setTeacherAccessMap(teacherId: string, map: Partial<TeacherAccessMap>): Promise<void> {
  await ensureTeacherControlTables();
  const id = `access_${teacherId}`;
  const current = await getTeacherAccessMapByTeacherId(teacherId);
  const merged = { ...current, ...map };
  await prisma.$executeRaw`
    INSERT INTO "TeacherAccess" (
      "id","teacherId","ACADEMICS","STUDENTS","ATTENDANCE","STAFF_ATTENDANCE",
      "ASSIGNMENTS","PROGRESS","MESSAGES","EXAMS","FEES","updatedAt"
    ) VALUES (
      ${id},${teacherId},${merged.ACADEMICS},${merged.STUDENTS},${merged.ATTENDANCE},
      ${merged.STAFF_ATTENDANCE},${merged.ASSIGNMENTS},${merged.PROGRESS},
      ${merged.MESSAGES},${merged.EXAMS},${merged.FEES},NOW()
    )
    ON CONFLICT ("teacherId") DO UPDATE SET
      "ACADEMICS" = EXCLUDED."ACADEMICS",
      "STUDENTS" = EXCLUDED."STUDENTS",
      "ATTENDANCE" = EXCLUDED."ATTENDANCE",
      "STAFF_ATTENDANCE" = EXCLUDED."STAFF_ATTENDANCE",
      "ASSIGNMENTS" = EXCLUDED."ASSIGNMENTS",
      "PROGRESS" = EXCLUDED."PROGRESS",
      "MESSAGES" = EXCLUDED."MESSAGES",
      "EXAMS" = EXCLUDED."EXAMS",
      "FEES" = EXCLUDED."FEES",
      "updatedAt" = NOW();
  `;
}

export async function getTeacherCompensationByTeacherId(teacherId: string): Promise<TeacherCompensation> {
  try {
    const rows = await prisma.$queryRaw<CompensationRow[]>`
      SELECT "baseSalary","bonus","deduction"
      FROM "TeacherCompensation"
      WHERE "teacherId" = ${teacherId}
      LIMIT 1;
    `;
    if (rows.length === 0) return { baseSalary: 0, bonus: 0, deduction: 0, netSalary: 0 };
    const row = rows[0];
    const baseSalary = Number(row.baseSalary);
    const bonus = Number(row.bonus);
    const deduction = Number(row.deduction);
    return { baseSalary, bonus, deduction, netSalary: baseSalary + bonus - deduction };
  } catch {
    return { baseSalary: 0, bonus: 0, deduction: 0, netSalary: 0 };
  }
}

export async function setTeacherCompensation(
  teacherId: string,
  data: { baseSalary?: number; bonus?: number; deduction?: number }
): Promise<void> {
  await ensureTeacherControlTables();
  const id = `comp_${teacherId}`;
  const current = await getTeacherCompensationByTeacherId(teacherId);
  const baseSalary = data.baseSalary ?? current.baseSalary;
  const bonus = data.bonus ?? current.bonus;
  const deduction = data.deduction ?? current.deduction;
  await prisma.$executeRaw`
    INSERT INTO "TeacherCompensation" ("id","teacherId","baseSalary","bonus","deduction","updatedAt")
    VALUES (${id},${teacherId},${baseSalary},${bonus},${deduction},NOW())
    ON CONFLICT ("teacherId") DO UPDATE SET
      "baseSalary" = EXCLUDED."baseSalary",
      "bonus" = EXCLUDED."bonus",
      "deduction" = EXCLUDED."deduction",
      "updatedAt" = NOW();
  `;
}
