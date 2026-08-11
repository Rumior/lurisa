import { Worker } from 'bullmq';
import 'dotenv/config';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/db';
import { ConsolidationJobData } from '@/lib/queue';

const consolidationWorker = new Worker<ConsolidationJobData>(
  'consolidation-queue',
  async (job) => {
    const { userId, threshold = 0.3 } = job.data;

    console.log(`[Consolidation Worker] Processing consolidation for user ${userId}`);

    // Find low-importance, old memories to consolidate
    const oldMemories = await prisma.memories.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        importance: { lt: threshold },
        createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // 90 days old
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    if (oldMemories.length < 5) {
      console.log(`[Consolidation Worker] Not enough old memories for user ${userId}`);
      return { consolidated: 0 };
    }

    // Group by category and create summary memories
    const byCategory = oldMemories.reduce((acc, mem) => {
      acc[mem.category] = acc[mem.category] || [];
      acc[mem.category].push(mem);
      return acc;
    }, {} as Record<string, typeof oldMemories>);

    let consolidatedCount = 0;

    for (const [category, memories] of Object.entries(byCategory)) {
      if (memories.length < 3) continue;

      // Mark individual memories as archived
      await prisma.memories.updateMany({
        where: { id: { in: memories.map(m => m.id) } },
        data: { status: 'ARCHIVED' },
      });

      // Create summary memory
      await prisma.memories.create({
        data: {
          userId,
          category: category as any,
          type: 'STORY',
          statement: `Consolidated ${memories.length} memories from this period: ${memories.map(m => m.statement).join('; ').slice(0, 500)}...`,
          confidence: 0.9,
          importance: 0.4,
          status: 'ACTIVE',
        },
      });

      consolidatedCount += memories.length;
    }

    console.log(`[Consolidation Worker] Consolidated ${consolidatedCount} memories for user ${userId}`);
    return { consolidated: consolidatedCount };
  },
  { connection: redis }
);

consolidationWorker.on('completed', (job) => {
  console.log(`[Consolidation Worker] Job ${job.id} completed`);
});

consolidationWorker.on('failed', (job, err) => {
  console.error(`[Consolidation Worker] Job ${job?.id} failed:`, err);
});

console.log('[Consolidation Worker] Started');
