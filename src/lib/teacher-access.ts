import { Prisma } from '@prisma/client';
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

export type TeacherAccessLevel = 'NONE' | 'VIEW' | 'MANAGE' | 'FULL';
export type TeacherAccessLevelMap = Record<TeacherAccessModule, TeacherAccessLevel>;
export type TeacherAccessMap = Record<TeacherAccessModule, boolean>;
export type TeacherCompensation = {
  baseSalary: number;
  bonus: number;
  deduction: number;
  netSalary: number;
};

type CompensationRow = {
  baseSalary: string | number;
  bonus: string | number;
  deduction: string | number;
};

const DENY_ALL_LEVELS: TeacherAccessLevelMap = {
  ACADEMICS: 'NONE',
  STUDENTS: 'NONE',
  ATTENDANCE: 'NONE',
  STAFF_ATTENDANCE: 'NONE',
  ASSIGNMENTS: 'NONE',
  PROGRESS: 'NONE',
  MESSAGES: 'NONE',
  EXAMS: 'NONE',
  FEES: 'NONE',
};

const DEFAULT_LEVELS: TeacherAccessLevelMap = {
  ACADEMICS: 'FULL',
  STUDENTS: 'FULL',
  ATTENDANCE: 'FULL',
  STAFF_ATTENDANCE: 'FULL',
  ASSIGNMENTS: 'FULL',
  PROGRESS: 'FULL',
  MESSAGES: 'FULL',
  EXAMS: 'FULL',
  FEES: 'FULL',
};

let ensureTeacherControlTablesPromise: Promise<boolean> | null = null;

function levelToEnabled(level: TeacherAccessLevel): boolean {
  return level !== 'NONE';
}

function enabledToLevel(enabled: boolean): TeacherAccessLevel {
  return enabled ? 'FULL' : 'NONE';
}

function levelsToAccessMap(levels: TeacherAccessLevelMap): TeacherAccessMap {
  return TEACHER_ACCESS_MODULES.reduce((acc, moduleKey) => {
    acc[moduleKey] = levelToEnabled(levels[moduleKey]);
    return acc;
  }, {} as TeacherAccessMap);
}

async function seedDefaultTeacherAccessRows(teacherId: string): Promise<void> {
  await prisma.$transaction(
    TEACHER_ACCESS_MODULES.map((moduleKey) => {
      const rowId = `access_${teacherId}_${moduleKey.toLowerCase()}`;
      return prisma.$executeRaw`
        INSERT INTO "TeacherAccess" ("id","teacherId","module","enabled","level","updatedAt")
        VALUES (${rowId}, ${teacherId}, ${moduleKey}, true, 'FULL', NOW())
        ON CONFLICT ("teacherId","module") DO NOTHING;
      `;
    })
  );
}

