import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: 'ok',
        database: 'up',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        latencyMs: Date.now() - startedAt
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[health] database-check-failed', error);

    return NextResponse.json(
      {
        status: 'degraded',
        database: 'down',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        latencyMs: Date.now() - startedAt
      },
      { status: 503 }
    );
  }
}
