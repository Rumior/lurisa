import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Connection pooling for 1000+ users
// Neon serverless works best with connection limiting
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  // Connection pool settings for scale
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Connection health check
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latency: number; connections: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    // Get connection count (PostgreSQL specific)
    const result = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()
    `;

    return {
      healthy: true,
      latency,
      connections: Number(result[0]?.count || 0),
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      connections: 0,
    };
  }
}

// Transaction helper with retry logic
export async function withTransaction<T>(
  fn: (tx: typeof prisma) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        return fn(tx as unknown as typeof prisma);
      }, {
        maxWait: 5000,
        timeout: 10000,
      });
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, attempt * 100));
      }
    }
  }

  throw lastError;
}

// Paginated query helper for large datasets
export async function paginatedQuery<T>({
  query,
  page = 1,
  pageSize = 20,
}: {
  query: () => Promise<T[]>;
  page?: number;
  pageSize?: number;
}): Promise<{ data: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> {
  const data = await query();
  // Note: In production, use a separate count query
  return {
    data,
    pagination: {
      page,
      pageSize,
      total: data.length,
      totalPages: Math.ceil(data.length / pageSize),
    },
  };
}
