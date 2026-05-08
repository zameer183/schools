import { getFeeReminderCandidates, type FeeReminderStudent } from '@/lib/fee-automation';

export type CampaignType = 'REMINDER' | 'CONFIRMATION';
export type CampaignStatus = 'DRAFT' | 'APPROVED' | 'SENT';
export type CampaignItemStatus = 'PENDING' | 'SENT' | 'SKIPPED';

export type CampaignItemTemplateData = {
  studentName: string;
  amountDue: string;
  dueDate: string;
  schoolName: string;
  month: string;
};

export type Campaign = {
  id: string;
  createdAt: string;
  type: CampaignType;
  status: CampaignStatus;
  totalStudents: number;
  totalWithWhatsApp: number;
  totalSkipped: number;
  scheduledAt: string | null;
};

export type CampaignItem = {
  id: string;
  campaignId: string;
  studentId: string;
  studentName: string;
  whatsApp: string | null;
  hasWhatsApp: boolean;
  message: string;
  templateData: CampaignItemTemplateData;
  status: CampaignItemStatus;
};

export type CampaignDraft = {
  campaign: Campaign;
  items: CampaignItem[];
};

export type CampaignPreviewItem = CampaignItem & {
  whatsappUrl: string | null;
};

export type CampaignPreview = {
  campaign: Campaign;
  items: CampaignPreviewItem[];
};

function buildReminderMessage(student: FeeReminderStudent) {
  const feeCount = student.reminders.length;
  const overdueCount = student.reminders.filter((r) => r.reasons.includes('OVERDUE')).length;
  const totalAmountDue = student.reminders.reduce((sum, reminder) => sum + Number(reminder.amountDue), 0);

  return [
    `Reminder for ${student.studentName}`,
    `Fees Pending: ${feeCount}`,
    `Overdue Fees: ${overdueCount}`,
    `Total Due: ${totalAmountDue.toFixed(2)}`,
  ].join(' | ');
}

function buildReminderTemplateData(student: FeeReminderStudent): CampaignItemTemplateData {
  const totalAmountDue = student.reminders.reduce((sum, reminder) => sum + Number(reminder.amountDue), 0);
  const dueTimestamps = student.reminders
    .map((reminder) => new Date(reminder.dueDate))
    .filter((date) => !Number.isNaN(date.getTime()))
    .map((date) => date.getTime());
  const earliestDueAt = dueTimestamps.length > 0 ? Math.min(...dueTimestamps) : Date.now();
  const dueDateValue = new Date(earliestDueAt);

  return {
    studentName: student.studentName,
    amountDue: totalAmountDue.toFixed(2),
    dueDate: dueDateValue.toISOString(),
    schoolName: student.schoolName ?? 'Your School',
    month: dueDateValue.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  };
}

export function buildReminderCampaignDraftFromCandidates(
  candidates: FeeReminderStudent[],
  scheduledAt?: Date | null
): CampaignDraft {
  const campaignId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const totalStudents = candidates.length;
  const totalWithWhatsApp = candidates.filter((c) => c.hasWhatsApp).length;
  const totalSkipped = totalStudents - totalWithWhatsApp;

  const items: CampaignItem[] = candidates.map((student) => ({
    id: crypto.randomUUID(),
    campaignId,
    studentId: student.studentId,
    studentName: student.studentName,
    whatsApp: student.whatsApp,
    hasWhatsApp: student.hasWhatsApp,
    message: buildReminderMessage(student),
    templateData: buildReminderTemplateData(student),
    status: student.hasWhatsApp ? 'PENDING' : 'SKIPPED',
  }));

  return {
    campaign: {
      id: campaignId,
      createdAt,
      type: 'REMINDER',
      status: 'DRAFT',
      totalStudents,
      totalWithWhatsApp,
      totalSkipped,
      scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
    },
    items,
  };
}

export async function createReminderCampaignDraft(scheduledAt?: Date | null): Promise<CampaignDraft> {
  const candidates = await getFeeReminderCandidates();
  return buildReminderCampaignDraftFromCandidates(candidates, scheduledAt);
}

export function approveCampaignDraft(draft: CampaignDraft): CampaignDraft {
  return {
    campaign: {
      ...draft.campaign,
      status: 'APPROVED',
    },
    items: draft.items.map((item) => ({
      ...item,
      status: item.hasWhatsApp ? 'PENDING' : 'SKIPPED',
    })),
  };
}

function toWaRecipient(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

export function buildCampaignPreviewLinks(draft: CampaignDraft): CampaignPreview {
  const isApproved = draft.campaign.status === 'APPROVED';

  return {
    campaign: draft.campaign,
    items: draft.items.map((item) => {
      const recipient = toWaRecipient(item.whatsApp);
      const canBuild =
        isApproved &&
        item.hasWhatsApp &&
        item.status === 'PENDING' &&
        Boolean(recipient);

      return {
        ...item,
        whatsappUrl: canBuild
          ? `https://wa.me/${recipient}?text=${encodeURIComponent(item.message)}`
          : null,
      };
    }),
  };
}
