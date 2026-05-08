import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const RETENTION_DAYS = 7;

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const result = await prisma.notification.deleteMany({
    where: { createdAt: { lt: cutoff } }
  });

  revalidateTag('admin-notifications');
  revalidatePath('/admin/notifications');

  return NextResponse.json({
    deletedCount: result.count,
    retentionDays: RETENTION_DAYS,
    cutoff: cutoff.toISOString()
  });
}
