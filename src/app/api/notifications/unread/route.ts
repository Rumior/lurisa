import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ count: 0 });
    }

    const count = await prisma.notification_log.count({
      where: {
        userId: session.user.id,
        readAt: null,
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Unread count error:', error);
    return NextResponse.json({ count: 0 });
  }
}
