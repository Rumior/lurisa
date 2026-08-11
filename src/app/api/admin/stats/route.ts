import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isAdmin, getSystemStats } from '@/lib/admin';
import { checkDatabaseHealth } from '@/lib/db';
import { checkRedisHealth } from '@/lib/redis';
import { checkQueueHealth } from '@/lib/queue';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id || !(await isAdmin(token.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [stats, dbHealth, redisHealth, queueHealth] = await Promise.all([
      getSystemStats(),
      checkDatabaseHealth(),
      checkRedisHealth(),
      checkQueueHealth(),
    ]);

    return NextResponse.json({
      stats,
      health: {
        database: dbHealth,
        redis: redisHealth,
        queues: queueHealth,
        overall: dbHealth.healthy && redisHealth.healthy && queueHealth.healthy,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
