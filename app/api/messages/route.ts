import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { messageCreateSchema } from '@/lib/validators';

export async function GET() {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
  if (!auth.authorized) return auth.response;

  const inbox = await prisma.messageRecipient.findMany({
    where: { userId: auth.session.id },
    include: {
      message: {
        include: {
          sender: true
        }
      }
    },
    orderBy: { message: { createdAt: 'desc' } }
  });

  return NextResponse.json(inbox);
}

export async function POST(request: Request) {
  const auth = await ensureApiRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT]);
  if (!auth.authorized) return auth.response;

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

  return NextResponse.json(message, { status: 201 });
}
