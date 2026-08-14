import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/error-handler';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await prisma.research_sessions.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userId: true,
        status: true,
        objective: true,
        depth: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        recommendation: true,
        personalInterpretation: true,
        _count: {
          select: { sources: true, findings: true, contradictions: true },
        },
      },
    });

    if (!session || session.userId !== token.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: session.id,
      status: session.status,
      objective: session.objective,
      depth: session.depth,
      progress: {
        sources: session._count.sources,
        findings: session._count.findings,
        contradictions: session._count.contradictions,
      },
      completedAt: session.completedAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}