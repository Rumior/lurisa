import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';
import { authRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = await authRateLimit.api(token.id);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const user = await prisma.users.findUnique({
      where: { id: token.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        consentGiven: true,
        memoryPaused: true,
        dataRetentionDays: true,
        _count: {
          select: {
            memories: true,
            conversations: true,
            goals: true,
            devices: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, memoryPaused, dataRetentionDays } = body;

    const user = await prisma.users.update({
      where: { id: token.id },
      data: {
        ...(name && { name }),
        ...(typeof memoryPaused === 'boolean' && { memoryPaused }),
        ...(dataRetentionDays && { dataRetentionDays }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        memoryPaused: true,
        dataRetentionDays: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
