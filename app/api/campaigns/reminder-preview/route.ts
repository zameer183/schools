import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ensureApiRole } from '@/lib/rbac';
import {
  approveCampaignDraft,
  buildCampaignPreviewLinks,
  createReminderCampaignDraft,
} from '@/lib/fee-campaign-queue';

export async function GET() {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const draft = await createReminderCampaignDraft();
  const approved = approveCampaignDraft(draft);
  const preview = buildCampaignPreviewLinks(approved);

  return NextResponse.json({
    campaign: preview.campaign,
    items: preview.items,
  });
}

