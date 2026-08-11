import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isAdmin } from '@/lib/admin';
import { checkDatabaseHealth } from '@/lib/db';
import { checkRedisHealth } from '@/lib/redis';
import { checkQueueHealth } from '@/lib/queue';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id || !(await isAdmin(token.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [db, redis, queues] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
      checkQueueHealth(),
    ]);

    const status = db.healthy && redis.healthy && queues.healthy ? 200 : 503;

    return NextResponse.json(
      {
        status: status === 200 ? 'healthy' : 'degraded',
        services: { database: db, redis, queues },
        timestamp: new Date().toISOString(),
      },
      { status }
    );
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: String(error), timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
