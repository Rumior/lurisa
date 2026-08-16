// src/app/api/global-updates/[id]/research/route.ts
// Research Integration - Transfers event context into Lurisa Research Engine

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;
  const eventId = params.id;

  try {
    const event = await prisma.global_events.findUnique({
      where: { id: eventId },
      include: {
        sources: {
          orderBy: { credibilityScore: 'desc' }, take: 10,
          select: { title: true, url: true, publisher: true, author: true, content: true, sourceType: true, credibilityScore: true },
        },
      },
    });

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const researchQuery = (event.headline + ' - ' + (event.whatHappened || event.summary)).slice(0, 500);

    const objectiveText = 'Deep research into: ' + event.headline + '.\n\nWhat happened: ' + (event.whatHappened || 'N/A') + '\nWhat it means: ' + (event.whatItMeans || 'N/A');

    const researchSession = await prisma.research_sessions.create({
      data: {
        userId, query: researchQuery,
        objective: objectiveText,
        depth: 'DEEP', status: 'PLANNING',
      },
    });

    await Promise.all(event.sources.map(source =>
      prisma.research_sources.create({
        data: {
          sessionId: researchSession.id, title: source.title, url: source.url,
          publisher: source.publisher || 'Unknown', author: source.author || undefined,
          sourceType: source.sourceType, credibilityScore: source.credibilityScore,
          content: source.content || undefined,
        },
      })
    ));

    try {
      await prisma.global_update_analytics.create({
        data: { eventId, userId, researchAt: new Date(), sponsored: false },
      });
    } catch { }

    return NextResponse.json({
      success: true, researchSessionId: researchSession.id,
      redirectUrl: '/research?session=' + researchSession.id,
    });
  } catch (err) {
    console.error('[GlobalUpdates API] Research error:', err);
    return NextResponse.json({ error: 'Unable to start research session. Please try again.' }, { status: 500 });
  }
}
