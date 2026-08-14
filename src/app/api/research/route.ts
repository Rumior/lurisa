import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { executeDeepResearch } from '@/lib/research/engine';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/error-handler';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { query, depth = 'DEEP' } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const session = await executeDeepResearch(token.id, query, query);

    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
      message: 'Research session started',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const sessions = await prisma.research_sessions.findMany({
      where: { userId: token.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        query: true,
        objective: true,
        depth: true,
        status: true,
        createdAt: true,
        completedAt: true,
        recommendation: true,
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    return handleApiError(error);
  }
}