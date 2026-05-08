import 'server-only';

import { CampaignDispatchStatus, CampaignItemStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { buildFeeReminderTemplatePayload } from '@/lib/whatsapp-template-payload';
import { sendWhatsAppTemplateMessage, sendWhatsAppTextMessage } from '@/lib/whatsapp-provider';

export type DispatchWorkerOptions = {
  limit?: number;
  maxRetries?: number;
  baseBackoffMinutes?: number;
  maxPerMinute?: number;
  now?: Date;
  workerId?: string;
};

export type DispatchWorkerResult = {
  workerId: string;
  scanned: number;
  locked: number;
  sent: number;
  requeued: number;
  failed: number;
  skipped: number;
  rateLimitRemaining: number;
};

type WorkerDispatchItem = {
  campaignItem: {
    id: string;
    studentName: string;
    whatsApp: string | null;
    message: string;
    templateData: unknown | null;
  };
};

function resolveSendMode(dispatchItem: WorkerDispatchItem): 'template' | 'text' {
  return dispatchItem.campaignItem.templateData ? 'template' : 'text';
}

function buildNextAttemptAt(now: Date, attemptCount: number, baseBackoffMinutes: number) {
  const multiplier = Math.max(1, 2 ** Math.max(0, attemptCount - 1));
  return new Date(now.getTime() + baseBackoffMinutes * multiplier * 60_000);
}

export async function processCampaignDispatchQueue(options: DispatchWorkerOptions = {}): Promise<DispatchWorkerResult> {
  const now = options.now ?? new Date();
  const limit = Math.min(50, Math.max(1, options.limit ?? 10));
  const maxRetries = Math.max(1, options.maxRetries ?? 3);
  const baseBackoffMinutes = Math.max(1, options.baseBackoffMinutes ?? 5);
  const configuredMaxPerMinute = Number(process.env.DISPATCH_MAX_PER_MINUTE ?? 20);
  const safeConfiguredMaxPerMinute =
    Number.isFinite(configuredMaxPerMinute) && configuredMaxPerMinute > 0
      ? configuredMaxPerMinute
      : 20;
  const maxPerMinute = Math.max(1, options.maxPerMinute ?? safeConfiguredMaxPerMinute);
  const workerId = options.workerId ?? `worker-${crypto.randomUUID()}`;
  const windowStart = new Date(now.getTime() - 60_000);

  const alreadySentInWindow = await prisma.campaignDispatch.count({
    where: {
      status: CampaignDispatchStatus.SENT,
      sentAt: { gte: windowStart },
    },
  });

  const remainingRateBudget = Math.max(0, maxPerMinute - alreadySentInWindow);
  const effectiveLimit = Math.min(limit, remainingRateBudget);

  if (effectiveLimit <= 0) {
    return {
      workerId,
      scanned: 0,
      locked: 0,
      sent: 0,
      requeued: 0,
      failed: 0,
      skipped: 0,
      rateLimitRemaining: 0,
    };
  }

  const dueItems = await prisma.campaignDispatch.findMany({
    where: {
      status: CampaignDispatchStatus.PENDING,
      nextAttemptAt: { lte: now },
    },
    orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }],
    take: effectiveLimit,
    select: { id: true },
  });

  const result: DispatchWorkerResult = {
    workerId,
    scanned: dueItems.length,
    locked: 0,
    sent: 0,
    requeued: 0,
    failed: 0,
    skipped: 0,
    rateLimitRemaining: Math.max(0, remainingRateBudget - dueItems.length),
  };

  for (const dueItem of dueItems) {
    const claimed = await prisma.campaignDispatch.updateMany({
      where: {
        id: dueItem.id,
        status: CampaignDispatchStatus.PENDING,
        nextAttemptAt: { lte: now },
      },
      data: {
        status: CampaignDispatchStatus.LOCKED,
        lockedAt: new Date(),
        workerId,
      },
    });

    if (claimed.count === 0) {
      result.skipped += 1;
      continue;
    }

    result.locked += 1;

    const lockedDispatch = await prisma.campaignDispatch.findUnique({
      where: { id: dueItem.id },
      include: {
        campaignItem: {
          select: {
            id: true,
            studentName: true,
            whatsApp: true,
            message: true,
            templateData: true,
          },
        },
      },
    });

    if (!lockedDispatch) {
      result.skipped += 1;
      continue;
    }

    try {
      if (!lockedDispatch.campaignItem.message.trim()) {
        throw new Error('Dispatch message is empty');
      }
      const recipient = lockedDispatch.campaignItem.whatsApp;
      if (!recipient) {
        throw new Error('Dispatch recipient is missing WhatsApp number');
      }

      const sendMode = resolveSendMode(lockedDispatch);
      let sendResult: { providerMessageId: string | null };

      if (sendMode === 'template') {
        const templatePayload = buildFeeReminderTemplatePayload({
          id: lockedDispatch.campaignItem.id,
          templateData: lockedDispatch.campaignItem.templateData,
        });

        sendResult = await sendWhatsAppTemplateMessage({
          to: recipient,
          templateName: templatePayload.templateName,
          languageCode: templatePayload.languageCode,
          bodyParameters: templatePayload.bodyParameters,
        });
      } else {
        sendResult = await sendWhatsAppTextMessage({
          to: recipient,
          body: lockedDispatch.campaignItem.message,
        });
      }

      console.info('[dispatch-worker][sent]', {
        dispatchId: lockedDispatch.id,
        campaignId: lockedDispatch.campaignId,
        campaignItemId: lockedDispatch.campaignItemId,
        studentName: lockedDispatch.campaignItem.studentName,
        whatsApp: recipient,
        mode: sendMode,
        providerMessageId: sendResult.providerMessageId,
        workerId,
      });

      const sentAt = new Date();

      await prisma.$transaction([
        prisma.campaignDispatch.updateMany({
          where: {
            id: lockedDispatch.id,
            status: CampaignDispatchStatus.LOCKED,
            workerId,
          },
          data: {
            status: CampaignDispatchStatus.SENT,
            sentAt,
            lastError: null,
            lockedAt: null,
            workerId: null,
          },
        }),
        prisma.campaignItem.updateMany({
          where: {
            id: lockedDispatch.campaignItemId,
            status: CampaignItemStatus.PENDING,
          },
          data: {
            status: CampaignItemStatus.SENT,
            sentAt,
          },
        }),
      ]);

      result.sent += 1;
    } catch (error) {
      const nextAttemptCount = lockedDispatch.attemptCount + 1;
      const isTerminalFailure = nextAttemptCount >= maxRetries;
      const nextAttemptAt = buildNextAttemptAt(now, nextAttemptCount, baseBackoffMinutes);

      await prisma.campaignDispatch.updateMany({
        where: {
          id: lockedDispatch.id,
          status: CampaignDispatchStatus.LOCKED,
          workerId,
        },
        data: {
          attemptCount: nextAttemptCount,
          nextAttemptAt,
          status: isTerminalFailure ? CampaignDispatchStatus.FAILED : CampaignDispatchStatus.PENDING,
          lastError: error instanceof Error ? error.message : 'Unknown error',
          lockedAt: null,
          workerId: null,
        },
      });

      if (isTerminalFailure) {
        result.failed += 1;
      } else {
        result.requeued += 1;
      }

      console.error('[dispatch-worker][send-failed]', {
        dispatchId: lockedDispatch.id,
        campaignId: lockedDispatch.campaignId,
        campaignItemId: lockedDispatch.campaignItemId,
        attemptCount: nextAttemptCount,
        maxRetries,
        error: error instanceof Error ? error.message : 'Unknown error',
        workerId,
      });
    }
  }

  return result;
}
