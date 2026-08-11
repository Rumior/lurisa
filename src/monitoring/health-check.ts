import { prisma, checkDatabaseHealth } from '../lib/db';
import { redis } from '../lib/redis';
import { register, collectDefaultMetrics, Gauge, Histogram } from 'prom-client';

// Collect default Node.js metrics
collectDefaultMetrics();

// Custom metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
});

const activeUsers = new Gauge({
  name: 'lurisa_active_users',
  help: 'Number of active users in the last hour',
});

const memoryCount = new Gauge({
  name: 'lurisa_total_memories',
  help: 'Total number of memories stored',
});

const notificationCount = new Gauge({
  name: 'lurisa_notifications_sent_today',
  help: 'Number of notifications sent today',
});

export { httpRequestDuration, activeUsers, memoryCount, notificationCount };

export async function getHealthStatus(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: string; latency?: number; error?: string }>;
  timestamp: string;
}> {
  const checks: Record<string, any> = {};
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Database check
  const dbHealth = await checkDatabaseHealth();
  checks.database = {
    status: dbHealth.healthy ? 'pass' : 'fail',
    latency: dbHealth.latency,
  };
  if (!dbHealth.healthy) overallStatus = 'unhealthy';

  // Redis check
  const redisStart = Date.now();
  try {
    await redis.ping();
    checks.redis = { status: 'pass', latency: Date.now() - redisStart };
  } catch (error) {
    checks.redis = { status: 'fail', error: 'Redis connection failed' };
    overallStatus = 'unhealthy';
  }

  // Memory usage check
  const memUsage = process.memoryUsage();
  const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  checks.memory = {
    status: memPercent < 90 ? 'pass' : 'warn',
    used: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
    total: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
  };
  if (memPercent > 90) overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;

  return {
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
  };
}

export async function updateSystemMetrics() {
  try {
    // Active users (devices seen in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const activeUserCount = await prisma.devices.count({
      where: { lastSeenAt: { gte: oneHourAgo } },
    });
    activeUsers.set(activeUserCount);

    // Total memories
    const totalMemories = await prisma.memories.count({ where: { status: 'ACTIVE' } });
    memoryCount.set(totalMemories);

    // Notifications today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayNotifications = await prisma.notification_log.count({
      where: { sentAt: { gte: today } },
    });
    notificationCount.set(todayNotifications);
  } catch (error) {
    console.error('Metrics update error:', error);
  }
}