export async function ensureTeacherControlTables(): Promise<void> {
  if (!ensureTeacherControlTablesPromise) {
    ensureTeacherControlTablesPromise = (async () => {
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "TeacherAccess" (
            "id" TEXT PRIMARY KEY,
            "teacherId" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE,
            "module" TEXT,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "level" TEXT,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `;
        await prisma.$executeRaw`ALTER TABLE "TeacherAccess" ADD COLUMN IF NOT EXISTS "module" TEXT;`;
        await prisma.$executeRaw`ALTER TABLE "TeacherAccess" ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN NOT NULL DEFAULT true;`;
        await prisma.$executeRaw`ALTER TABLE "TeacherAccess" ADD COLUMN IF NOT EXISTS "level" TEXT;`;
        await prisma.$executeRaw`ALTER TABLE "TeacherAccess" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`;
        await prisma.$executeRaw`ALTER TABLE "TeacherAccess" DROP CONSTRAINT IF EXISTS "TeacherAccess_teacherId_key";`;
        await prisma.$executeRaw`ALTER TABLE "TeacherAccess" DROP CONSTRAINT IF EXISTS "TeacherAccess_teacherId_module_key";`;
        await prisma.$executeRaw`
          CREATE UNIQUE INDEX IF NOT EXISTS "TeacherAccess_teacherId_module_key"
          ON "TeacherAccess" ("teacherId", "module");
        `;
        const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'TeacherAccess';
        `;
        const columnNames = new Set(columns.map((column) => column.column_name));

        if (columnNames.has('ACADEMICS')) {
          await prisma.$executeRaw`
            INSERT INTO "TeacherAccess" ("id", "teacherId", "module", "enabled", "level", "updatedAt")
            SELECT CONCAT('access_', "teacherId", '_', LOWER(module_name)),
                   "teacherId",
                   module_name,
                   module_enabled,
                   CASE WHEN module_enabled THEN 'FULL' ELSE 'NONE' END,
                   NOW()
            FROM (
              SELECT "teacherId", 'ACADEMICS' AS module_name, COALESCE("ACADEMICS", true) AS module_enabled FROM "TeacherAccess" WHERE "module" IS NULL
              UNION ALL
              SELECT "teacherId", 'STUDENTS' AS module_name, COALESCE("STUDENTS", true) AS module_enabled FROM "TeacherAccess" WHERE "module" IS NULL
              UNION ALL
              SELECT "teacherId", 'ATTENDANCE' AS module_name, COALESCE("ATTENDANCE", true) AS module_enabled FROM "TeacherAccess" WHERE "module" IS NULL
              UNION ALL
              SELECT "teacherId", 'STAFF_ATTENDANCE' AS module_name, COALESCE("STAFF_ATTENDANCE", true) AS module_enabled FROM "TeacherAccess" WHERE "module" IS NULL
              UNION ALL
              SELECT "teacherId", 'ASSIGNMENTS' AS module_name, COALESCE("ASSIGNMENTS", true) AS module_enabled FROM "TeacherAccess" WHERE "module" IS NULL
              UNION ALL
              SELECT "teacherId", 'PROGRESS' AS module_name, COALESCE("PROGRESS", true) AS module_enabled FROM "TeacherAccess" WHERE "module" IS NULL
              UNION ALL
              SELECT "teacherId", 'MESSAGES' AS module_name, COALESCE("MESSAGES", true) AS module_enabled FROM "TeacherAccess" WHERE "module" IS NULL
              UNION ALL
              SELECT "teacherId", 'EXAMS' AS module_name, COALESCE("EXAMS", true) AS module_enabled FROM "TeacherAccess" WHERE "module" IS NULL
              UNION ALL
              SELECT "teacherId", 'FEES' AS module_name, COALESCE("FEES", true) AS module_enabled FROM "TeacherAccess" WHERE "module" IS NULL
            ) AS legacy_rows
            ON CONFLICT ("teacherId", "module") DO UPDATE SET
              "enabled" = EXCLUDED."enabled",
              "level" = EXCLUDED."level",
              "updatedAt" = NOW();
          `;
        }
        await prisma.$executeRaw`
          UPDATE "TeacherAccess"
          SET "level" = CASE WHEN "enabled" = true THEN 'FULL' ELSE 'NONE' END
          WHERE "module" IS NOT NULL AND ("level" IS NULL OR "level" = '');
        `;
        await prisma.$executeRaw`DELETE FROM "TeacherAccess" WHERE "module" IS NULL;`;
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
        return true;
      } catch (error) {
        console.error('[teacher-access] ensureTeacherControlTables failed', error);
        ensureTeacherControlTablesPromise = null;
        return false;
      }
    })();
  }

  await ensureTeacherControlTablesPromise;
}

export async function getTeacherAccessLevelsByTeacherId(teacherId: string): Promise<TeacherAccessLevelMap> {
  try {
    const rows = await prisma.$queryRaw<Array<{ module: string; enabled: boolean | null; level: string | null }>>`
      SELECT "module", "enabled", "level"
      FROM "TeacherAccess"
      WHERE "teacherId" = ${teacherId};
    `;

    if (rows.length === 0) {
      await seedDefaultTeacherAccessRows(teacherId);
      return { ...DEFAULT_LEVELS };
    }

    const map: TeacherAccessLevelMap = { ...DENY_ALL_LEVELS };
    for (const row of rows) {
      const moduleKey = row.module as TeacherAccessModule;
      if (!(moduleKey in map)) continue;
      const candidate = String(row.level ?? '').toUpperCase() as TeacherAccessLevel;
      map[moduleKey] =
        candidate === 'VIEW' || candidate === 'MANAGE' || candidate === 'FULL' || candidate === 'NONE'
          ? candidate
          : enabledToLevel(Boolean(row.enabled));
    }
    return map;
  } catch {
    return { ...DENY_ALL_LEVELS };
  }
}

