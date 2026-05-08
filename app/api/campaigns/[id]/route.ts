import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function toWaRecipient(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const items = campaign.items.map((item) => {
    const recipient = toWaRecipient(item.whatsApp);
    const canBuild =
      campaign.status === 'APPROVED' &&
      item.hasWhatsApp &&
      item.status === 'PENDING' &&
      Boolean(recipient);

    return {
      ...item,
      whatsappUrl: canBuild ? `https://wa.me/${recipient}?text=${encodeURIComponent(item.message)}` : null,
    };
  });

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      type: campaign.type,
      status: campaign.status,
      totalStudents: campaign.totalStudents,
      totalWithWhatsApp: campaign.totalWithWhatsApp,
      totalSkipped: campaign.totalSkipped,
      scheduledAt: campaign.scheduledAt,
    },
    items,
  });
}
