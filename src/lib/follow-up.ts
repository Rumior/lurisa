import { prisma } from './db';
import { redis, redisKeys } from './redis';
import { generateStructuredResponse } from './llm/gateway';
import {
  calculateInitiativeScore,
  shouldInitiate,
  buildFollowUpContext,
  buildAnniversaryContext,
  buildMorningCheckInContext,
} from '@/lib/initiative/score-engine';
import { getUserPersonality } from '@/lib/memory/context';

interface IntentCreationParams {
  userId: string;
  sourceMemoryId: string;
  triggerType: 'DATE' | 'RELATIVE' | 'RECURRENCE';
  triggerAt: Date;
  actionType: string;
  expectsResponse: boolean;
  recurrenceRule?: string;
}

export async function createScheduledIntent(params: IntentCreationParams): Promise<string> {
  const intent = await prisma.scheduled_intents.create({
    data: {
      userId: params.userId,
      sourceMemoryId: params.sourceMemoryId,
      triggerType: params.triggerType,
      triggerAt: params.triggerAt,
      actionType: params.actionType as any,
      expectsResponse: params.expectsResponse,
      recurrenceRule: params.recurrenceRule,
      status: 'PENDING',
    },
  });
  await redis.zadd(
    redisKeys.cache(`intents:${params.userId}`),
    params.triggerAt.getTime(),
    intent.id
  );
  return intent.id;
}

export async function checkPendingIntents(userId: string): Promise<Array<any>> {
  return prisma.scheduled_intents.findMany({
    where: {
      userId,
      status: { in: ['PENDING', 'FIRED'] },
      expectsResponse: true,
    },
    orderBy: { triggerAt: 'asc' },
    take: 5,
    include: {
      memories: { select: { statement: true, category: true, type: true, importance: true } },
    },
  });
}

interface IntentMatchResult {
  matched: boolean;
  intentId?: string;
  action?: string;
  outcome?: {
    whatHappened: string;
    sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    loopClosed: boolean;
  };
}

export async function matchIntentToMessage(
  userId: string,
  message: string,
  conversationId: string
): Promise<IntentMatchResult> {
  const pendingIntents = await checkPendingIntents(userId);
  if (pendingIntents.length === 0) return { matched: false };

  if (pendingIntents.length === 1) {
    const intent = pendingIntents[0];
    const match = await keywordMatchIntent(intent, message, conversationId);
    if (match.matched) return match;
    return { matched: false };
  }

  const llmMatch = await llmDisambiguateIntent(pendingIntents, message, conversationId);
  return llmMatch;
}

async function keywordMatchIntent(
  intent: any,
  message: string,
  conversationId: string
): Promise<IntentMatchResult> {
  const messageLower = message.toLowerCase();
  const sourceStatement = intent.memories?.statement?.toLowerCase() || '';
  const keywords = sourceStatement.split(/\s+/).filter((w: string) => w.length > 4);
  const matches = keywords.filter((k: string) => messageLower.includes(k)).length;

  if (matches > 0) {
    return await resolveIntent(intent, message, conversationId);
  }

  return { matched: false };
}

async function llmDisambiguateIntent(
  intents: any[],
  message: string,
  conversationId: string
): Promise<IntentMatchResult> {
  const systemPrompt = `You are an intent-resolution classifier for a personal AI companion.
Your job: determine if the user's latest message is a response to any of their pending follow-ups.

Return JSON with this exact shape:
{
  "isResponse": true/false,
  "intentIndex": 0-based index of the matching intent, or -1 if none,
  "whatHappened": "brief description of what the user is reporting",
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "loopClosed": true/false
}`;

  const userPrompt = `PENDING FOLLOW-UPS:
${intents.map((intent, i) => `${i}. [${intent.actionType}] About: ${intent.memories?.statement || 'unknown'}`).join('\n')}

USER'S LATEST MESSAGE:
"${message}"

Is this message a response to any of the pending follow-ups?`;

  const result = await generateStructuredResponse<{
    isResponse: boolean;
    intentIndex: number;
    whatHappened: string;
    sentiment: string;
    loopClosed: boolean;
  }>(systemPrompt, userPrompt, { maxTokens: 200, temperature: 0.1 });

  if (!result || !result.isResponse || result.intentIndex < 0 || result.intentIndex >= intents.length) {
    return { matched: false };
  }

  const matchedIntent = intents[result.intentIndex];
  return await resolveIntent(matchedIntent, message, conversationId, {
    whatHappened: result.whatHappened,
    sentiment: result.sentiment as any,
    loopClosed: result.loopClosed,
  });
}

