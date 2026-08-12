import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import { pickStarterForContext } from '@/lib/conversation/starters';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = token.id;

    let alreadySent = false;
    try {
      const lastProactiveKey = `proactive:${userId}:last`;
      const lastProactive = await redis.get(lastProactiveKey);
      if (lastProactive) alreadySent = true;
    } catch (redisErr) {
      console.warn('[PROACTIVE] Redis dedup check failed, continuing with DB only:', redisErr);
    }

    if (alreadySent) {
      return NextResponse.json({ message: null });
    }

    const lastMessage = await prisma.messages.findFirst({
      where: { userId, role: 'USER' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, conversationId: true },
    });

    if (lastMessage) {
      const hoursSince = (Date.now() - lastMessage.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 4) {
        return NextResponse.json({ message: null });
      }
    }

    const savedConvId = lastMessage?.conversationId || null;
    if (savedConvId) {
      const recentProactive = await prisma.messages.findFirst({
        where: {
          conversationId: savedConvId,
          role: 'ASSISTANT',
          createdAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (recentProactive) {
        return NextResponse.json({ message: null });
      }
    }

    const hour = new Date().getUTCHours();
    const goalCount = await prisma.goals.count({
      where: { userId, status: 'ACTIVE' },
    });

    const text = pickStarterForContext(hour, goalCount > 0);

    let convId = lastMessage?.conversationId || null;
    if (!convId) {
      const conv = await prisma.conversations.create({
        data: {
          userId,
          title: 'Conversation',
          updatedAt: new Date(),
        },
      });
      convId = conv.id;
    }

    const msg = await prisma.messages.create({
      data: {
        conversationId: convId,
        userId,
        role: 'ASSISTANT',
        content: text,
      },
    });

    try {
      await redis.setex(`proactive:${userId}:last`, 4 * 60 * 60, msg.id);
    } catch (redisErr) {
      console.warn('[PROACTIVE] Redis set failed (non-critical):', redisErr);
    }

    return NextResponse.json({
      message: {
        id: msg.id,
        role: 'ASSISTANT',
        content: text,
        createdAt: msg.createdAt.toISOString(),
      },
      conversationId: convId,
    });
  } catch (error) {
    console.error('[PROACTIVE] Error:', error);
    return NextResponse.json({ message: null });
  }
}