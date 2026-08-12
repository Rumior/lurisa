import { redis, redisKeys } from './redis';

interface CacheConfig {
  ttl?: number; // seconds
  tags?: string[];
}

// Edge-ready cache layer
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(redisKeys.cache(key));
    if (!data) return null;
    try {
      return (typeof data === 'string' ? JSON.parse(data) : data) as T;
    } catch {
      return data as unknown as T;
    }
  },

  async set<T>(key: string, value: T, config: CacheConfig = {}): Promise<void> {
    const { ttl = 300 } = config; // Default 5 minutes
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await redis.setex(redisKeys.cache(key), ttl, serialized);

    // Tag the cache entry for invalidation
    if (config.tags) {
      for (const tag of config.tags) {
        await redis.sadd(`cache:tag:${tag}`, redisKeys.cache(key));
      }
    }
  },

  async delete(key: string): Promise<void> {
    await redis.del(redisKeys.cache(key));
  },

  async invalidateTag(tag: string): Promise<void> {
    const keys = await redis.smembers(`cache:tag:${tag}`);
    if (keys.length > 0) {
      await redis.del(...keys);
      await redis.del(`cache:tag:${tag}`);
    }
  },

  async invalidateUser(userId: string): Promise<void> {
    // Invalidate all cache entries for a user
    const pattern = `cache:*${userId}*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};

// Stale-while-revalidate pattern for expensive queries
export async function swr<T>({
  key,
  fetcher,
  ttl = 300,
  staleTtl = 86400,
}: {
  key: string;
  fetcher: () => Promise<T>;
  ttl?: number;
  staleTtl?: number;
}): Promise<T> {
  const cached = await cache.get<T>(key);

  if (cached) {
    // Return cached data immediately, refresh in background if needed
    const ttlRemaining = await redis.ttl(redisKeys.cache(key));
    if (ttlRemaining < 0 || ttlRemaining < ttl * 0.2) {
      // Less than 20% TTL remaining, refresh in background
      fetcher().then((fresh) => cache.set(key, fresh, { ttl: staleTtl })).catch(console.error);
    }
    return cached;
  }

  // Cache miss - fetch and store
  const fresh = await fetcher();
  await cache.set(key, fresh, { ttl });
  return fresh;
}