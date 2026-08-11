import { NextRequest, NextResponse } from 'next/server';
import { processDailyRhythm } from '@/lib/notifications/daily-rhythm';
import { fireDueIntents, expireOldIntents } from '@/lib/follow-up';
import { handleApiError } from '@/lib/error-handler';

/**
 * POST /api/notifications/cron
 * Called by Vercel Cron (hourly) or manual trigger.
 * Handles:
 * 1. Daily rhythm (morning check-in / evening reflection)
 * 2. Firing due follow-up intents
 * 3. Expiring old unanswered intents
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'AUTH_REQUIRED', status: 401 } },
        { status: 401 }
      );
    }

    const [rhythmResult, fired, expired] = await Promise.all([
      processDailyRhythm(),
      fireDueIntents(),
      expireOldIntents(2),
    ]);

    return NextResponse.json({
      success: true,
      dailyRhythm: rhythmResult,
      followUps: { fired: fired.length, expired },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
