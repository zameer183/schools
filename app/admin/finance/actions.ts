'use server';

import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { runFeeAutomation } from '@/lib/fee-automation';

export async function runAutoFeesAction() {
  await requireAuth([UserRole.ADMIN]);
  return runFeeAutomation();
}
