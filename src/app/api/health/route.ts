import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db';
import { checkRedisHealth } from '@/lib/redis';

export async function GET() {
  try {
    const [db, redis] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);

    const healthy = db.healthy && redis.healthy;

    return NextResponse.json(
      {
        status: healthy ? 'healthy' : 'degraded',
        version: '1.5.0',
        services: {
          database: { healthy: db.healthy, latency: db.latency },
          redis: { healthy: redis.healthy, latency: redis.latency },
        },
        timestamp: new Date().toISOString(),
      },
      { status: healthy ? 200 : 503 }
    );
  } catch {
    return NextResponse.json(
      { status: 'unhealthy', timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
