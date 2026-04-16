import { redirect } from 'next/navigation';
import { getSession, roleHomePath } from '@/lib/auth';

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  redirect(roleHomePath(session.role));
}