export async function getTeacherAccessMapByTeacherId(teacherId: string): Promise<TeacherAccessMap> {
  const levels = await getTeacherAccessLevelsByTeacherId(teacherId);
  return levelsToAccessMap(levels);
}

export async function getTeacherAccessMapByUserId(userId: string): Promise<TeacherAccessMap> {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId }, select: { id: true } });
    if (!teacher) return levelsToAccessMap({ ...DENY_ALL_LEVELS });
    return getTeacherAccessMapByTeacherId(teacher.id);
  } catch {
    return levelsToAccessMap({ ...DENY_ALL_LEVELS });
  }
}

export async function getTeacherAccessLevelsByUserId(userId: string): Promise<TeacherAccessLevelMap> {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId }, select: { id: true } });
    if (!teacher) return { ...DENY_ALL_LEVELS };
    return getTeacherAccessLevelsByTeacherId(teacher.id);
  } catch {
    return { ...DENY_ALL_LEVELS };
  }
}

export async function hasTeacherAccessByUserId(userId: string, module: TeacherAccessModule): Promise<boolean> {
  const map = await getTeacherAccessMapByUserId(userId);
  return map[module];
}

export async function hasTeacherAccessLevelByUserId(
  userId: string,
  module: TeacherAccessModule,
  minLevel: Exclude<TeacherAccessLevel, 'NONE'> = 'VIEW'
): Promise<boolean> {
  const order: Record<TeacherAccessLevel, number> = { NONE: 0, VIEW: 1, MANAGE: 2, FULL: 3 };
  const levels = await getTeacherAccessLevelsByUserId(userId);
  return order[levels[module]] >= order[minLevel];
}

export async function setTeacherAccessLevels(
  teacherId: string,
  levels: Partial<TeacherAccessLevelMap>
): Promise<void> {
  await ensureTeacherControlTables();
  const current = await getTeacherAccessLevelsByTeacherId(teacherId);
  const merged: TeacherAccessLevelMap = { ...current, ...levels };

  await prisma.$transaction(
    TEACHER_ACCESS_MODULES.map((moduleKey) => {
      const level = merged[moduleKey];
      const enabled = levelToEnabled(level);
      const rowId = `access_${teacherId}_${moduleKey.toLowerCase()}`;
      return prisma.$executeRaw`
        INSERT INTO "TeacherAccess" ("id","teacherId","module","enabled","level","updatedAt")
        VALUES (${rowId}, ${teacherId}, ${moduleKey}, ${enabled}, ${level}, NOW())
        ON CONFLICT ("teacherId","module") DO UPDATE SET
          "enabled" = EXCLUDED."enabled",
          "level" = EXCLUDED."level",
          "updatedAt" = NOW();
      `;
    })
  );
}

