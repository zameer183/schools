import { CampaignItemStatus, CampaignStatus, CampaignType, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { createReminderCampaignDraft } from '@/lib/fee-campaign-queue';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

export async function POST() {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const existing = await prisma.campaign.findFirst({
    where: {
      type: CampaignType.REMINDER,
      status: { in: [CampaignStatus.DRAFT, CampaignStatus.APPROVED] },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ campaignId: existing.id, reused: true });
  }

  const draft = await createReminderCampaignDraft();

  const created = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        type: draft.campaign.type,
        status: CampaignStatus.DRAFT,
        totalStudents: draft.campaign.totalStudents,
        totalWithWhatsApp: draft.campaign.totalWithWhatsApp,
        totalSkipped: draft.campaign.totalSkipped,
        scheduledAt: draft.campaign.scheduledAt ? new Date(draft.campaign.scheduledAt) : null,
      },
      select: { id: true },
    });

    await tx.campaignItem.createMany({
      data: draft.items.map((item) => ({
        campaignId: campaign.id,
        studentId: item.studentId,
        studentName: item.studentName,
        whatsApp: item.whatsApp,
        hasWhatsApp: item.hasWhatsApp,
        message: item.message,
        templateData: item.templateData,
        status: item.hasWhatsApp ? CampaignItemStatus.PENDING : CampaignItemStatus.SKIPPED,
      })),
    });

    return campaign;
  });

  return NextResponse.json({ campaignId: created.id, reused: false }, { status: 201 });
}
