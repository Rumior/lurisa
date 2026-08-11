import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await prisma.notification_log.findMany({
      where: { userId: session.user.id },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json({ notifications: [] });
  }
}
