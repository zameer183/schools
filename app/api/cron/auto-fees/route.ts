import { NextResponse } from 'next/server';
import { runFeeAutomation } from '@/lib/fee-automation';

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await runFeeAutomation();
  return NextResponse.json(result);
}
