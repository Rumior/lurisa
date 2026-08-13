/**
 * Daily Rhythm Engine — Initiative-Scored (Spec §11)
 * Morning check-in and evening reflection now use formal initiative scoring.
 * Time windows define WHEN to evaluate; the score decides IF to send.
 */

import { prisma } from '@/lib/db';
import { redis, redisKeys } from '@/lib/redis';
import { checkNotificationBudget, incrementNotificationBudget } from '@/lib/follow-up';
import {
  calculateInitiativeScore,
  shouldInitiate,
  buildMorningCheckInContext,
  buildEveningReflectionContext,
} from '@/lib/initiative/score-engine';
import { getUserPersonality } from '@/lib/memory/context';

const MORNING_HOUR = 8;   // 8 AM local time
const EVENING_HOUR = 20;  // 8 PM local time
const MORNING_WINDOW_MINUTES = 60;
const EVENING_WINDOW_MINUTES = 60;

interface DailyRhythmResult {
  sent: number;
  skipped: number;
  reasons: string[];
}

/**
 * Process daily rhythm for all users using initiative scoring.
 * Called by the hourly cron job.
 */
export async function processDailyRhythm(): Promise<DailyRhythmResult> {
  const now = new Date();
  const result: DailyRhythmResult = { sent: 0, skipped: 0, reasons: [] };

  const users = await prisma.users.findMany({
    where: { memoryPaused: false },
    select: { id: true, name: true, createdAt: true },
    take: 500,
  });

  for (const user of users) {
    try {
      const userLocalHour = getUserLocalHour(user.id, now);
      const hoursSinceContact = await getHoursSinceLastContact(user.id);
      const proactivity = await getUserProactivity(user.id);

      // ── MORNING CHECK-IN ──
      if (userLocalHour === MORNING_HOUR) {
        const alreadySent = await wasSentToday(user.id, 'MORNING_CHECKIN');
        if (!alreadySent) {
          const budget = await checkNotificationBudget(user.id);
          if (!budget.canSend) {
            result.skipped++;
            result.reasons.push(`User ${user.id}: morning budget exhausted`);
            continue;
          }

          // Calculate initiative score
          const ctx = buildMorningCheckInContext(hoursSinceContact, proactivity);
          const score = calculateInitiativeScore(ctx);

          if (shouldInitiate(score, 0.5)) {
            await sendMorningCheckIn(user.id, user.name);
            result.sent++;
          } else {
            result.skipped++;
            result.reasons.push(
              `User ${user.id}: morning score ${score} below threshold (hoursSince=${hoursSinceContact.toFixed(1)}, proactivity=${proactivity})`
            );
          }
        }
      }

      // ── EVENING REFLECTION ──
      if (userLocalHour === EVENING_HOUR) {
        const alreadySent = await wasSentToday(user.id, 'EVENING_REFLECTION');
        if (!alreadySent) {
          const budget = await checkNotificationBudget(user.id);
          if (!budget.canSend) {
            result.skipped++;
            result.reasons.push(`User ${user.id}: evening budget exhausted`);
            continue;
          }

          // Calculate initiative score
          const ctx = buildEveningReflectionContext(hoursSinceContact, proactivity);
          const score = calculateInitiativeScore(ctx);

          if (shouldInitiate(score, 0.45)) {
            await sendEveningReflection(user.id, user.name);
            result.sent++;
          } else {
            result.skipped++;
            result.reasons.push(
              `User ${user.id}: evening score ${score} below threshold (hoursSince=${hoursSinceContact.toFixed(1)}, proactivity=${proactivity})`
            );
          }
        }
      }
    } catch (err) {
      console.error(`[DAILY RHYTHM] Failed for user ${user.id}:`, err);
      result.skipped++;
      result.reasons.push(`User ${user.id}: error — ${(err as Error).message}`);
    }
  }

  return result;
}

// ── Helpers ──

async function getHoursSinceLastContact(userId: string): Promise<number> {
  const lastMessage = await prisma.messages.findFirst({
    where: { userId, role: 'USER' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  if (!lastMessage) return 48; // New user — high score encourages engagement
  return (Date.now() - lastMessage.createdAt.getTime()) / (1000 * 60 * 60);
}

async function getUserProactivity(userId: string): Promise<number> {
  try {
    const personality = await getUserPersonality(userId);
    return personality.proactivity;
  } catch {
    return 0.6; // Default: moderately proactive
  }
}

function getUserLocalHour(userId: string, utcDate: Date): number {
  return utcDate.getUTCHours();
}

async function wasSentToday(userId: string, type: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const key = `rhythm:${userId}:${today}:${type}`;
  const exists = await redis.exists(key);
  return exists === 1;
}

async function markSentToday(userId: string, type: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = `rhythm:${userId}:${today}:${type}`;
  await redis.setex(key, 24 * 60 * 60, '1');
}

// ── Senders (unchanged logic, just wrapped) ──

async function sendMorningCheckIn(userId: string, userName: string | null): Promise<void> {
  const recentMemories = await prisma.memories.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { importance: 'desc' },
    take: 3,
    select: { statement: true, category: true },
  });

  const hasGoals = await prisma.goals.count({
    where: { userId, status: 'ACTIVE' },
  });

  let body = 'Good morning';
  if (userName) body += `, ${userName}`;
  body += '. ';

  if (recentMemories.length > 0) {
    const mem = recentMemories[0];
    body += `You mentioned ${mem.statement.toLowerCase()}. `;
  }

  if (hasGoals > 0) {
    body += "What's one small step toward your goals today?";
  } else {
    body += "What's one thing you're looking forward to today?";
  }

  await prisma.notification_log.create({
    data: {
      userId,
      type: 'MORNING_CHECKIN',
      title: 'Good morning ☀️',
      body,
    },
  });

  await incrementNotificationBudget(userId);
  await markSentToday(userId, 'MORNING_CHECKIN');

  console.log(`[DAILY RHYTHM] Morning check-in sent to ${userId}`);
}

async function sendEveningReflection(userId: string, userName: string | null): Promise<void> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayMemories = await prisma.memories.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      createdAt: { gte: todayStart },
    },
    orderBy: { importance: 'desc' },
    take: 5,
    select: { statement: true, category: true },
  });

  const goalCount = await prisma.goals.count({
    where: { userId, status: 'ACTIVE' },
  });

  let body = '';
  if (userName) body += `Hi ${userName}. `;

  if (todayMemories.length > 0) {
    const positiveMemories = todayMemories.filter(m =>
      m.category === 'ACHIEVEMENTS' || m.category === 'GOALS'
    );
    if (positiveMemories.length > 0) {
      body += `Today you ${positiveMemories[0].statement.toLowerCase()}. `;
    }
  }

  body += "As you wind down, what's one thing from today worth remembering?";

  if (goalCount > 0) {
    body += " And did you make any progress on your goals?";
  }

  await prisma.notification_log.create({
    data: {
      userId,
      type: 'EVENING_REFLECTION',
      title: 'Evening reflection 🌙',
      body,
    },
  });

  await incrementNotificationBudget(userId);
  await markSentToday(userId, 'EVENING_REFLECTION');

  console.log(`[DAILY RHYTHM] Evening reflection sent to ${userId}`);
}

export async function getTodayNotifications(userId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return prisma.notification_log.findMany({
    where: {
      userId,
      sentAt: { gte: todayStart },
    },
    orderBy: { sentAt: 'desc' },
  });
}
