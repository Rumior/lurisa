import { redis, redisKeys } from './redis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 100,
};

export async function rateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const { windowMs, maxRequests } = { ...DEFAULT_CONFIG, ...config };
  const key = redisKeys.rateLimit(identifier);
  const now = Date.now();
  const windowStart = now - windowMs;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zcard(key);
  pipeline.zadd(key, now, `${now}-${Math.random()}`);
  pipeline.pexpire(key, windowMs);

  const results = await pipeline.exec();
  if (!results) {
    return { success: false, limit: maxRequests, remaining: 0, reset: now + windowMs };
  }

  const currentCount = (results[1][1] as number) || 0;
  const success = currentCount < maxRequests;

  return {
    success,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - currentCount - 1),
    reset: now + windowMs,
  };
}

// Tiered rate limiting for different user types
export const authRateLimit = {
  login: (identifier: string) => rateLimit(`auth:login:${identifier}`, { windowMs: 15 * 60 * 1000, maxRequests: 5 }),
  register: (identifier: string) => rateLimit(`auth:register:${identifier}`, { windowMs: 60 * 60 * 1000, maxRequests: 3 }),
  mfa: (identifier: string) => rateLimit(`auth:mfa:${identifier}`, { windowMs: 5 * 60 * 1000, maxRequests: 3 }),
  api: (userId: string) => rateLimit(`api:${userId}`, { windowMs: 60 * 1000, maxRequests: 120 }),
  // Stage 5: Stricter limits for expensive operations
  export: (userId: string) => rateLimit(`export:${userId}`, { windowMs: 60 * 60 * 1000, maxRequests: 3 }),
  delete: (userId: string) => rateLimit(`delete:${userId}`, { windowMs: 24 * 60 * 60 * 1000, maxRequests: 1 }),
  chat: (userId: string) => rateLimit(`chat:${userId}`, { windowMs: 60 * 1000, maxRequests: 30 }),
  memoryCreate: (userId: string) => rateLimit(`mem:create:${userId}`, { windowMs: 60 * 1000, maxRequests: 60 }),
};

// Global rate limit for unauthenticated requests
export async function globalRateLimit(ip: string): Promise<boolean> {
  const result = await rateLimit(`global:${ip}`, { windowMs: 60 * 1000, maxRequests: 200 });
  return result.success;
}
