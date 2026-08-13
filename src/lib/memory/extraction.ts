/**
 * Memory Extraction Pipeline v2
 * - Cross-category deduplication
 * - Hallucination filtering
 * - Emotion consolidation (same-day emotions merged)
 * - Confidence gating (70% threshold)
 * - Better reinforcement (actual statement merging)
 */

import OpenAI from 'openai';
import { prisma } from '@/lib/db';
import { findDuplicateOrRelated, checkHallucination } from './dedup';
import { scoreMemory } from './scoring';
import { storeEmbedding } from './embeddings';
import { createScheduledIntent, checkNotificationBudget } from '@/lib/follow-up';
import { withRetry } from '@/lib/error-handler';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const MODEL = process.env.LURISA_MODEL || 'llama-3.1-8b-instant';
const CONFIDENCE_THRESHOLD = 0.70;

interface ExtractedMemory {
  statement: string;
  category: string;
  type: string;
  confidence: number;
  importance: number;
  entities: string[];
  temporalMarker?: string;
}

interface ExtractionResult {
  memories: ExtractedMemory[];
  worthExtracting: boolean;
}

interface IntentCandidate {
  triggerType: 'DATE' | 'RELATIVE' | 'RECURRENCE';
  triggerAt: Date;
  actionType: string;
  expectsResponse: boolean;
  recurrenceRule?: string;
}

