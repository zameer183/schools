import { NotificationType, type Prisma, UserRole } from '@prisma/client';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { notificationCreateSchema } from '@/lib/validators';

function isLocalRestFallbackEnabled() {
  return process.env.FORCE_SUPABASE_REST_DATA_FALLBACK === '1';
}

export async function GET(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const countOnly = searchParams.get('countOnly') === '1';

  if (countOnly) {
    if (isLocalRestFallbackEnabled()) {
      return NextResponse.json({ unreadCount: 0 });
    }

    try {
      const unreadCount = await prisma.notification.count({
        where: { userId: auth.session.id, isRead: false }
      });
      return NextResponse.json({ unreadCount });
    } catch (error) {
      console.error('[api/notifications][countOnly]', error);
      return NextResponse.json({ unreadCount: 0 });
    }
  }

  const requestedLimit = Number(searchParams.get('limit') ?? 20);
  const take = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50) : 20;
  const before = searchParams.get('before');
  const beforeDate = before ? new Date(before) : null;
  const createdAtFilter: Prisma.NotificationWhereInput =
    beforeDate && !Number.isNaN(beforeDate.getTime()) ? { createdAt: { lt: beforeDate } } : {};
  const where: Prisma.NotificationWhereInput =
    auth.session.role === 'ADMIN'
      ? createdAtFilter
      : { userId: auth.session.id, ...createdAtFilter };

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take
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

  const payload = await request.json().catch(() => ({}));
  const id = typeof payload?.id === 'string' ? payload.id.trim() : '';
  const isRead = payload?.isRead === true;
  const markAll = payload?.markAll === true;
  const userScopedWhere: Prisma.NotificationWhereInput =
    auth.session.role === UserRole.ADMIN ? {} : { userId: auth.session.id };

  if (markAll) {
    const result = await prisma.notification.updateMany({
      where: { ...userScopedWhere, isRead: false },
      data: { isRead: true }
    });
    return NextResponse.json({ success: true, updated: result.count });
  }

  if (!id) {
    return NextResponse.json({ error: 'Notification id is required.' }, { status: 400 });
  }

  const result = await prisma.notification.updateMany({
    where: { ...userScopedWhere, id },
    data: { isRead }
  });

  if (result.count === 0) {
    return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, updated: result.count });
}

export async function DELETE(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const payload = await request.json().catch(() => ({}));
  const mode = payload?.mode === 'broadcast' ? 'broadcast' : 'single';

  if (mode === 'broadcast') {
    const title = typeof payload?.title === 'string' ? payload.title.trim() : '';
    const body = typeof payload?.body === 'string' ? payload.body.trim() : '';
    const typeRaw = typeof payload?.type === 'string' ? payload.type.trim().toUpperCase() : '';
    const createdAtRaw = typeof payload?.createdAt === 'string' ? payload.createdAt : '';

    if (!title || !body || !createdAtRaw || !typeRaw) {
      return NextResponse.json({ error: 'Invalid delete payload.' }, { status: 400 });
    }

    const createdAt = new Date(createdAtRaw);
    if (Number.isNaN(createdAt.getTime())) {
      return NextResponse.json({ error: 'Invalid createdAt value.' }, { status: 400 });
    }

    if (!Object.values(NotificationType).includes(typeRaw as NotificationType)) {
      return NextResponse.json({ error: 'Invalid notification type.' }, { status: 400 });
    }

    const minuteStart = new Date(createdAt);
    minuteStart.setSeconds(0, 0);
    const minuteEnd = new Date(minuteStart.getTime() + 60_000);

    const deleted = await prisma.notification.deleteMany({
      where: {
        title,
        body,
        type: typeRaw as NotificationType,
        createdAt: { gte: minuteStart, lt: minuteEnd }
      }
    });

    revalidateTag('admin-notifications');
    revalidatePath('/admin/notifications');
    return NextResponse.json({ deletedCount: deleted.count });
  }

  const id = typeof payload?.id === 'string' ? payload.id.trim() : '';
  if (!id) {
    return NextResponse.json({ error: 'Notification id is required.' }, { status: 400 });
  }

  await prisma.notification.delete({ where: { id } });
  revalidateTag('admin-notifications');
  revalidatePath('/admin/notifications');
  return NextResponse.json({ deletedCount: 1 });
}
