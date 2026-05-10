import { requireAuth } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import SmsTemplatesClient from './sms-templates-client';

export const dynamic = 'force-dynamic';

export default async function SmsTemplatesPage() {
  await requireAuth([UserRole.ADMIN]);

  return <SmsTemplatesClient />;
}
