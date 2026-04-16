import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ensureApiRole } from '@/lib/rbac';
import { getAdminKpis, getAttendanceSummary, getEnrollmentTrend } from '@/lib/admin/dashboard-data';

export async function GET() {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const [kpis, enrollment, attendance] = await Promise.all([
    getAdminKpis(),
    getEnrollmentTrend(),
    getAttendanceSummary()
  ]);

  return NextResponse.json({
    kpis,
    charts: {
      enrollment,
      attendance
    }
  });
}
