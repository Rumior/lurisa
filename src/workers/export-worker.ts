import { Worker } from 'bullmq';
import 'dotenv/config';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/db';
import { ExportJobData } from '@/lib/queue';

const exportWorker = new Worker<ExportJobData>(
  'export-queue',
  async (job) => {
    const { userId, jobId, format } = job.data;

    console.log(`[Export Worker] Processing export ${jobId} for user ${userId}`);

    // Fetch all user data
    const [memories, conversations, goals, timelineEvents] = await Promise.all([
      prisma.memories.findMany({ where: { userId, status: { not: 'DELETED' } } }),
      prisma.conversations.findMany({
        where: { userId },
        include: { messages: true },
      }),
      prisma.goals.findMany({ where: { userId } }),
      prisma.timeline_events.findMany({ where: { userId } }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId,
      format,
      memories,
      conversations,
      goals,
      timelineEvents,
    };

    // Store in Redis with 24-hour expiry
    await redis.setex(`export:${jobId}`, 86400, JSON.stringify(exportData));

    console.log(`[Export Worker] Export ${jobId} completed`);

    return { jobId, status: 'completed' };
  },
  { connection: redis }
);

exportWorker.on('completed', (job) => {
  console.log(`[Export Worker] Job ${job.id} completed`);
});

exportWorker.on('failed', (job, err) => {
  console.error(`[Export Worker] Job ${job?.id} failed:`, err);
});

console.log('[Export Worker] Started');
