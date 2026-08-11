import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import { handleApiError } from '@/lib/error-handler';

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'AUTH_REQUIRED', status: 401 } },
        { status: 401 }
      );
    }

    const userId = token.id;
    const jobId = params.jobId;

    // Check Redis first for completed export
    const cached = await redis.get(`export:${jobId}`);
    if (cached) {
      const data = JSON.parse(cached);
      return NextResponse.json(data);
    }

    // Fallback: generate on-the-fly
    const [memories, conversations, goals, timelineEvents] = await Promise.all([
      prisma.memories.findMany({ where: { userId, status: { not: 'DELETED' } } }),
      prisma.conversations.findMany({ where: { userId }, include: { messages: true } }),
      prisma.goals.findMany({ where: { userId } }),
      prisma.timeline_events.findMany({ where: { userId } }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId,
      memories,
      conversations,
      goals,
      timelineEvents,
    };

    return NextResponse.json(exportData);
  } catch (error) {
    return handleApiError(error);
  }
}
