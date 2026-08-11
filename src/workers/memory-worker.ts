import { Worker } from 'bullmq';
import 'dotenv/config';
import { redis } from '../lib/redis';
import { extractMemoriesFromTurn } from '../lib/memory/extraction';

const memoryWorker = new Worker(
  'memory-queue',
  async (job) => {
    const { userId, conversationId, userMessage, assistantMessage } = job.data;
    console.log(`[Memory Worker] Processing job ${job.id}`);
    await extractMemoriesFromTurn(userId, conversationId, userMessage, assistantMessage);
    return { processed: true };
  },
  { connection: redis }
);

memoryWorker.on('completed', (job) => {
  console.log(`[Memory Worker] Job ${job.id} completed`);
});

memoryWorker.on('failed', (job, err) => {
  console.error(`[Memory Worker] Job ${job?.id} failed:`, err);
});

console.log('[Memory Worker] Started');
