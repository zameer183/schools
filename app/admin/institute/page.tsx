import { InstituteProfilePage } from '@/components/institute/institute-profile-page';

export const dynamic = 'force-dynamic';

export default async function AdminInstitutePage() {
  return <InstituteProfilePage backHref="/admin" backLabel="Admin Dashboard" />;
}
