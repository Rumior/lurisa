// src/app/api/global-updates/[id]/save/route.ts
// Save API - Persists event to user's longitudinal memory

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
    const body = await req.json().catch(() => ({}));
    const { reasonForSaving } = body;

    const event = await prisma.global_events.findUnique({
      where: { id: eventId }, select: { id: true, headline: true },
    });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const saved = await prisma.saved_global_updates.upsert({
      where: { userId_eventId: { userId, eventId } },
      update: { reasonForSaving: reasonForSaving || undefined, savedAt: new Date() },
      create: { userId, eventId, reasonForSaving: reasonForSaving || undefined, savedAt: new Date() },
    });

    try {
      const reasonText = reasonForSaving ? ' - Reason: ' + reasonForSaving : '';
      await prisma.memories.create({
        data: {
          userId, category: 'INTERESTS', type: 'LONG_TERM',
          statement: 'Saved global update: ' + event.headline + reasonText,
          confidence: 0.9, importance: 0.6,
        },
      });
    } catch (memErr) { console.error('[GlobalUpdates] Memory creation failed:', memErr); }

    try {
      await prisma.global_update_analytics.create({
        data: { eventId, userId, saveAt: new Date(), sponsored: false },
      });
    } catch { }

    return NextResponse.json({ success: true, saved });
  } catch (err) {
    console.error('[GlobalUpdates API] Save error:', err);
    return NextResponse.json({ error: 'Failed to save update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await prisma.saved_global_updates.deleteMany({
      where: { userId: session.user.id, eventId: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[GlobalUpdates API] Unsave error:', err);
    return NextResponse.json({ error: 'Failed to remove saved update' }, { status: 500 });
  }
}
