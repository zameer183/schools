import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const TEACHER_ACCESS_MODULES = [
  'ACADEMICS',
  'STUDENTS',
  'ATTENDANCE',
  'STAFF_ATTENDANCE',
  'ASSIGNMENTS',
  'PROGRESS',
  'MESSAGES',
  'EXAMS',
  'FEES'
] as const;

export type TeacherAccessModule = (typeof TEACHER_ACCESS_MODULES)[number];
export type TeacherAccessMap = Record<TeacherAccessModule, boolean>;

export const DEFAULT_TEACHER_ACCESS: TeacherAccessMap = {
  ACADEMICS: true,
  STUDENTS: true,
  ATTENDANCE: true,
  STAFF_ATTENDANCE: true,
  ASSIGNMENTS: true,
  PROGRESS: true,
  MESSAGES: true,
  EXAMS: true,
  FEES: false
};

type TeacherAccessRow = {
  teacherId: string;
  module: string;
  enabled: boolean;
};

type TeacherCompensationRow = {
  teacherId: string;
  baseSalary: unknown;
  bonus: unknown;
  deduction: unknown;
};

let ensureTablesPromise: Promise<void> | null = null;
let teacherControlTablesAvailable = true;

function toNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === 'object' && 'toString' in value) {
    const parsed = Number(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export async function ensureTeacherControlTables() {
  if (!teacherControlTablesAvailable) return;

  if (!ensureTablesPromise) {
    ensureTablesPromise = (async () => {
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "TeacherAccess" (
            "id" TEXT PRIMARY KEY,
            "teacherId" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE,
            "module" TEXT NOT NULL,
            "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE ("teacherId", "module")
          );
        `;

        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "TeacherCompensation" (
            "id" TEXT PRIMARY KEY,
            "teacherId" TEXT NOT NULL UNIQUE REFERENCES "Teacher"("id") ON DELETE CASCADE,
            "baseSalary" NUMERIC(12,2) NOT NULL DEFAULT 0,
            "bonus" NUMERIC(12,2) NOT NULL DEFAULT 0,
            "deduction" NUMERIC(12,2) NOT NULL DEFAULT 0,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `;
      } catch (error) {
        teacherControlTablesAvailable = false;
        console.error('[teacher-access] unable to ensure control tables', error);
      }
    })();
  }

  await ensureTablesPromise;
}

export async function getTeacherAccessMapByTeacherId(teacherId: string): Promise<TeacherAccessMap> {
  if (!teacherControlTablesAvailable) return { ...DEFAULT_TEACHER_ACCESS };

  const rows = await prisma.$queryRaw<TeacherAccessRow[]>`
    SELECT "teacherId", "module", "enabled"
    FROM "TeacherAccess"
    WHERE "teacherId" = ${teacherId};
  `;

  const map: TeacherAccessMap = { ...DEFAULT_TEACHER_ACCESS };

  for (const row of rows) {
    const moduleKey = row.module as TeacherAccessModule;
    if (TEACHER_ACCESS_MODULES.includes(moduleKey)) {
      map[moduleKey] = Boolean(row.enabled);
    }
  }

  return map;
}

export async function getTeacherAccessMapByUserId(userId: string): Promise<TeacherAccessMap | null> {
  await ensureTeacherControlTables();
  const teacher = await prisma.teacher.findUnique({ where: { userId }, select: { id: true } });
  if (!teacher) return null;
  return getTeacherAccessMapByTeacherId(teacher.id);
}

export async function upsertTeacherAccess(teacherId: string, access: Partial<TeacherAccessMap>) {
  await ensureTeacherControlTables();
  if (!teacherControlTablesAvailable) return;

  for (const moduleKey of TEACHER_ACCESS_MODULES) {
    const enabled = access[moduleKey] ?? DEFAULT_TEACHER_ACCESS[moduleKey];
    const rowId = `${teacherId}_${moduleKey}`;

    await prisma.$executeRaw`
      INSERT INTO "TeacherAccess" ("id", "teacherId", "module", "enabled", "updatedAt")
      VALUES (${rowId}, ${teacherId}, ${moduleKey}, ${enabled}, NOW())
      ON CONFLICT ("teacherId", "module")
      DO UPDATE SET
        "enabled" = EXCLUDED."enabled",
        "updatedAt" = NOW();
    `;
  }
}

export async function getTeacherCompensationByTeacherId(teacherId: string) {
  if (!teacherControlTablesAvailable) {
    return {
      baseSalary: 0,
      bonus: 0,
      deduction: 0,
      netSalary: 0
    };
  }

  const rows = await prisma.$queryRaw<TeacherCompensationRow[]>`
    SELECT "teacherId", "baseSalary", "bonus", "deduction"
    FROM "TeacherCompensation"
    WHERE "teacherId" = ${teacherId}
    LIMIT 1;
  `;

  const row = rows[0];
  if (!row) {
    return {
      baseSalary: 0,
      bonus: 0,
      deduction: 0,
      netSalary: 0
    };
  }

  const baseSalary = toNumber(row.baseSalary);
  const bonus = toNumber(row.bonus);
  const deduction = toNumber(row.deduction);

  return {
    baseSalary,
    bonus,
    deduction,
    netSalary: baseSalary + bonus - deduction
  };
}

export async function upsertTeacherCompensation(
  teacherId: string,
  data: { baseSalary?: number; bonus?: number; deduction?: number }
) {
  await ensureTeacherControlTables();
  if (!teacherControlTablesAvailable) return;

  const baseSalary = Number.isFinite(data.baseSalary ?? NaN) ? Number(data.baseSalary) : 0;
  const bonus = Number.isFinite(data.bonus ?? NaN) ? Number(data.bonus) : 0;
  const deduction = Number.isFinite(data.deduction ?? NaN) ? Number(data.deduction) : 0;
  const rowId = `${teacherId}_comp`;

  await prisma.$executeRaw`
    INSERT INTO "TeacherCompensation" ("id", "teacherId", "baseSalary", "bonus", "deduction", "updatedAt")
    VALUES (${rowId}, ${teacherId}, ${baseSalary}, ${bonus}, ${deduction}, NOW())
    ON CONFLICT ("teacherId")
    DO UPDATE SET
      "baseSalary" = EXCLUDED."baseSalary",
      "bonus" = EXCLUDED."bonus",
      "deduction" = EXCLUDED."deduction",
      "updatedAt" = NOW();
  `;
}

export async function hasTeacherAccessByUserId(userId: string, module: TeacherAccessModule) {
  const map = await getTeacherAccessMapByUserId(userId);
  if (!map) return false;
  return map[module];
}

export async function getTeacherAccessMapsByTeacherIds(teacherIds: string[]) {
  await ensureTeacherControlTables();
  if (!teacherControlTablesAvailable) return {};

  const result: Record<string, TeacherAccessMap> = {};
  if (teacherIds.length === 0) return result;

  const rows = await prisma.$queryRaw<TeacherAccessRow[]>(
    Prisma.sql`
      SELECT "teacherId", "module", "enabled"
      FROM "TeacherAccess"
      WHERE "teacherId" IN (${Prisma.join(teacherIds)});
    `
  );

  for (const teacherId of teacherIds) {
    result[teacherId] = { ...DEFAULT_TEACHER_ACCESS };
  }

  for (const row of rows) {
    const moduleKey = row.module as TeacherAccessModule;
    if (TEACHER_ACCESS_MODULES.includes(moduleKey)) {
      result[row.teacherId][moduleKey] = Boolean(row.enabled);
    }
  }

  return result;
}

export async function getTeacherCompensationsByTeacherIds(teacherIds: string[]) {
  await ensureTeacherControlTables();

  const result: Record<string, { baseSalary: number; bonus: number; deduction: number; netSalary: number }> = {};
  if (teacherIds.length === 0) return result;

  const rows = await prisma.$queryRaw<TeacherCompensationRow[]>(
    Prisma.sql`
      SELECT "teacherId", "baseSalary", "bonus", "deduction"
      FROM "TeacherCompensation"
      WHERE "teacherId" IN (${Prisma.join(teacherIds)});
    `
  );

  for (const teacherId of teacherIds) {
    result[teacherId] = { baseSalary: 0, bonus: 0, deduction: 0, netSalary: 0 };
  }

  for (const row of rows) {
    const baseSalary = toNumber(row.baseSalary);
    const bonus = toNumber(row.bonus);
    const deduction = toNumber(row.deduction);
    result[row.teacherId] = {
      baseSalary,
      bonus,
      deduction,
      netSalary: baseSalary + bonus - deduction
    };
  }

  return result;
}
