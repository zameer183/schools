export type FeeReminderTemplatePayload = {
  templateName: 'fee_reminder_v1';
  languageCode: 'en';
  bodyParameters: [string, string, string, string];
};

type CampaignItemLike = {
  id?: string;
  templateData?: unknown | null;
};

type FeeReminderTemplateData = {
  studentName: string;
  amountDue: string;
  dueDate: string;
  schoolName: string;
};

function formatDueDateReadable(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error('templateData.dueDate must be a valid date string');
  }

  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function requireString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`templateData.${fieldName} is required`);
  }
  return value.trim();
}

function parseTemplateData(item: CampaignItemLike): FeeReminderTemplateData {
  if (!item.templateData || typeof item.templateData !== 'object' || Array.isArray(item.templateData)) {
    throw new Error('templateData is required');
  }

  const record = item.templateData as Record<string, unknown>;

  return {
    studentName: requireString(record.studentName, 'studentName'),
    amountDue: requireString(record.amountDue, 'amountDue'),
    dueDate: requireString(record.dueDate, 'dueDate'),
    schoolName: requireString(record.schoolName, 'schoolName'),
  };
}

export function buildFeeReminderTemplatePayload(item: CampaignItemLike): FeeReminderTemplatePayload {
  try {
    const parsed = parseTemplateData(item);
    const dueDateReadable = formatDueDateReadable(parsed.dueDate);

    return {
      templateName: 'fee_reminder_v1',
      languageCode: 'en',
      bodyParameters: [
        parsed.studentName,
        parsed.amountDue,
        dueDateReadable,
        parsed.schoolName,
      ],
    };
  } catch (error) {
    const prefix = item.id ? `CampaignItem(${item.id})` : 'CampaignItem';
    const message = error instanceof Error ? error.message : 'Invalid templateData';
    throw new Error(`${prefix}: ${message}`);
  }
}