export async function extractMemoriesFromTurn(
  userId: string,
  conversationId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  try {
    const gate = await isWorthExtracting(userMessage, assistantMessage);
    if (!gate) {
      console.log('[MEMORY] Turn not worth extracting.');
      return;
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const userName = user?.name?.split(' ')[0] || 'User';

    const extracted = await runExtraction(userMessage, assistantMessage, userName);
    if (!extracted.memories.length) {
      console.log('[MEMORY] No memories extracted.');
      return;
    }

    const highConfidenceMemories = extracted.memories.filter(m => m.confidence >= CONFIDENCE_THRESHOLD);
    if (highConfidenceMemories.length < extracted.memories.length) {
      console.log(`[MEMORY] Filtered ${extracted.memories.length - highConfidenceMemories.length} low-confidence memories`);
    }

    const seenStatements: string[] = [];

    for (const mem of highConfidenceMemories) {
      const normalized = mem.statement.toLowerCase().trim();

      let sameTurnDup = false;
      for (const seen of seenStatements) {
        const a = normalized.split(/\s+/).filter(w => w.length > 3);
        const b = seen.split(/\s+/).filter(w => w.length > 3);
        const common = a.filter(w => b.includes(w));
        if (common.length / Math.max(a.length, b.length) > 0.75) {
          console.log('[MEMORY] Same-turn duplicate, skipping:', mem.statement);
          sameTurnDup = true;
          break;
        }
      }
      if (sameTurnDup) continue;

      const hallucination = checkHallucination(mem.statement, userMessage);
      if (hallucination.isHallucination) {
        console.log('[MEMORY] Hallucination detected, skipping:', mem.statement, '| Reason:', hallucination.reason);
        continue;
      }

      const dedup = await findDuplicateOrRelated(
        userId,
        mem.statement,
        mem.category,
        mem.entities
      );

      switch (dedup.action) {
        case 'SKIP_DUPLICATE':
          console.log('[MEMORY] Duplicate found, skipping:', mem.statement);
          continue;

        case 'SKIP_CONTRADICTION':
          console.log('[MEMORY] Contradiction found, skipping:', mem.statement);
          continue;

        case 'SKIP_HALLUCINATION':
          console.log('[MEMORY] Hallucination flagged, skipping:', mem.statement);
          continue;

        case 'REINFORCE':
        case 'MERGE':
          if (dedup.existingMemoryId) {
            console.log('[MEMORY] Reinforcing existing memory:', dedup.reason);
            await reinforceMemory(dedup.existingMemoryId, mem, userMessage);
            seenStatements.push(normalized);
          }
          continue;

        case 'CREATE':
          if (mem.category === 'EMOTIONS' || mem.category === 'DAILY_REFLECTIONS') {
            const merged = await tryMergeEmotion(userId, mem);
            if (merged) {
              console.log('[MEMORY] Emotion consolidated into existing memory');
              seenStatements.push(normalized);
              continue;
            }
          }

          const memoryId = await processMemory(userId, conversationId, mem);
          seenStatements.push(normalized);

          if (memoryId && mem.temporalMarker) {
            await createFollowUpIntents(userId, memoryId, mem);
          }
          break;
      }
    }

    console.log(`[MEMORY] Processed ${seenStatements.length} unique memories.`);
  } catch (error) {
    console.error('[MEMORY] Extraction failed:', error);
  }
}

async function tryMergeEmotion(userId: string, mem: ExtractedMemory): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const existingEmotion = await prisma.memories.findFirst({
    where: {
      userId,
      category: { in: ['EMOTIONS', 'DAILY_REFLECTIONS'] },
      status: 'ACTIVE',
      createdAt: { gte: todayStart },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, statement: true, importance: true },
  });

  if (!existingEmotion) return false;

  const existingWords = existingEmotion.statement.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const newWords = mem.statement.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const common = newWords.filter(w => existingWords.includes(w));
  const overlap = common.length / Math.max(existingWords.length, newWords.length);

  if (overlap > 0.3) {
    const mergedStatement = mergeEmotionStatements(existingEmotion.statement, mem.statement);
    await prisma.memories.update({
      where: { id: existingEmotion.id },
      data: {
        statement: mergedStatement,
        importance: Math.min(1, Math.max(existingEmotion.importance, mem.importance) + 0.05),
        reinforcementCount: { increment: 1 },
        lastReinforcedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return true;
  }

  return false;
}

function mergeEmotionStatements(existing: string, newStatement: string): string {
  if (existing.length < 100) {
    return `${existing} Later, ${newStatement.charAt(0).toLowerCase() + newStatement.slice(1)}`;
  }
  return newStatement;
}

async function createFollowUpIntents(userId: string, memoryId: string, mem: ExtractedMemory): Promise<void> {
  const intents = buildIntentCandidates(mem);
  for (const intent of intents) {
    try {
      const budget = await checkNotificationBudget(userId);
      if (!budget.canSend) {
        console.log('[FOLLOW-UP] Notification budget exhausted for user', userId);
        break;
      }
      await createScheduledIntent({
        userId,
        sourceMemoryId: memoryId,
        triggerType: intent.triggerType,
        triggerAt: intent.triggerAt,
        actionType: intent.actionType,
        expectsResponse: intent.expectsResponse,
        recurrenceRule: intent.recurrenceRule,
      });
      console.log('[FOLLOW-UP] Created intent:', intent.actionType, 'for', mem.statement);
    } catch (err) {
      console.error('[FOLLOW-UP] Failed to create intent:', err);
    }
  }
}

function buildIntentCandidates(mem: ExtractedMemory): IntentCandidate[] {
  const intents: IntentCandidate[] = [];
  const now = new Date();
  const marker = mem.temporalMarker?.toLowerCase();
  if (!marker) return intents;

  const eventDate = parseTemporalMarker(marker, now);
  if (!eventDate) return intents;

  const morningOf = new Date(eventDate);
  morningOf.setHours(5, 0, 0, 0);
  if (morningOf > now) {
    intents.push({
      triggerType: 'DATE',
      triggerAt: morningOf,
      actionType: 'MORNING_ENCOURAGEMENT',
      expectsResponse: false,
    });
  }

  const checkIn = new Date(eventDate);
  checkIn.setHours(eventDate.getHours() + 4);
  if (checkIn > now) {
    intents.push({
      triggerType: 'RELATIVE',
      triggerAt: checkIn,
      actionType: 'CHECK_IN_QUESTION',
      expectsResponse: true,
    });
  }

  const isMilestone =
    mem.category === 'ACHIEVEMENTS' ||
    mem.category === 'STORIES' ||
    mem.category === 'RELATIONSHIPS';

  if (isMilestone && mem.importance > 0.6) {
    const anniversary = new Date(eventDate);
    anniversary.setFullYear(anniversary.getFullYear() + 1);
    anniversary.setHours(9, 0, 0, 0);
    intents.push({
      triggerType: 'RECURRENCE',
      triggerAt: anniversary,
      actionType: 'ANNIVERSARY_NOTE',
      expectsResponse: false,
      recurrenceRule: 'ANNUAL',
    });
  }

  if (mem.category === 'GOALS' && eventDate > now) {
    const reminder = new Date(eventDate);
    reminder.setDate(reminder.getDate() - 1);
    reminder.setHours(20, 0, 0, 0);
    if (reminder > now) {
      intents.push({
        triggerType: 'RELATIVE',
        triggerAt: reminder,
        actionType: 'GOAL_REMINDER',
        expectsResponse: false,
      });
    }
  }

  return intents;
}

function parseTemporalMarker(marker: string, relativeTo: Date): Date | null {
  const lower = marker.toLowerCase().trim();
  const result = new Date(relativeTo);

  const dayMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };

  if (lower === 'tomorrow') {
    result.setDate(result.getDate() + 1);
    return result;
  }
  if (lower === 'today') {
    return result;
  }
  if (lower === 'next week') {
    result.setDate(result.getDate() + 7);
    return result;
  }
  if (lower === 'next month') {
    result.setMonth(result.getMonth() + 1);
    return result;
  }
  if (dayMap[lower] !== undefined) {
    const targetDay = dayMap[lower];
    const currentDay = result.getDay();
    const daysUntil = (targetDay - currentDay + 7) % 7;
    result.setDate(result.getDate() + (daysUntil === 0 ? 7 : daysUntil));
    return result;
  }

  const parsed = new Date(lower);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
}

async function reinforceMemory(existingId: string, newMem: ExtractedMemory, userMessage: string): Promise<void> {
  try {
    const existing = await prisma.memories.findUnique({
      where: { id: existingId },
      select: { statement: true, reinforcementCount: true, importance: true, category: true }
    });
    if (!existing) return;

    let newStatement = existing.statement;
    const oldWords = new Set(existing.statement.toLowerCase().split(/\s+/));
    const newWords = new Set(newMem.statement.toLowerCase().split(/\s+/));

    const newIsLonger = newMem.statement.length > existing.statement.length + 10;
    const oldContainedInNew = Array.from(oldWords).every(w => w.length < 4 || newWords.has(w));
    const newAddsDetail = Array.from(newWords).filter(w => w.length > 4 && !oldWords.has(w)).length >= 2;

    if (newAddsDetail && !oldContainedInNew) {
      newStatement = mergeStatements(existing.statement, newMem.statement);
    } else if (newIsLonger && oldContainedInNew) {
      newStatement = newMem.statement;
    }

    const categoryPriority: Record<string, number> = {
      CAREER: 3, BUSINESS: 3, GOALS: 3,
      PROJECTS: 2,
      EMOTIONS: 3, STORIES: 2, DAILY_REFLECTIONS: 1,
      PREFERENCES: 2, HABITS: 2, IDENTITY: 1,
    };
    const newCategory =
      (categoryPriority[newMem.category] || 0) > (categoryPriority[existing.category] || 0)
        ? newMem.category
        : existing.category;

    await prisma.memories.update({
      where: { id: existingId },
      data: {
        statement: newStatement,
        category: newCategory as any,
        reinforcementCount: { increment: 1 },
        lastReinforcedAt: new Date(),
        importance: Math.min(1, existing.importance + 0.05),
        updatedAt: new Date(),
      },
    });

    console.log('[MEMORY] Reinforced memory:', existingId, '| New statement:', newStatement.slice(0, 80));
  } catch (err) {
    console.error('[MEMORY] Reinforce failed:', err);
  }
}

function mergeStatements(a: string, b: string): string {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (bLower.includes(aLower)) return b;
  if (aLower.includes(bLower)) return a;

  const aSubject = a.split(' ').slice(0, 3).join(' ');
  const bSubject = b.split(' ').slice(0, 3).join(' ');

  if (aSubject.toLowerCase() === bSubject.toLowerCase()) {
    return `${a} and ${b.charAt(0).toLowerCase() + b.slice(1)}`;
  }

  return b.length > a.length ? b : a;
}

async function isWorthExtracting(userMsg: string, assistantMsg: string): Promise<boolean> {
  const prompt = `You are a memory-worthiness classifier for a personal AI companion.

CONVERSATION TURN:
User: "${userMsg}"
Assistant: "${assistantMsg}"

Does this turn contain ANY information worth remembering about the user's life?
Examples of WORTH remembering:
- Facts about the user (name, job, family, preferences, goals)
- Events (interviews, trips, appointments, celebrations)
- Emotions or states (stressed about X, excited about Y)
- Decisions or plans (starting a business, moving, learning something)

Examples of NOT worth remembering:
- Casual greetings ("hello", "how are you")
- Generic chitchat with no personal info
- Repetition of already-known facts without new detail

Answer ONLY "yes" or "no".`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 10,
    });
    const answer = completion.choices[0]?.message?.content?.toLowerCase().trim() || '';
    return answer.includes('yes');
  } catch {
    return true;
  }
}

