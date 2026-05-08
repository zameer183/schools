import 'server-only';

type SendWhatsAppTextInput = {
  to: string;
  body: string;
};

type SendWhatsAppTextResult = {
  providerMessageId: string | null;
};

type SendWhatsAppTemplateInput = {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParameters: string[];
};

type SendWhatsAppTemplateResult = {
  providerMessageId: string | null;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function normalizeRecipient(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    throw new Error('Invalid WhatsApp recipient number');
  }
  return digits;
}

function requireNonEmpty(value: string, fieldName: string) {
  if (!value || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
  return value.trim();
}

export async function sendWhatsAppTextMessage(input: SendWhatsAppTextInput): Promise<SendWhatsAppTextResult> {
  const apiVersion = process.env.WHATSAPP_CLOUD_API_VERSION ?? 'v20.0';
  const phoneNumberId = getRequiredEnv('WHATSAPP_CLOUD_PHONE_NUMBER_ID');
  const accessToken = getRequiredEnv('WHATSAPP_CLOUD_ACCESS_TOKEN');
  const to = normalizeRecipient(input.to);

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          body: input.body,
        },
      }),
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerError =
      (payload as { error?: { message?: string } })?.error?.message ??
      `WhatsApp API HTTP ${response.status}`;
    throw new Error(providerError);
  }

  const providerMessageId =
    ((payload as { messages?: Array<{ id?: string }> }).messages?.[0]?.id as string | undefined) ??
    null;

  return { providerMessageId };
}

export async function sendWhatsAppTemplateMessage(
  input: SendWhatsAppTemplateInput
): Promise<SendWhatsAppTemplateResult> {
  const apiVersion = process.env.WHATSAPP_CLOUD_API_VERSION ?? 'v20.0';
  const phoneNumberId = getRequiredEnv('WHATSAPP_CLOUD_PHONE_NUMBER_ID');
  const accessToken = getRequiredEnv('WHATSAPP_CLOUD_ACCESS_TOKEN');
  const to = normalizeRecipient(input.to);
  const templateName = requireNonEmpty(input.templateName, 'templateName');
  const languageCode = requireNonEmpty(input.languageCode, 'languageCode');

  const bodyParameters = input.bodyParameters.map((value, index) => ({
    type: 'text' as const,
    text: requireNonEmpty(value, `bodyParameters[${index}]`),
  }));

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          components: [
            {
              type: 'body',
              parameters: bodyParameters,
            },
          ],
        },
      }),
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerError =
      (payload as { error?: { message?: string } })?.error?.message ??
      `WhatsApp API HTTP ${response.status}`;
    throw new Error(providerError);
  }

  const providerMessageId =
    ((payload as { messages?: Array<{ id?: string }> }).messages?.[0]?.id as string | undefined) ??
    null;

  return { providerMessageId };
}
