import { CampaignItemStatus, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

type RouteContext = {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { id, itemId } = await context.params;

  const marked = await prisma.campaignItem.updateMany({
    where: {
      id: itemId,
      campaignId: id,
      status: CampaignItemStatus.PENDING,
    },
    data: {
      status: CampaignItemStatus.SENT,
      sentAt: new Date(),
    },
  });

  if (marked.count === 0) {
    const existing = await prisma.campaignItem.findUnique({
      where: { id: itemId },
      select: { id: true, campaignId: true, status: true },
    });

    if (!existing || existing.campaignId !== id) {
      return NextResponse.json({ error: 'Campaign item not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: `Only ${CampaignItemStatus.PENDING} items can be marked as sent.` },
      { status: 409 }
    );
  }

  const item = await prisma.campaignItem.findUnique({
    where: { id: itemId },
  });

  return NextResponse.json({ item });
}
