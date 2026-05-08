import test from 'node:test';
import assert from 'node:assert/strict';
import type { FeeReminderStudent } from '@/lib/fee-automation';
import {
  approveCampaignDraft,
  buildCampaignPreviewLinks,
  buildReminderCampaignDraftFromCandidates,
} from '@/lib/fee-campaign-queue-core';

const sampleCandidates: FeeReminderStudent[] = [
  {
    studentId: 's1',
    studentName: 'Ali Khan',
    className: 'Grade 5',
    classSection: 'A',
    whatsApp: '+923001112233',
    hasWhatsApp: true,
    reminders: [
      {
        feeId: 'f1',
        title: 'Monthly Fee',
        dueDate: '2026-05-20T00:00:00.000Z',
        amountDue: '12000.00',
        reasons: ['UNPAID'],
      },
    ],
    hasUnpaid: true,
    hasOverdue: false,
  },
  {
    studentId: 's2',
    studentName: 'Sara Noor',
    className: 'Grade 5',
    classSection: 'A',
    whatsApp: null,
    hasWhatsApp: false,
    reminders: [
      {
        feeId: 'f2',
        title: 'Monthly Fee',
        dueDate: '2026-05-10T00:00:00.000Z',
        amountDue: '15000.00',
        reasons: ['UNPAID', 'OVERDUE'],
      },
    ],
    hasUnpaid: true,
    hasOverdue: true,
  },
];

test('draft campaign creates correct counts', () => {
  const draft = buildReminderCampaignDraftFromCandidates(sampleCandidates);
  assert.equal(draft.campaign.type, 'REMINDER');
  assert.equal(draft.campaign.status, 'DRAFT');
  assert.equal(draft.campaign.totalStudents, 2);
  assert.equal(draft.campaign.totalWithWhatsApp, 1);
  assert.equal(draft.campaign.totalSkipped, 1);
  assert.equal(draft.items.length, 2);
});

test('missing WhatsApp item becomes SKIPPED', () => {
  const draft = buildReminderCampaignDraftFromCandidates(sampleCandidates);
  const missingWaItem = draft.items.find((i) => i.studentId === 's2');
  assert.ok(missingWaItem);
  assert.equal(missingWaItem.status, 'SKIPPED');
  assert.equal(missingWaItem.hasWhatsApp, false);
});

test('approveCampaignDraft keeps SKIPPED and sets valid items to PENDING', () => {
  const draft = buildReminderCampaignDraftFromCandidates(sampleCandidates);
  const approved = approveCampaignDraft(draft);
  assert.equal(approved.campaign.status, 'APPROVED');

  const validItem = approved.items.find((i) => i.studentId === 's1');
  const skippedItem = approved.items.find((i) => i.studentId === 's2');
  assert.ok(validItem);
  assert.ok(skippedItem);
  assert.equal(validItem.status, 'PENDING');
  assert.equal(skippedItem.status, 'SKIPPED');
});

test('buildCampaignPreviewLinks creates URL only for APPROVED + PENDING + valid WhatsApp', () => {
  const draft = buildReminderCampaignDraftFromCandidates(sampleCandidates);
  const draftPreview = buildCampaignPreviewLinks(draft);
  assert.equal(draftPreview.items.every((i) => i.whatsappUrl === null), true);

  const approved = approveCampaignDraft(draft);
  const approvedPreview = buildCampaignPreviewLinks(approved);

  const validItem = approvedPreview.items.find((i) => i.studentId === 's1');
  const skippedItem = approvedPreview.items.find((i) => i.studentId === 's2');
  assert.ok(validItem);
  assert.ok(skippedItem);
  assert.ok(validItem.whatsappUrl);
  assert.equal(skippedItem.whatsappUrl, null);
});

test('preview URL number has no plus and message is URL encoded', () => {
  const approved = approveCampaignDraft(buildReminderCampaignDraftFromCandidates(sampleCandidates));
  const preview = buildCampaignPreviewLinks(approved);
  const validItem = preview.items.find((i) => i.studentId === 's1');
  assert.ok(validItem);
  assert.ok(validItem.whatsappUrl);

  const url = validItem.whatsappUrl;
  const match = url.match(/^https:\/\/wa\.me\/([^?]+)\?text=(.+)$/);
  assert.ok(match);

  const recipient = match[1];
  const encoded = match[2];

  assert.equal(recipient.includes('+'), false);
  assert.ok(/^923\d{9}$/.test(recipient));
  assert.equal(encoded.includes(' '), false);
  assert.ok(encoded.includes('%20') || encoded.includes('%7C'));
});