export async function setTeacherAccessMap(teacherId: string, map: Partial<TeacherAccessMap>): Promise<void> {
  const levelPatch: Partial<TeacherAccessLevelMap> = {};
  for (const moduleKey of TEACHER_ACCESS_MODULES) {
    if (moduleKey in map) levelPatch[moduleKey] = Boolean(map[moduleKey]) ? 'FULL' : 'NONE';
  }
  await setTeacherAccessLevels(teacherId, levelPatch);
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

export async function upsertTeacherAccess(
  teacherId: string,
  access: Record<string, boolean | string>
): Promise<void> {
  const normalized: Partial<TeacherAccessLevelMap> = {};
  for (const moduleKey of TEACHER_ACCESS_MODULES) {
    if (moduleKey in access) {
      const raw = access[moduleKey];
      if (typeof raw === 'boolean') {
        normalized[moduleKey] = raw ? 'FULL' : 'NONE';
        continue;
      }
      const level = String(raw).toUpperCase();
      normalized[moduleKey] =
        level === 'VIEW' || level === 'MANAGE' || level === 'FULL' || level === 'NONE'
          ? (level as TeacherAccessLevel)
          : 'FULL';
    }
  }
  await setTeacherAccessLevels(teacherId, normalized);
}

export async function upsertTeacherCompensation(
  teacherId: string,
  data: { baseSalary?: number; bonus?: number; deduction?: number }
): Promise<void> {
  await setTeacherCompensation(teacherId, data);
}

export async function getTeacherAccessMapsByTeacherIds(
  teacherIds: string[]
): Promise<Record<string, TeacherAccessMap>> {
  const output: Record<string, TeacherAccessMap> = {};
  await Promise.all(
    teacherIds.map(async (teacherId) => {
      output[teacherId] = await getTeacherAccessMapByTeacherId(teacherId);
    })
  );
  return output;
}

export async function getTeacherAccessLevelMapsByTeacherIds(
  teacherIds: string[]
): Promise<Record<string, TeacherAccessLevelMap>> {
  if (teacherIds.length === 0) return {};

  try {
    const rows = await prisma.$queryRaw<Array<{
      teacherId: string;
      module: string | null;
      enabled: boolean | null;
      level: string | null;
    }>>`
      SELECT "teacherId", "module", "enabled", "level"
      FROM "TeacherAccess"
      WHERE "teacherId" IN (${Prisma.join(teacherIds)});
    `;

    const grouped = new Map<string, TeacherAccessLevelMap>();
    for (const teacherId of teacherIds) {
      grouped.set(teacherId, { ...DENY_ALL_LEVELS });
    }

    for (const row of rows) {
      const moduleKey = row.module as TeacherAccessModule;
      if (!TEACHER_ACCESS_MODULES.includes(moduleKey)) continue;
      const current = grouped.get(row.teacherId) ?? { ...DENY_ALL_LEVELS };
      const candidate = String(row.level ?? '').toUpperCase() as TeacherAccessLevel;
      current[moduleKey] =
        candidate === 'VIEW' || candidate === 'MANAGE' || candidate === 'FULL' || candidate === 'NONE'
          ? candidate
          : enabledToLevel(Boolean(row.enabled));
      grouped.set(row.teacherId, current);
    }

    const teachersWithRows = new Set(rows.map((row) => row.teacherId));
    await Promise.all(
      teacherIds
        .filter((teacherId) => !teachersWithRows.has(teacherId))
        .map(async (teacherId) => {
          await seedDefaultTeacherAccessRows(teacherId);
          grouped.set(teacherId, { ...DEFAULT_LEVELS });
        })
    );

    return Object.fromEntries(grouped.entries());
  } catch {
    const output: Record<string, TeacherAccessLevelMap> = {};
    await Promise.all(
      teacherIds.map(async (teacherId) => {
        output[teacherId] = await getTeacherAccessLevelsByTeacherId(teacherId);
      })
    );
    return output;
  }
}

export async function getTeacherCompensationsByTeacherIds(
  teacherIds: string[]
): Promise<Record<string, TeacherCompensation>> {
  if (teacherIds.length === 0) return {};

  try {
    const rows = await prisma.teacherCompensation.findMany({
      where: { teacherId: { in: teacherIds } },
      select: {
        teacherId: true,
        baseSalary: true,
        bonus: true,
        deduction: true
      }
    });

    const output: Record<string, TeacherCompensation> = {};
    for (const teacherId of teacherIds) {
      output[teacherId] = { baseSalary: 0, bonus: 0, deduction: 0, netSalary: 0 };
    }

    for (const row of rows) {
      const baseSalary = Number(row.baseSalary);
      const bonus = Number(row.bonus);
      const deduction = Number(row.deduction);
      output[row.teacherId] = {
        baseSalary,
        bonus,
        deduction,
        netSalary: baseSalary + bonus - deduction
      };
    }

    return output;
  } catch {
    const output: Record<string, TeacherCompensation> = {};
    await Promise.all(
      teacherIds.map(async (teacherId) => {
        output[teacherId] = await getTeacherCompensationByTeacherId(teacherId);
      })
    );
    return output;
  }
}
