import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';
import { fireDueIntents, expireOldIntents } from '@/lib/follow-up';
import { handleApiError } from '@/lib/error-handler';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'AUTH_REQUIRED', status: 401 } },
        { status: 401 }
      );
    }

    const intents = await prisma.scheduled_intents.findMany({
      where: { userId: token.id },
      orderBy: { triggerAt: 'asc' },
      include: {
        memories: { select: { statement: true, category: true, type: true, importance: true } },
      },
    });

    return NextResponse.json({ intents });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'AUTH_REQUIRED', status: 401 } },
        { status: 401 }
      );
    }

    const [fired, expired] = await Promise.all([
      fireDueIntents(),
      expireOldIntents(2),
    ]);

    return NextResponse.json({
      fired: fired.length,
      expired,
      details: fired,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
