import {
  CampaignItemStatus,
  CampaignStatus,
  CampaignType,
  AutomationAutoApproveMode,
  CampaignDispatchStatus,
} from '@prisma/client';
import { NextResponse } from 'next/server';
import { createReminderCampaignDraft } from '@/lib/fee-campaign-queue';
import { prisma } from '@/lib/prisma';

function getTodayRange(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await prisma.automationConfig.findFirst({
    where: { name: 'default' },
    orderBy: { updatedAt: 'desc' },
  });

  if (!config || !config.enabled) {
    return NextResponse.json({ error: 'Automation is disabled' }, { status: 403 });
  }

  const run = await prisma.automationRun.create({
    data: {
      configId: config.id,
      status: 'STARTED',
      autoApproveMode: config.autoApproveMode,
    },
    select: { id: true },
  });

  try {
    const now = new Date();
    const { start, end } = getTodayRange(now);

    let campaign = await prisma.campaign.findFirst({
      where: {
        type: CampaignType.REMINDER,
        status: { in: [CampaignStatus.DRAFT, CampaignStatus.APPROVED] },
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        totalStudents: true,
        totalWithWhatsApp: true,
        totalSkipped: true,
        status: true,
      },
    });

    if (!campaign) {
      const draft = await createReminderCampaignDraft();
      campaign = await prisma.$transaction(async (tx) => {
        const createdCampaign = await tx.campaign.create({
          data: {
            type: CampaignType.REMINDER,
            status: CampaignStatus.DRAFT,
            totalStudents: draft.campaign.totalStudents,
            totalWithWhatsApp: draft.campaign.totalWithWhatsApp,
            totalSkipped: draft.campaign.totalSkipped,
            scheduledAt: draft.campaign.scheduledAt ? new Date(draft.campaign.scheduledAt) : null,
          },
          select: {
            id: true,
            totalStudents: true,
            totalWithWhatsApp: true,
            totalSkipped: true,
            status: true,
          },
        });

        await tx.campaignItem.createMany({
          data: draft.items.map((item) => ({
            campaignId: createdCampaign.id,
            studentId: item.studentId,
            studentName: item.studentName,
            whatsApp: item.whatsApp,
            hasWhatsApp: item.hasWhatsApp,
            message: item.message,
            templateData: item.templateData,
            status: item.hasWhatsApp ? CampaignItemStatus.PENDING : CampaignItemStatus.SKIPPED,
          })),
        });

        return createdCampaign;
      });
    }

    let nextCampaignStatus: CampaignStatus = CampaignStatus.DRAFT;
    let autoApproveDecision = 'OFF_KEEP_DRAFT';

    if (config.autoApproveMode === AutomationAutoApproveMode.SAFE) {
      const hasStudents = campaign.totalStudents > 0;
      const hasWhatsApp = campaign.totalWithWhatsApp > 0;
      const withinThreshold = campaign.totalStudents <= config.maxAutoApproveStudents;

      if (hasStudents && hasWhatsApp && withinThreshold) {
        nextCampaignStatus = CampaignStatus.APPROVED;
        autoApproveDecision = 'SAFE_APPROVED';
      } else if (!hasStudents) {
        autoApproveDecision = 'SAFE_KEEP_DRAFT_NO_STUDENTS';
      } else if (!hasWhatsApp) {
        autoApproveDecision = 'SAFE_KEEP_DRAFT_NO_WHATSAPP';
      } else {
        autoApproveDecision = 'SAFE_KEEP_DRAFT_THRESHOLD_EXCEEDED';
      }
    }

    if (campaign.status !== nextCampaignStatus) {
      campaign = await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: nextCampaignStatus },
        select: {
          id: true,
          totalStudents: true,
          totalWithWhatsApp: true,
          totalSkipped: true,
          status: true,
        },
      });
    }

    let dispatchQueuedCount = 0;
    if (campaign.status === CampaignStatus.APPROVED) {
      const pendingItems = await prisma.campaignItem.findMany({
        where: {
          campaignId: campaign.id,
          status: CampaignItemStatus.PENDING,
        },
        select: { id: true },
      });

      if (pendingItems.length > 0) {
        const queued = await prisma.campaignDispatch.createMany({
          data: pendingItems.map((item) => ({
            campaignId: campaign.id,
            campaignItemId: item.id,
            status: CampaignDispatchStatus.PENDING,
            attemptCount: 0,
            nextAttemptAt: new Date(),
          })),
          skipDuplicates: true,
        });

        dispatchQueuedCount = queued.count;
      }
    }

    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        campaignId: campaign.id,
        status: 'COMPLETED',
        autoApproveDecision,
        totalStudents: campaign.totalStudents,
        totalWithWhatsApp: campaign.totalWithWhatsApp,
        totalSkipped: campaign.totalSkipped,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      totalStudents: campaign.totalStudents,
      totalWithWhatsApp: campaign.totalWithWhatsApp,
      totalSkipped: campaign.totalSkipped,
      campaignId: campaign.id,
      runId: run.id,
      campaignStatus: campaign.status,
      autoApproveDecision,
      dispatchQueuedCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        error: message,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ error: 'Failed to generate dry-run campaign preview', runId: run.id }, { status: 500 });
  }
}
