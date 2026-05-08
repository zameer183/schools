import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { hasTeacherAccessByUserId } from '@/lib/teacher-access';
import { messageCreateSchema } from '@/lib/validators';

export async function GET(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
  if (!auth.authorized) return auth.response;
  if (auth.session.role === UserRole.TEACHER) {
    const canAccess = await hasTeacherAccessByUserId(auth.session.id, 'MESSAGES');
    if (!canAccess) {
      return NextResponse.json({ error: 'Messages module access is disabled by admin.' }, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const requestedLimit = Number(searchParams.get('limit') ?? 50);
  const take = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100) : 50;

  const inbox = await prisma.messageRecipient.findMany({
    where: { userId: auth.session.id },
    select: {
      id: true,
      isRead: true,
      readAt: true,
      message: {
        select: {
          id: true,
          subject: true,
          body: true,
          createdAt: true,
          sender: {
            select: {
              id: true,
              fullName: true,
              role: true
            }
          }
        }
      }
    },
    orderBy: { message: { createdAt: 'desc' } },
    take
  });

  return NextResponse.json(inbox);
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT]);
  if (!auth.authorized) return auth.response;
  if (auth.session.role === UserRole.TEACHER) {
    const canAccess = await hasTeacherAccessByUserId(auth.session.id, 'MESSAGES');
    if (!canAccess) {
      return NextResponse.json({ error: 'Messages module access is disabled by admin.' }, { status: 403 });
    }
  }

  const parsed = messageCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      senderId: auth.session.id,
      subject: parsed.data.subject,
      body: parsed.data.body,
      recipients: {
        createMany: {
          data: parsed.data.recipientIds.map((userId) => ({ userId }))
        }
      }
    },
    include: { recipients: true }
  });

  // bust sender + all recipient page caches so messages appear immediately on refresh
  revalidatePath('/teacher/messages');
  revalidatePath('/student/messages');
  revalidatePath('/admin/messages');

  return NextResponse.json(message, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT]);
  if (!auth.authorized) return auth.response;
  if (auth.session.role === UserRole.TEACHER) {
    const canAccess = await hasTeacherAccessByUserId(auth.session.id, 'MESSAGES');
    if (!canAccess) {
      return NextResponse.json({ error: 'Messages module access is disabled by admin.' }, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const existing = await prisma.message.findUnique({
    where: { id },
    select: { id: true, senderId: true }
  });
  if (!existing) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  if (auth.session.role !== UserRole.ADMIN && existing.senderId !== auth.session.id) {
    return NextResponse.json({ error: 'You can only delete your own sent messages.' }, { status: 403 });
  }

  await prisma.message.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