async function resolveIntent(
  intent: any,
  message: string,
  conversationId: string,
  llmOutcome?: { whatHappened: string; sentiment: string; loopClosed: boolean }
): Promise<IntentMatchResult> {
  await prisma.scheduled_intents.update({
    where: { id: intent.id },
    data: {
      status: 'RESOLVED',
      resolvedByMessageId: conversationId,
      resolvedAt: new Date(),
    },
  });

  const outcome = llmOutcome || await extractOutcomeFromMessage(message);

  await prisma.memories.create({
    data: {
      userId: intent.userId,
      category: 'TIMELINE',
      type: 'STORY',
      statement: outcome.whatHappened || `Follow-up resolved: ${intent.memories?.statement}`,
      confidence: 0.8,
      importance: intent.memories?.importance > 0.6 ? 0.75 : 0.5,
      sourceConversationId: conversationId,
    },
  });

  if (intent.memories?.importance > 0.6 || outcome.sentiment === 'positive') {
    await prisma.timeline_events.create({
      data: {
        userId: intent.userId,
        title: intent.memories?.statement?.slice(0, 80) || 'Follow-up resolved',
        description: outcome.whatHappened,
        eventType: 'MILESTONE',
        eventDate: new Date(),
        importance: intent.memories?.importance || 0.5,
      },
    });
  }

  return {
    matched: true,
    intentId: intent.id,
    action: intent.actionType,
    outcome: {
      whatHappened: outcome.whatHappened,
      sentiment: outcome.sentiment as 'positive' | 'negative' | 'neutral' | 'mixed',
      loopClosed: outcome.loopClosed,
    },
  };
}

async function extractOutcomeFromMessage(message: string): Promise<{
  whatHappened: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  loopClosed: boolean;
}> {
  const systemPrompt = `Extract what happened and the sentiment from the user's message.
Return JSON: {"whatHappened": "...", "sentiment": "positive|negative|neutral|mixed", "loopClosed": true/false}`;

  const result = await generateStructuredResponse<{
    whatHappened: string;
    sentiment: string;
    loopClosed: boolean;
  }>(systemPrompt, message, { maxTokens: 150, temperature: 0.2 });

  if (!result) {
    return { whatHappened: message.slice(0, 200), sentiment: 'neutral', loopClosed: true };
  }

  return {
    whatHappened: result.whatHappened || message.slice(0, 200),
    sentiment: (result.sentiment as any) || 'neutral',
    loopClosed: result.loopClosed ?? true,
  };
}

export async function fireDueIntents(): Promise<Array<{ userId: string; intentId: string; actionType: string; score: number; reason?: string }>> {
  const now = new Date();
  const dueIntents = await prisma.scheduled_intents.findMany({
    where: { status: 'PENDING', triggerAt: { lte: now } },
    take: 100,
    include: { memories: { select: { statement: true, importance: true, category: true } } },
  });

  const fired: Array<{ userId: string; intentId: string; actionType: string; score: number; reason?: string }> = [];

  for (const intent of dueIntents) {
    const budget = await checkNotificationBudget(intent.userId);
    if (!budget.canSend) {
      console.log('[FOLLOW-UP] Budget exhausted, skipping intent', intent.id);
      continue;
    }

    if (intent.actionType === 'MORNING_ENCOURAGEMENT') {
      const alreadySent = await wasMorningSentToday(intent.userId);
      if (alreadySent) {
        console.log(`[FOLLOW-UP] Morning already sent via daily rhythm, skipping intent ${intent.id}`);
        fired.push({
          userId: intent.userId,
          intentId: intent.id,
          actionType: intent.actionType,
          score: 0,
          reason: 'morning already sent via daily rhythm',
        });
        continue;
      }
    }

    const hoursSinceContact = await getHoursSinceLastContact(intent.userId);
    const proactivity = await getUserProactivity(intent.userId);
    const memoryImportance = intent.memories?.importance || 0.5;

    let score = 0;
    let threshold = 0.55;

    switch (intent.actionType) {
      case 'CHECK_IN_QUESTION':
      case 'GOAL_REMINDER': {
        const ctx = buildFollowUpContext(memoryImportance, hoursSinceContact, proactivity);
        score = calculateInitiativeScore(ctx);
        threshold = 0.55;
        break;
      }
      case 'ANNIVERSARY_NOTE': {
        const ctx = buildAnniversaryContext(hoursSinceContact, proactivity);
        score = calculateInitiativeScore(ctx);
        threshold = 0.5;
        break;
      }
      case 'MORNING_ENCOURAGEMENT': {
        const ctx = buildMorningCheckInContext(hoursSinceContact, proactivity);
        score = calculateInitiativeScore(ctx);
        threshold = 0.5;
        break;
      }
      default: {
        score = 0.6;
        threshold = 0.5;
      }
    }

    if (!shouldInitiate(score, threshold)) {
      console.log(`[FOLLOW-UP] Score ${score} below threshold ${threshold}, staying silent for intent ${intent.id}`);
      fired.push({
        userId: intent.userId,
        intentId: intent.id,
        actionType: intent.actionType,
        score,
        reason: `score ${score} < threshold ${threshold}`,
      });
      continue;
    }

    await prisma.scheduled_intents.update({
      where: { id: intent.id },
      data: { status: 'FIRED', firedAt: now },
    });

    await incrementNotificationBudget(intent.userId);

    await prisma.notification_log.create({
      data: {
        userId: intent.userId,
        type: mapActionToNotificationType(intent.actionType),
        title: buildNotificationTitle(intent),
        body: buildNotificationBody(intent),
        memoryId: intent.sourceMemoryId,
        intentId: intent.id,
      },
    });

    fired.push({ userId: intent.userId, intentId: intent.id, actionType: intent.actionType, score });
    console.log(`[FOLLOW-UP] Fired intent ${intent.id} with score ${score}`);

    if (intent.recurrenceRule === 'ANNUAL') {
      const nextYear = new Date(intent.triggerAt);
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      const yearCount = await prisma.scheduled_intents.count({
        where: { sourceMemoryId: intent.sourceMemoryId, recurrenceRule: 'ANNUAL' },
      });

      if (yearCount < 15) {
        await prisma.scheduled_intents.create({
          data: {
            userId: intent.userId,
            sourceMemoryId: intent.sourceMemoryId,
            triggerType: 'RECURRENCE',
            triggerAt: nextYear,
            actionType: 'ANNIVERSARY_NOTE',
            expectsResponse: false,
            recurrenceRule: 'ANNUAL',
            status: 'PENDING',
          },
        });
      }
    }
  }

  return fired;
}

