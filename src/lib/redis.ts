import { Redis } from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL;

  if (!url) {
    console.warn('REDIS_URL not set, using default localhost:6379');
    return new Redis({
      host: 'localhost',
      port: 6379,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
  }

  if (url.startsWith('rediss://') || url.startsWith('redis://')) {
    return new Redis(url, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      keepAlive: 30000,
    });
  }

  const [host, port] = url.split(':');
  return new Redis({
    host: host || 'localhost',
    port: parseInt(port || '6379'),
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

// Redis key helpers - all scoped by user_id for sharding alignment
export const redisKeys = {
  session: (token: string) => `session:${token}`,
  userSessions: (userId: string) => `user:${userId}:sessions`,
  deviceTrust: (deviceId: string) => `device:${deviceId}:trust`,
  rateLimit: (key: string) => `ratelimit:${key}`,
  userContext: (userId: string) => `context:${userId}`,
  conversationContext: (conversationId: string) => `conv:${conversationId}:context`,
  notificationBudget: (userId: string) => `notify:${userId}:budget`,
  exportJob: (jobId: string) => `export:${jobId}`,
  cache: (key: string) => `cache:${key}`,
  metrics: (metric: string) => `metrics:${metric}`,
  health: (service: string) => `health:${service}`,
  jobQueue: (queue: string) => `queue:${queue}`,
  userRateLimit: (userId: string, action: string) => `ratelimit:${userId}:${action}`,
};

export async function storeSession(token: string, userId: string, expiresAt: Date): Promise<void> {
  const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  await redis.setex(redisKeys.session(token), ttl, JSON.stringify({ userId, expiresAt: expiresAt.toISOString() }));
  await redis.sadd(redisKeys.userSessions(userId), token);
}

export async function getSession(token: string): Promise<{ userId: string; expiresAt: string } | null> {
  const data = await redis.get(redisKeys.session(token));
  if (!data) return null;
  return JSON.parse(data);
}

export async function revokeSession(token: string): Promise<void> {
  const session = await getSession(token);
  if (session) {
    await redis.del(redisKeys.session(token));
    await redis.srem(redisKeys.userSessions(session.userId), token);
  }
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  const tokens = await redis.smembers(redisKeys.userSessions(userId));
  if (tokens.length > 0) {
    const pipeline = redis.pipeline();
    tokens.forEach((token) => pipeline.del(redisKeys.session(token)));
    pipeline.del(redisKeys.userSessions(userId));
    await pipeline.exec();
  }
}

export async function checkRedisHealth(): Promise<{ healthy: boolean; latency: number }> {
  const start = Date.now();
  try {
    await redis.ping();
    return { healthy: true, latency: Date.now() - start };
  } catch {
    return { healthy: false, latency: Date.now() - start };
  }
}