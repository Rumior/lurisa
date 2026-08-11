import { Worker } from 'bullmq';
import 'dotenv/config';
import { redis } from '@/lib/redis';
import { fireDueIntents, expireOldIntents } from '@/lib/follow-up';

const followUpWorker = new Worker(
  'follow-up-queue',
  async (job) => {
    const { action } = job.data as { action: string };

    console.log(`[Follow-Up Worker] Processing job ${job.id}, action: ${action}`);

    switch (action) {
      case 'fire-due': {
        const fired = await fireDueIntents();
        return { fired: fired.length, details: fired };
      }

      case 'expire-old': {
        const expired = await expireOldIntents(2);
        return { expired };
      }

      default:
        throw new Error(`Unknown follow-up action: ${action}`);
    }
  },
  { connection: redis }
);

followUpWorker.on('completed', (job) => {
  console.log(`[Follow-Up Worker] Job ${job.id} completed`);
});

followUpWorker.on('failed', (job, err) => {
  console.error(`[Follow-Up Worker] Job ${job?.id} failed:`, err);
});

console.log('[Follow-Up Worker] Started');
