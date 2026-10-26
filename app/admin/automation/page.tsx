import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { getAutomationOverviewData } from './actions';
import AutomationDashboardClient from './automation-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function AdminAutomationPage() {
  await requireAuth([UserRole.ADMIN]);
  const data = await getAutomationOverviewData();

  return (
    <div className="space-y-6">
      <AutomationDashboardClient initialData={data} />
    </div>
  );
}
