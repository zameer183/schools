import { prisma } from '@/lib/prisma';

let ensureStaffAttendanceTablePromise: Promise<boolean> | null = null;

export async function ensureStaffAttendanceTable() {
  if (!ensureStaffAttendanceTablePromise) {
    ensureStaffAttendanceTablePromise = prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "StaffAttendance" (
        "id" TEXT PRIMARY KEY,
        "teacherId" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE,
        "date" DATE NOT NULL,
        "status" TEXT NOT NULL,
        "note" TEXT,
        "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("teacherId", "date")
      );
    `
      .then(() => true)
      .catch((error) => {
        console.error('[staff-attendance] unable to ensure table', error);
        return false;
      });
  }

  return await ensureStaffAttendanceTablePromise;
}
