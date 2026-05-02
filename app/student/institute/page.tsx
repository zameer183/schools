import { InstituteProfilePage } from '@/components/institute/institute-profile-page';

export const dynamic = 'force-dynamic';

export default async function StudentInstitutePage() {
  return <InstituteProfilePage backHref="/student" backLabel="Student Dashboard" />;
}
