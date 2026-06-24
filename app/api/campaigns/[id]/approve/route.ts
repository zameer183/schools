import { CampaignDispatchStatus, CampaignItemStatus, CampaignStatus, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;

  const existing = await prisma.campaign.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const updatedCampaign = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.update({
      where: { id },
      data: { status: CampaignStatus.APPROVED },
      select: {
        id: true,
        status: true,
        totalStudents: true,
        totalWithWhatsApp: true,
        totalSkipped: true,
      },
    });

    await tx.campaignItem.updateMany({
      where: { campaignId: id, hasWhatsApp: true, status: { not: CampaignItemStatus.SENT } },
      data: { status: CampaignItemStatus.PENDING },
    });

    await tx.campaignItem.updateMany({
      where: { campaignId: id, hasWhatsApp: false },
      data: { status: CampaignItemStatus.SKIPPED },
    });

    const pendingItems = await tx.campaignItem.findMany({
      where: {
        campaignId: id,
        status: CampaignItemStatus.PENDING,
      },
      select: { id: true },
    });

    if (pendingItems.length > 0) {
      await tx.campaignDispatch.createMany({
        data: pendingItems.map((item) => ({
          campaignId: id,
          campaignItemId: item.id,
          status: CampaignDispatchStatus.PENDING,
          attemptCount: 0,
          nextAttemptAt: new Date(),
        })),
        skipDuplicates: true,
      });
    }

    return campaign;
  });

  return NextResponse.json({
    campaign: updatedCampaign,
  });
}
