import { InstituteProfilePage } from '@/components/institute/institute-profile-page';

export const dynamic = 'force-dynamic';

export default async function TeacherInstitutePage() {
  return <InstituteProfilePage backHref="/teacher" backLabel="Teacher Dashboard" />;
}
