import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { notificationCreateSchema } from '@/lib/validators';

export async function GET() {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
  if (!auth.authorized) return auth.response;

  const notifications = await prisma.notification.findMany({
    where: auth.session.role === 'ADMIN' ? undefined : { userId: auth.session.id },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return NextResponse.json(notifications);
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER]);
  if (!auth.authorized) return auth.response;

  const parsed = notificationCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const notification = await prisma.notification.create({ data: parsed.data });
  return NextResponse.json(notification, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
  if (!auth.authorized) return auth.response;

  const { id, isRead } = await request.json();
  const updated = await prisma.notification.update({ where: { id }, data: { isRead } });
  return NextResponse.json(updated);
}
