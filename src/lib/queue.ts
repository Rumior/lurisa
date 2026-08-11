import { Queue } from 'bullmq';
import { redis } from './redis';

const connection = redis;

export const exportQueue = new Queue('export-queue', { connection });
export const consolidationQueue = new Queue('consolidation-queue', { connection });
export const notificationQueue = new Queue('notification-queue', { connection });
export const memoryQueue = new Queue('memory-queue', { connection });
export const followUpQueue = new Queue('follow-up-queue', { connection });

export type ExportJobData = {
  userId: string;
  jobId: string;
  format: 'json' | 'csv';
};

export type ConsolidationJobData = {
  userId: string;
  threshold?: number;
};

export type NotificationJobData = {
  userId: string;
  type: 'daily-rhythm' | 'fire-intents' | 'send-notification';
  payload: Record<string, unknown>;
};

export type FollowUpJobData = {
  action: 'fire-due' | 'expire-old';
};

export async function addExportJob(data: ExportJobData): Promise<string> {
  const job = await exportQueue.add('export-data', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  });
  return job.id!;
}

export async function addConsolidationJob(data: ConsolidationJobData): Promise<string> {
  const job = await consolidationQueue.add('consolidate-memories', data, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10000 },
    removeOnComplete: { age: 3600 },
  });
  return job.id!;
}

export async function addNotificationJob(data: NotificationJobData): Promise<string> {
  const job = await notificationQueue.add('send-notification', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30000 },
    delay: data.payload.scheduledAt ? new Date(data.payload.scheduledAt as string).getTime() - Date.now() : 0,
  });
  return job.id!;
}

export async function addFollowUpJob(data: FollowUpJobData): Promise<string> {
  const job = await followUpQueue.add(data.action, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600 },
  });
  return job.id!;
}

export async function checkQueueHealth(): Promise<{ healthy: boolean; queues: Record<string, number> }> {
  try {
    const [exportCount, consolidationCount, notificationCount, memoryCount, followUpCount] = await Promise.all([
      exportQueue.getWaitingCount(),
      consolidationQueue.getWaitingCount(),
      notificationQueue.getWaitingCount(),
      memoryQueue.getWaitingCount(),
      followUpQueue.getWaitingCount(),
    ]);

    return {
      healthy: true,
      queues: {
        export: exportCount,
        consolidation: consolidationCount,
        notification: notificationCount,
        memory: memoryCount,
        followUp: followUpCount,
      },
    };
  } catch {
    return { healthy: false, queues: {} };
  }
}
