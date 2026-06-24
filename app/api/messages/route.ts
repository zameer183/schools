import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { hasTeacherAccessByUserId } from '@/lib/teacher-access';
import { messageCreateSchema } from '@/lib/validators';

function isLocalRestFallbackEnabled() {
  return process.env.FORCE_SUPABASE_REST_DATA_FALLBACK === '1';
}

export async function GET(request: Request) {
  try {
    const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('countOnly') === '1';

    if (countOnly && isLocalRestFallbackEnabled()) {
      return NextResponse.json({ unreadCount: 0 });
    }

    if (auth.session.role === UserRole.TEACHER && !isLocalRestFallbackEnabled()) {
      const canAccess = await hasTeacherAccessByUserId(auth.session.id, 'MESSAGES');
      if (!canAccess) {
        if (countOnly) return NextResponse.json({ unreadCount: 0 });
        return NextResponse.json({ error: 'Messages module access is disabled by admin.' }, { status: 403 });
      }
    }

    if (countOnly) {
      const unreadCount = await prisma.messageRecipient.count({
        where: { userId: auth.session.id, isRead: false }
      });
      return NextResponse.json({ unreadCount });
    }

    const requestedLimit = Number(searchParams.get('limit') ?? 20);
    const take = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50) : 20;
    const before = searchParams.get('before');
    const beforeDate = before ? new Date(before) : null;

    const inbox = await prisma.messageRecipient.findMany({
      where: {
        userId: auth.session.id,
        ...(beforeDate && !Number.isNaN(beforeDate.getTime())
          ? { message: { is: { createdAt: { lt: beforeDate } } } }
          : {})
      },
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
  } catch (error) {
    console.error('[api/messages][GET]', error);
    const { searchParams } = new URL(request.url);
    if (searchParams.get('countOnly') === '1') {
      return NextResponse.json({ unreadCount: 0 }, { status: 200 });
    }
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT]);
    if (!auth.authorized) return auth.response;
    if (auth.session.role === UserRole.TEACHER) {
      const canAccess = await hasTeacherAccessByUserId(auth.session.id, 'MESSAGES');
      if (!canAccess) {
        return NextResponse.json({ error: 'Messages module access is disabled by admin.' }, { status: 403 });
      }
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const parsed = messageCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const uniqueRecipientIds = Array.from(
      new Set(parsed.data.recipientIds.map((id) => id.trim()).filter(Boolean))
    );
    if (!uniqueRecipientIds.length) {
      return NextResponse.json({ error: 'At least one valid recipient is required.' }, { status: 400 });
    }

    const validRecipients = await prisma.user.findMany({
      where: { id: { in: uniqueRecipientIds }, isActive: true },
      select: { id: true }
    });
    const validRecipientIds = validRecipients.map((user) => user.id);

    if (!validRecipientIds.length) {
      return NextResponse.json({ error: 'Selected recipients are invalid or inactive.' }, { status: 400 });
    }

    const message = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: {
          senderId: auth.session.id,
          subject: parsed.data.subject,
          body: parsed.data.body
        },
        include: { recipients: true }
      });

      await tx.messageRecipient.createMany({
        data: validRecipientIds.map((userId) => ({ messageId: createdMessage.id, userId })),
        skipDuplicates: true
      });

      return createdMessage;
    });

    // bust sender + all recipient page caches so messages appear immediately on refresh
    revalidatePath('/teacher/messages');
    revalidatePath('/student/messages');
    revalidatePath('/admin/messages');

    return NextResponse.json(
      { id: message.id, createdAt: message.createdAt.toISOString(), recipientCount: validRecipientIds.length },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/messages][POST]', error);
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
    if (!auth.authorized) return auth.response;
    if (auth.session.role === UserRole.TEACHER) {
      const canAccess = await hasTeacherAccessByUserId(auth.session.id, 'MESSAGES');
      if (!canAccess) {
        return NextResponse.json({ error: 'Messages module access is disabled by admin.' }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const conversationWithUserId = searchParams.get('conversationWithUserId')?.trim();

    if (conversationWithUserId) {
      const [sentMessages, receivedRecipientRows] = await Promise.all([
        prisma.message.findMany({
          where: {
            senderId: auth.session.id,
            recipients: {
              some: { userId: conversationWithUserId }
            }
          },
          select: { id: true }
        }),
        prisma.messageRecipient.findMany({
          where: {
            userId: auth.session.id,
            message: {
              senderId: conversationWithUserId
            }
          },
          select: { id: true, messageId: true }
        })
      ]);

      const sentMessageIds = sentMessages.map((message) => message.id);
      const receivedRecipientIds = receivedRecipientRows.map((row) => row.id);

      await prisma.$transaction(async (tx) => {
        if (receivedRecipientIds.length > 0) {
          await tx.messageRecipient.deleteMany({
            where: { id: { in: receivedRecipientIds } }
          });
        }

        if (sentMessageIds.length > 0) {
          await tx.message.deleteMany({
            where: {
              id: { in: sentMessageIds },
              senderId: auth.session.id
            }
          });
        }
      });

      return NextResponse.json({
        success: true,
        deletedSentMessages: sentMessageIds.length,
        deletedReceivedMessages: receivedRecipientIds.length
      });
    }

    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id or conversationWithUserId is required' }, { status: 400 });
    }

    const existing = await prisma.message.findUnique({
      where: { id },
      select: { id: true, senderId: true }
    });
    if (!existing) {
      return NextResponse.json({ success: true });
    }

    // Admin or original sender: delete entire message (cascades to all recipients)
    if (auth.session.role === UserRole.ADMIN || existing.senderId === auth.session.id) {
      await prisma.message.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    // Recipient deleting from their inbox: remove only their MessageRecipient row
    const recipientRecord = await prisma.messageRecipient.findFirst({
      where: { messageId: id, userId: auth.session.id },
      select: { id: true }
    });
    if (!recipientRecord) {
      return NextResponse.json({ error: 'Not authorized to delete this message.' }, { status: 403 });
    }
    await prisma.messageRecipient.delete({ where: { id: recipientRecord.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/messages][DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete message.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
  if (!auth.authorized) return auth.response;
  if (auth.session.role === UserRole.TEACHER) {
    const canAccess = await hasTeacherAccessByUserId(auth.session.id, 'MESSAGES');
    if (!canAccess) {
      return NextResponse.json({ error: 'Messages module access is disabled by admin.' }, { status: 403 });
    }
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const senderId = typeof (payload as { senderId?: unknown })?.senderId === 'string'
    ? (payload as { senderId: string }).senderId.trim()
    : '';
  const markAll = (payload as { markAll?: unknown })?.markAll === true;

  try {
    if (markAll) {
      const result = await prisma.messageRecipient.updateMany({
        where: {
          userId: auth.session.id,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
      return NextResponse.json({ success: true, updated: result.count });
    }

    if (!senderId) {
      return NextResponse.json({ error: 'senderId is required.' }, { status: 400 });
    }

    const result = await prisma.messageRecipient.updateMany({
      where: {
        userId: auth.session.id,
        isRead: false,
        message: { is: { senderId } }
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return NextResponse.json({ success: true, updated: result.count });
  } catch (error) {
    console.error('[api/messages][PATCH]', error);
    return NextResponse.json({ error: 'Failed to update message status.' }, { status: 500 });
  }
}
