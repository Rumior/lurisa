// src/app/api/global-updates/feed/route.ts
// Feed API — IMPROVED
// Fixes: Analytics FK bug, adds trending velocity, wires personalisation, sponsored content support

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import { globalUpdatesCache } from '@/lib/global-updates/cache';
import { buildUserContext, scoreRelevance } from '@/lib/global-updates/relevance-engine';
import { personaliseEvent } from '@/lib/global-updates/personalisation';
import { trackFeedImpression } from '@/lib/global-updates/analytics';
import { fetchSponsoredContent, mixSponsoredContent } from '@/lib/global-updates/advertising';

const VALID_TABS = ['for-you', 'trending', 'africa', 'technology', 'business', 'interests'];
const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX = 30;

async function checkRateLimit(identifier: string): Promise<boolean> {
  try {
    const key = `ratelimit:global-updates:feed:${identifier}`;
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }
    return current <= RATE_LIMIT_MAX;
  } catch {
    return true;
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const allowed = await checkRateLimit(`${userId}:${clientIp}`);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please slow down.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get('tab') || 'for-you';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10')));

  if (!VALID_TABS.includes(tab)) {
    return NextResponse.json({ error: 'Invalid tab' }, { status: 400 });
  }

  try {
    const cached = await globalUpdatesCache.getFeed(userId, tab, page);
    if (cached) {
      return NextResponse.json(
        { updates: cached, tab, page, hasMore: cached.length === pageSize },
        { headers: { 'X-Cache': 'HIT', 'X-Content-Type-Options': 'nosniff' } }
      );
    }

    let updates: any[] = [];

    if (tab === 'for-you') {
      const rankings = await prisma.global_update_rankings.findMany({
        where: { userId, hiddenAt: null },
        orderBy: { compositeScore: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          event: {
            include: { sources: { take: 5, select: { publisher: true, url: true, sourceType: true } } },
          },
        },
      });
      updates = await Promise.all(
        rankings.map((r) => formatFeedEvent(r.event, r.compositeScore, userId))
      );
    } else if (tab === 'trending') {
      // IMPROVED: Use velocity scores from Redis for true trending
      const events = await prisma.global_events.findMany({
        where: { status: 'ACTIVE', importanceScore: { gte: 0.4 } },
        orderBy: [{ importanceScore: 'desc' }, { latestUpdateAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize * 2, // Fetch extra to filter by velocity
        include: { sources: { take: 5, select: { publisher: true, url: true, sourceType: true } } },
      });

      // Enrich with velocity and re-sort
      const withVelocity = await Promise.all(
        events.map(async (e) => {
          const velocityStr = await redis.get(`global-updates:velocity:${e.id}`);
          const velocity = velocityStr ? parseFloat(velocityStr) : 0;
          return { event: e, velocity };
        })
      );

      const trending = withVelocity
        .filter((e) => e.velocity > 0.3 || e.event.importanceScore > 0.7)
        .sort((a, b) => b.velocity - a.velocity)
        .slice(0, pageSize);

      updates = await Promise.all(
        trending.map((t) => formatFeedEvent(t.event, t.event.importanceScore, userId))
      );
    } else if (tab === 'africa') {
      const events = await prisma.global_events.findMany({
        where: { status: 'ACTIVE', africanCountries: { isEmpty: false } },
        orderBy: [{ importanceScore: 'desc' }, { latestUpdateAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { sources: { take: 5, select: { publisher: true, url: true, sourceType: true } } },
      });
      updates = await Promise.all(
        events.map((e) => formatFeedEvent(e, e.importanceScore, userId))
      );
    } else if (tab === 'technology') {
      const events = await prisma.global_events.findMany({
        where: {
          status: 'ACTIVE',
          OR: [{ eventType: 'TECHNOLOGY' }, { topics: { has: 'technology' } }],
        },
        orderBy: [{ importanceScore: 'desc' }, { latestUpdateAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { sources: { take: 5, select: { publisher: true, url: true, sourceType: true } } },
      });
      updates = await Promise.all(
        events.map((e) => formatFeedEvent(e, e.importanceScore, userId))
      );
    } else if (tab === 'business') {
      const events = await prisma.global_events.findMany({
        where: {
          status: 'ACTIVE',
          OR: [{ eventType: 'BUSINESS' }, { eventType: 'MARKET' }, { topics: { has: 'business' } }],
        },
        orderBy: [{ importanceScore: 'desc' }, { latestUpdateAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { sources: { take: 5, select: { publisher: true, url: true, sourceType: true } } },
      });
      updates = await Promise.all(
        events.map((e) => formatFeedEvent(e, e.importanceScore, userId))
      );
    } else if (tab === 'interests') {
      const userInterests = await prisma.user_interests.findMany({
        where: { userId, isFollowed: true, isHidden: false },
      });
      const topics = userInterests.map((i) => i.topic.toLowerCase());
      if (topics.length === 0) {
        return NextResponse.json({
          updates: [],
          message: 'You have not followed any topics yet. Explore and follow topics that matter to you.',
        });
      }
      const events = await prisma.global_events.findMany({
        where: {
          status: 'ACTIVE',
          topics: { hasSome: topics },
        },
        orderBy: [{ importanceScore: 'desc' }, { latestUpdateAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { sources: { take: 5, select: { publisher: true, url: true, sourceType: true } } },
      });
      updates = await Promise.all(
        events.map((e) => formatFeedEvent(e, e.importanceScore, userId))
      );
    }

    // IMPROVED: Mix sponsored content for "for-you" tab only (not Africa/Interests)
    if (tab === 'for-you' && page === 1) {
      try {
        const context = await buildUserContext(userId);
        const sponsored = await fetchSponsoredContent(context, 1);
        if (sponsored.length > 0) {
          updates = mixSponsoredContent(updates, sponsored) as any[];
        }
      } catch (adErr) {
        console.error('[GlobalUpdates] Sponsored content failed:', adErr);
        // Never break the feed for ad errors
      }
    }

    await globalUpdatesCache.setFeed(userId, tab, page, updates);

    // IMPROVED: Track feed impression via Redis counter (no FK violation)
    try {
      await trackFeedImpression(userId, tab);
    } catch { /* analytics must never break the request */ }

    return NextResponse.json(
      { updates, tab, page, hasMore: updates.length === pageSize },
      { headers: { 'X-Content-Type-Options': 'nosniff' } }
    );
  } catch (err) {
    console.error('[GlobalUpdates API] Feed error:', err);
    return NextResponse.json(
      { updates: [], message: 'Unable to load updates right now. Please try again shortly.' },
      { status: 500 }
    );
  }
}

async function formatFeedEvent(event: any, score: number, userId?: string) {
  const base = {
    id: event.id,
    headline: event.headline,
    summary: event.summary.slice(0, 240) + (event.summary.length > 240 ? '...' : ''),
    eventType: event.eventType,
    topics: event.topics.slice(0, 3),
    whatHappened: event.whatHappened?.slice(0, 300),
    whatItMeans: event.whatItMeans?.slice(0, 300),
    freshness: getFreshnessLabel(event.latestUpdateAt),
    sourceCount: event.sourceCount,
    confidence: score > 0.7 ? 'High' : score > 0.4 ? 'Medium' : 'Low',
    isDeveloping: event.isDeveloping,
    contentType: event.contentType,
  };

  // IMPROVED: Wire personalisation for "for-you" events
  if (userId && event.contentType === 'GLOBAL_UPDATE') {
    try {
      const context = await buildUserContext(userId);
      const relevance = scoreRelevance(event, context);
      if (relevance > 0.3) {
        const why = await personaliseEvent(event, context);
        if (why) {
          return { ...base, whyItMattersToYou: why };
        }
      }
    } catch (err) {
      console.error('[GlobalUpdates] Feed personalisation failed:', err);
    }
  }

  return base;
}

function getFreshnessLabel(date: Date): string {
  const hours = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  if (hours < 72) return `${Math.floor(hours / 24)}d ago`;
  return 'Updated recently';
}
