import { InstituteProfilePage } from '@/components/institute/institute-profile-page';

export const dynamic = 'force-dynamic';

export default async function ParentInstitutePage() {
  return <InstituteProfilePage backHref="/parent" backLabel="Parent Dashboard" />;
}