async function runExtraction(userMsg: string, assistantMsg: string, userName: string = 'User'): Promise<ExtractionResult> {
  const prompt = `You are a memory extraction engine for a personal AI companion. Extract factual memories from the conversation below.

CRITICAL RULES:
1. ONLY extract facts ABOUT THE USER (not the assistant).
2. The user's name is ${userName}. Use "${userName}" instead of "the user" or "User" in every statement.
3. Transform casual statements into underlying facts. DO NOT quote the user's exact words.
4. Be concise. One sentence per memory.
5. NEVER extract vague statements — always specify who, what, where, when.
6. If the user mentions the same fact twice with different wording, extract it ONCE with the clearest phrasing.
7. DO NOT invent dates, numbers, or details not explicitly stated by the user.
8. For emotions: capture the emotion AND the cause (e.g., "${userName} feels stressed about offering credit for car washing").
9. If nothing worth extracting, return {"memories": []}.
10. Confidence should reflect certainty: 1.0 = explicitly stated, 0.8 = strongly implied, 0.6 = somewhat implied.

Return JSON:
{
  "memories": [
    {
      "statement": "concise factual statement",
      "category": "one of: IDENTITY, RELATIONSHIPS, GOALS, PROJECTS, CAREER, EDUCATION, FINANCE, HEALTH, PREFERENCES, HABITS, TIMELINE, ACHIEVEMENTS, FAILURES, LESSONS, DREAMS, VALUES, STORIES, EMOTIONS, TRAVEL, READING, LEARNING, SKILLS, INTERESTS, DAILY_REFLECTIONS",
      "type": "one of: PERMANENT, LONG_TERM, TEMPORARY, EMOTIONAL, STORY",
      "confidence": 0.0-1.0,
      "importance": 0.0-1.0,
      "entities": ["entity1", "entity2"],
      "temporalMarker": "optional: today, tomorrow, next week, monday, etc."
    }
  ]
}

Examples of correct transformations:
  "my sister is calling me" → {"statement": "${userName} has a sister", "category": "RELATIONSHIPS"}
  "she bought a dog called rex today" → {"statement": "${userName} bought a dog named Rex", "category": "PREFERENCES"}
  "I have an interview at Google tomorrow" → {"statement": "${userName} has an interview at Google tomorrow", "category": "CAREER", "temporalMarker": "tomorrow"}
  "I'm feeling stressed about work" → {"statement": "${userName} feels stressed about work", "category": "EMOTIONS"}
  "I want to start a carwash business" → {"statement": "${userName} wants to start a carwash business", "category": "GOALS"}

CONVERSATION:
User: "${userMsg}"
Assistant: "${assistantMsg}"`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 512,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw) as ExtractionResult;

    if (!Array.isArray(parsed.memories)) {
      return { memories: [], worthExtracting: false };
    }

    const memories = parsed.memories
      .filter(m => m.statement && m.statement.length > 5)
      .map(m => {
        const statement = m.statement.trim()
          .replace(/\bthe user\b/gi, userName)
          .replace(/\bUser\b/g, userName);
        return {
          statement,
          category: m.category || 'DAILY_REFLECTIONS',
          type: m.type || 'LONG_TERM',
          confidence: Math.min(1, Math.max(0, m.confidence ?? 0.7)),
          importance: Math.min(1, Math.max(0, m.importance ?? 0.5)),
          entities: Array.isArray(m.entities) ? m.entities : [],
          temporalMarker: m.temporalMarker,
        };
      });

    return { memories, worthExtracting: memories.length > 0 };
  } catch (error) {
    console.error('[MEMORY] runExtraction failed:', error);
    return { memories: [], worthExtracting: false };
  }
}

async function processMemory(
  userId: string,
  conversationId: string,
  mem: ExtractedMemory
): Promise<string | null> {
  try {
    const scored = scoreMemory(mem);

    let expiresAt: Date | undefined;
    if (mem.type === 'TEMPORARY' || mem.temporalMarker) {
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const created = await prisma.memories.create({
      data: {
        userId,
        category: mem.category as any,
        type: mem.type as any,
        statement: mem.statement,
        confidence: scored.confidence,
        importance: scored.importance,
        sourceConversationId: conversationId,
        status: 'ACTIVE',
        updatedAt: new Date(),
        expiresAt,
      },
    });

    storeEmbedding(userId, created.id, mem.statement).catch((err) => {
      console.error('[MEMORY] Embedding generation failed:', err);
    });

    console.log('[MEMORY] Created memory:', created.id);
    return created.id;
  } catch (error) {
    console.error('[MEMORY] processMemory failed:', error);
    return null;
  }
}
