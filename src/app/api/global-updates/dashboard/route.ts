// src/app/api/global-updates/dashboard/route.ts
// Dashboard API — Lightweight personalised summary

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { globalUpdatesCache } from '@/lib/global-updates/cache';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const cached = await globalUpdatesCache.getDashboard(userId);
    if (cached) return NextResponse.json({ updates: cached });

    const rankings = await prisma.global_update_rankings.findMany({
      where: { userId, hiddenAt: null },
      orderBy: { compositeScore: 'desc' },
      take: 3,
      include: {
        event: {
          include: { sources: { take: 3, select: { publisher: true, url: true } } },
        },
      },
    });

    let updates: any[];

    if (rankings.length > 0) {
      updates = rankings.map((r) => formatEvent(r.event, r.compositeScore));
    } else {
      const events = await prisma.global_events.findMany({
        where: { status: 'ACTIVE', contentType: 'GLOBAL_UPDATE' },
        orderBy: [{ importanceScore: 'desc' }, { latestUpdateAt: 'desc' }],
        take: 3,
        include: { sources: { take: 3, select: { publisher: true, url: true } } },
      });
      updates = events.map((e) => formatEvent(e, e.importanceScore));
    }

    await globalUpdatesCache.setDashboard(userId, updates);
    return NextResponse.json({ updates });
  } catch (err) {
    console.error('[GlobalUpdates API] Dashboard error:', err);
    return NextResponse.json({ updates: [], message: 'Nothing significant has changed in your selected interests yet.' });
  }
}

function formatEvent(event: any, score: number) {
  return {
    id: event.id,
    headline: event.headline,
    summary: event.summary.slice(0, 180) + (event.summary.length > 180 ? '...' : ''),
    eventType: event.eventType,
    topics: event.topics.slice(0, 3),
    freshness: getFreshnessLabel(event.latestUpdateAt),
    sourceCount: event.sourceCount,
    confidence: score > 0.7 ? 'High' : score > 0.4 ? 'Medium' : 'Low',
    isDeveloping: event.isDeveloping,
  };
}

function getFreshnessLabel(date: Date): string {
  const hours = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  if (hours < 72) return `${Math.floor(hours / 24)}d ago`;
  return 'Updated recently';
}