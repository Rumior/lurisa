import { NextRequest, NextResponse } from 'next/server';
import { runGlobalUpdatesPipeline } from '@/workers/global-updates-worker';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await runGlobalUpdatesPipeline();
    return NextResponse.json({ success: true, message: 'Global Updates pipeline completed.' });
  } catch (err) {
    console.error('[GU Job API] Pipeline error:', err);
    return NextResponse.json({ error: 'Pipeline failed' }, { status: 500 });
  }
}