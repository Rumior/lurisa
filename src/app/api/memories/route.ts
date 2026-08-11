import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');

    const where: any = {
      userId: token.id,
      status: 'ACTIVE',
    };

    if (conversationId) {
      where.sourceConversationId = conversationId;
    }

    const memories = await prisma.memories.findMany({
      where,
      orderBy: [
        { importance: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 50,
    });

    return NextResponse.json({ memories });
  } catch (error) {
    console.error('[MEMORIES API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }
}