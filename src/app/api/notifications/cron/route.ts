import { NextRequest, NextResponse } from 'next/server';
import { processDailyRhythm } from '@/lib/notifications/daily-rhythm';
import { fireDueIntents, expireOldIntents } from '@/lib/follow-up';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/cron
 * Called by Vercel Cron (daily at 8am).
 */
export async function GET(req: NextRequest) {
  try {
    // Auth via query param (Vercel cron cannot send custom headers)
    const secret = req.nextUrl.searchParams.get('secret');
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const [rhythmCount, firedCount, expiredCount] = await Promise.all([
      processDailyRhythm().then(r => Array.isArray(r) ? r.length : 0).catch(() => 0),
      fireDueIntents().then(r => r.length).catch(() => 0),
      expireOldIntents(2).then(r => typeof r === 'number' ? r : 0).catch(() => 0),
    ]);

    // TINY response — prevents "output too large" failure
    return NextResponse.json({
      ok: true,
      processed: { rhythm: rhythmCount, fired: firedCount, expired: expiredCount },
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
