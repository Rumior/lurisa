// src/app/api/global-updates/[id]/route.ts
// Detail API — Returns full event intelligence with personalisation

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { globalUpdatesCache } from '@/lib/global-updates/cache';
import { buildUserContext, scoreRelevance } from '@/lib/global-updates/relevance-engine';
import { personaliseEvent } from '@/lib/global-updates/personalisation';
import { formatCitations } from '@/lib/global-updates/citation';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const eventId = params.id;

  try {
    const cached = await globalUpdatesCache.getEvent(eventId);
    if (cached) {
      const personalised = await applyPersonalisation(cached, userId);
      return NextResponse.json(personalised);
    }

    const event = await prisma.global_events.findUnique({
      where: { id: eventId },
      include: {
        sources: {
          orderBy: { credibilityScore: 'desc' },
          select: {
            id: true,
            title: true,
            publisher: true,
            author: true,
            url: true,
            sourceType: true,
            publicationDate: true,
            retrievedAt: true,
            credibilityScore: true,
            country: true,
          },
        },
        savedBy: { where: { userId }, select: { id: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    let timeline: any[] = [];
    try {
      if (event.timelineJson) timeline = JSON.parse(event.timelineJson);
    } catch { /* ignore malformed timeline */ }

    // FIX: Map nulls to undefined for type compatibility with formatCitations
    const sourcesForCitations = event.sources.map((s) => ({
      sourceId: s.id,
      title: s.title,
      publisher: s.publisher ?? undefined,
      author: s.author ?? undefined,
      url: s.url,
      publicationDate: s.publicationDate ?? undefined,
      retrievedAt: s.retrievedAt,
      sourceType: s.sourceType,
      country: s.country ?? undefined,
      topic: undefined,
      credibility: s.credibilityScore,
      content: undefined,
    }));

    const result = {
      id: event.id,
      headline: event.headline,
      summary: event.summary,
      eventType: event.eventType,
      topics: event.topics,
      whatHappened: event.whatHappened,
      whatItMeans: event.whatItMeans,
      whatIsUncertain: event.whatIsUncertain,
      freshness: getFreshnessLabel(event.latestUpdateAt),
      sourceCount: event.sourceCount,
      confidence: event.confidenceScore > 0.7 ? 'High' : event.confidenceScore > 0.4 ? 'Medium' : 'Low',
      isDeveloping: event.isDeveloping,
      contentType: event.contentType,
      publishedAt: event.publishedAt?.toISOString(),
      updatedAt: event.latestUpdateAt?.toISOString(),
      lastVerifiedAt: event.lastVerifiedAt?.toISOString(),
      sources: event.sources.map((s) => ({
        id: s.id,
        title: s.title,
        publisher: s.publisher,
        author: s.author,
        url: s.url,
        sourceType: s.sourceType,
        publicationDate: s.publicationDate?.toISOString(),
        retrievedAt: s.retrievedAt?.toISOString(),
        credibility: s.credibilityScore,
        country: s.country,
      })),
      timeline,
      saved: event.savedBy.length > 0,
      citations: formatCitations(sourcesForCitations),
    };

    await globalUpdatesCache.setEvent(eventId, result);

    const personalised = await applyPersonalisation(result, userId);
    return NextResponse.json(personalised);
  } catch (err) {
    console.error('[GlobalUpdates API] Detail error:', err);
    return NextResponse.json(
      { error: 'Unable to load update details. Please try again shortly.' },
      { status: 500 }
    );
  }
}

async function applyPersonalisation(event: any, userId: string) {
  try {
    const context = await buildUserContext(userId);
    const relevance = scoreRelevance(event, context);

    if (relevance > 0.25) {
      const why = await personaliseEvent(event, context);
      if (why) {
        return { ...event, whyItMattersToYou: why, personalRelevanceScore: relevance };
      }
    }
  } catch (err) {
    console.error('[GlobalUpdates] Personalisation failed:', err);
  }
  return event;
}

function getFreshnessLabel(date: Date | null): string {
  if (!date) return 'Updated recently';
  const hours = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  if (hours < 72) return `${Math.floor(hours / 24)}d ago`;
  return 'Updated recently';
}