import { register, Counter, Histogram, Gauge } from 'prom-client';

// Initialize default metrics
register.setDefaultLabels({ app: 'lurisa' });

// Custom metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of currently active users',
});

export const memoryOperationsTotal = new Counter({
  name: 'memory_operations_total',
  help: 'Total memory operations',
  labelNames: ['operation', 'status'],
});

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['table', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
});

export const redisOperationDuration = new Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05],
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeUsers);
register.registerMetric(memoryOperationsTotal);
register.registerMetric(dbQueryDuration);
register.registerMetric(redisOperationDuration);

export { register };

// Helper to time async operations
export async function timed<T>(
  metric: Histogram<string>,
  labels: Record<string, string>,
  fn: () => Promise<T>
): Promise<T> {
  const end = metric.startTimer();
  try {
    const result = await fn();
    end(labels);
    return result;
  } catch (error) {
    end({ ...labels, status: 'error' });
    throw error;
  }
}