async function wasMorningSentToday(userId: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const count = await prisma.notification_log.count({
    where: {
      userId,
      type: 'MORNING_CHECKIN',
      sentAt: { gte: todayStart },
    },
  });
  return count > 0;
}

async function getHoursSinceLastContact(userId: string): Promise<number> {
  const lastMessage = await prisma.messages.findFirst({
    where: { userId, role: 'USER' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  if (!lastMessage) return 48;
  return (Date.now() - lastMessage.createdAt.getTime()) / (1000 * 60 * 60);
}

async function getUserProactivity(userId: string): Promise<number> {
  try {
    const personality = await getUserPersonality(userId);
    return personality.proactivity;
  } catch {
    return 0.6;
  }
}

function mapActionToNotificationType(actionType: string): any {
  switch (actionType) {
    case 'MORNING_ENCOURAGEMENT': return 'MORNING_CHECKIN';
    case 'REFLECTION_PROMPT': return 'EVENING_REFLECTION';
    case 'CHECK_IN_QUESTION': return 'FOLLOW_UP';
    case 'ANNIVERSARY_NOTE': return 'ANNIVERSARY';
    case 'GOAL_REMINDER': return 'MILESTONE';
    default: return 'SYSTEM';
  }
}

function buildNotificationTitle(intent: any): string {
  switch (intent.actionType) {
    case 'MORNING_ENCOURAGEMENT': return 'Good morning \u2600\uFE0F';
    case 'CHECK_IN_QUESTION': return 'How did it go?';
    case 'ANNIVERSARY_NOTE': return 'A year ago today';
    case 'GOAL_REMINDER': return 'Tomorrow is the day';
    default: return 'lurisa';
  }
}

function buildNotificationBody(intent: any): string {
  const stmt = intent.memories?.statement || 'something important';
  switch (intent.actionType) {
    case 'MORNING_ENCOURAGEMENT': return `You mentioned ${stmt.toLowerCase()}. You've got this.`;
    case 'CHECK_IN_QUESTION': return `You said ${stmt.toLowerCase()}. How did it go?`;
    case 'ANNIVERSARY_NOTE': return `A year ago: ${stmt}`;
    case 'GOAL_REMINDER': return `Just a heads up — ${stmt.toLowerCase()} is tomorrow.`;
    default: return stmt;
  }
}

export async function expireOldIntents(daysOld: number = 2): Promise<number> {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  const result = await prisma.scheduled_intents.updateMany({
    where: {
      status: 'FIRED',
      firedAt: { lt: cutoff },
      expectsResponse: true,
      resolvedAt: null,
    },
    data: { status: 'EXPIRED', expiredAt: new Date() },
  });

  console.log(`[FOLLOW-UP] Expired ${result.count} old intents`);
  return result.count;
}

export async function checkNotificationBudget(userId: string): Promise<{ canSend: boolean; remaining: number }> {
  const today = new Date().toISOString().split('T')[0];
  const key = redisKeys.notificationBudget(userId);
  const count = await redis.hget(key, today);
  const currentCount = parseInt(count || '0', 10);
  const maxPerDay = 3;
  return { canSend: currentCount < maxPerDay, remaining: Math.max(0, maxPerDay - currentCount) };
}

export async function incrementNotificationBudget(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = redisKeys.notificationBudget(userId);
  await redis.hincrby(key, today, 1);
  await redis.expire(key, 48 * 60 * 60);
}