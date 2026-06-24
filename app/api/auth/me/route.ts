import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth';
import { getTeacherAccessMapByUserId, getTeacherAccessLevelsByUserId } from '@/lib/teacher-access';

export async function GET() {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const teacherAccess = session.role === 'TEACHER'
    ? await getTeacherAccessMapByUserId(session.id)
    : null;
  const teacherAccessLevels = session.role === 'TEACHER'
    ? await getTeacherAccessLevelsByUserId(session.id)
    : null;

  return NextResponse.json({ user: session, teacherAccess, teacherAccessLevels });
}
