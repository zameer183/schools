import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTeacherAccessMapByUserId } from '@/lib/teacher-access';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const teacherAccess = session.role === 'TEACHER'
    ? await getTeacherAccessMapByUserId(session.id)
    : null;

  return NextResponse.json({ user: session, teacherAccess });
}
