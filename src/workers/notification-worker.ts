import { Worker } from 'bullmq';
import 'dotenv/config';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/db';
import { fireDueIntents, expireOldIntents } from '@/lib/follow-up';
import { processDailyRhythm } from '@/lib/notifications/daily-rhythm';

const notificationWorker = new Worker(
  'notification-queue',
  async (job) => {
    const { type, payload } = job.data as { type: string; payload: Record<string, unknown> };

    console.log(`[Notification Worker] Processing job ${job.id}, type: ${type}`);

    switch (type) {
      case 'daily-rhythm':
        return await processDailyRhythm();

      case 'fire-intents':
        const fired = await fireDueIntents();
        const expired = await expireOldIntents(2);
        return { fired: fired.length, expired };

      case 'send-notification': {
        const { userId, title, body, notificationType, memoryId, intentId } = payload;
        await prisma.notification_log.create({
          data: {
            userId: userId as string,
            type: (notificationType as any) || 'SYSTEM',
            title: title as string,
            body: body as string,
            memoryId: (memoryId as string) || null,
            intentId: (intentId as string) || null,
          },
        });
        return { sent: true };
      }

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
  },
  { connection: redis }
);

notificationWorker.on('completed', (job) => {
  console.log(`[Notification Worker] Job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`[Notification Worker] Job ${job?.id} failed:`, err);
});

console.log('[Notification Worker] Started');
