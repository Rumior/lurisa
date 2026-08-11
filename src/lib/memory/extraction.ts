/**
 * Memory Extraction Pipeline
 * Now with Follow-Up Engine integration: creates ScheduledIntents for
 * temporal-bearing, high-importance memories (proposal → check-in → anniversary).
 */

import OpenAI from 'openai';
import { prisma } from '@/lib/db';
import { findDuplicateOrRelated } from './dedup';
import { scoreMemory } from './scoring';
import { storeEmbedding } from './embeddings';
import { createScheduledIntent, checkNotificationBudget } from '@/lib/follow-up';
import { withRetry } from '@/lib/error-handler';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const MODEL = process.env.LURISA_MODEL || 'llama-3.1-8b-instant';

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

    const extracted = await runExtraction(userMessage, assistantMessage);
    if (!extracted.memories.length) {
      console.log('[MEMORY] No memories extracted.');
      return;
    }

    const seenStatements: string[] = [];

    for (const mem of extracted.memories) {
      const normalized = mem.statement.toLowerCase().trim();

      // Same-turn dedup
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

      // Database dedup + related-subject check
      const dedup = await findDuplicateOrRelated(
        userId,
        mem.statement,
        mem.temporalMarker,
        mem.entities,
        mem.category
      );

      if (dedup.duplicate) {
        console.log('[MEMORY] Duplicate found, skipping:', mem.statement);
        continue;
      }

      if (dedup.contradiction && dedup.existingMemoryId) {
        console.log('[MEMORY] Contradiction found for:', mem.statement);
        continue;
      }

      if (dedup.related && dedup.existingMemoryId) {
        console.log('[MEMORY] Related subject found, reinforcing:', mem.statement);
        await reinforceMemory(dedup.existingMemoryId, mem);
        seenStatements.push(normalized);
        continue;
      }

      const memoryId = await processMemory(userId, conversationId, mem);
      seenStatements.push(normalized);

      // ── FOLLOW-UP ENGINE INTEGRATION ──
      // If this memory has a temporal marker and is high-importance,
      // create scheduled intents (e.g. "interview tomorrow" → check-in next day)
      if (memoryId && mem.temporalMarker) {
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
    }

    console.log(`[MEMORY] Processed ${seenStatements.length} unique memories.`);
  } catch (error) {
    console.error('[MEMORY] Extraction failed:', error);
  }
}

/**
 * Build intent candidates from a memory with a temporal marker.
 * This is the "proposal → Sunday check-in → one-year anniversary" engine.
 */
function buildIntentCandidates(mem: ExtractedMemory): IntentCandidate[] {
  const intents: IntentCandidate[] = [];
  const now = new Date();
  const marker = mem.temporalMarker?.toLowerCase(); if (!marker) return intents;

  // Parse temporal marker into a concrete date
  const eventDate = parseTemporalMarker(marker, now);
  if (!eventDate) return intents;

  const isHighStakes =
    mem.importance > 0.7 ||
    mem.category === 'RELATIONSHIPS' ||
    mem.category === 'GOALS' ||
    mem.category === 'CAREER' ||
    mem.category === 'HEALTH' ||
    mem.type === 'STORY';

  const isMilestone =
    mem.category === 'ACHIEVEMENTS' ||
    mem.category === 'STORIES' ||
    mem.category === 'RELATIONSHIPS';

  // 1. Same-day encouragement (morning of the event)
  const morningOf = new Date(eventDate);
  morningOf.setHours(8, 0, 0, 0);
  if (morningOf > now) {
    intents.push({
      triggerType: 'DATE',
      triggerAt: morningOf,
      actionType: 'MORNING_ENCOURAGEMENT',
      expectsResponse: false,
    });
  }

  // 2. Check-in shortly after the event (the "How did it go?" moment)
  const checkIn = new Date(eventDate);
  checkIn.setHours(eventDate.getHours() + 4); // 4 hours after event
  if (checkIn > now) {
    intents.push({
      triggerType: 'RELATIVE',
      triggerAt: checkIn,
      actionType: 'CHECK_IN_QUESTION',
      expectsResponse: true,
    });
  }

  // 3. One-year anniversary for milestone memories
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

  // 4. Goal reminders for goal-category memories
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

  // Try parsing as a date string
  const parsed = new Date(lower);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
}

async function reinforceMemory(existingId: string, newMem: ExtractedMemory): Promise<void> {
  try {
    const existing = await prisma.memories.findUnique({
      where: { id: existingId },
      select: { statement: true, reinforcementCount: true, importance: true }
    });
    if (!existing) return;

    let newStatement = existing.statement;
    const oldWords = new Set(existing.statement.toLowerCase().split(/\s+/));
    const newWords = new Set(newMem.statement.toLowerCase().split(/\s+/));

    const newIsLonger = newMem.statement.length > existing.statement.length + 5;
    const oldContainedInNew = Array.from(oldWords).every(w => w.length < 4 || newWords.has(w));
    const newAddsTemporal = !extractTemporal(existing.statement) && extractTemporal(newMem.statement);

    if ((newIsLonger && oldContainedInNew) || newAddsTemporal) {
      newStatement = newMem.statement;
    }

    await prisma.memories.update({
      where: { id: existingId },
      data: {
        statement: newStatement,
        reinforcementCount: { increment: 1 },
        lastReinforcedAt: new Date(),
        importance: Math.min(1, existing.importance + 0.03),
        updatedAt: new Date(),
      },
    });

    console.log('[MEMORY] Reinforced memory:', existingId);
  } catch (err) {
    console.error('[MEMORY] Reinforce failed:', err);
  }
}

function extractTemporal(text: string): string | null {
  const markers = ['tomorrow', 'today', 'yesterday', 'next week', 'last week', 'this week',
    'next month', 'last month', 'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday'];
  const lower = text.toLowerCase();
  for (const m of markers) {
    if (lower.includes(m)) return m;
  }
  return null;
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
    return true; // Default to extracting if classifier fails
  }
}

async function runExtraction(userMsg: string, assistantMsg: string): Promise<ExtractionResult> {
  const prompt = `You are a memory extraction engine for a personal AI companion. Extract factual memories from the conversation below.

Return a JSON object with this exact shape:
{
  "memories": [
    {
      "statement": "concise factual statement about the user",
      "category": "one of: IDENTITY, RELATIONSHIPS, GOALS, PROJECTS, CAREER, EDUCATION, FINANCE, HEALTH, PREFERENCES, HABITS, TIMELINE, ACHIEVEMENTS, FAILURES, LESSONS, DREAMS, VALUES, STORIES, EMOTIONS, TRAVEL, READING, LEARNING, SKILLS, INTERESTS, DAILY_REFLECTIONS",
      "type": "one of: PERMANENT, LONG_TERM, TEMPORARY, EMOTIONAL, STORY",
      "confidence": 0.0-1.0,
      "importance": 0.0-1.0,
      "entities": ["entity1", "entity2"],
      "temporalMarker": "optional: today, tomorrow, next week, monday, etc."
    }
  ]
}

Rules:
- Only extract facts ABOUT THE USER (not the assistant).
- Be concise. One sentence per memory.
- Include the company name, person name, or specific location in EVERY statement.
- Include the date or time reference in EVERY statement (e.g., "tomorrow", "Friday", "next week").
- NEVER extract vague statements like "User has an interview" — always specify who, where, and when.
- If the user mentions the same fact twice with slightly different wording, extract it ONCE.
- If nothing worth extracting, return {"memories": []}.

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
      .map(m => ({
        statement: m.statement.trim(),
        category: m.category || 'DAILY_REFLECTIONS',
        type: m.type || 'LONG_TERM',
        confidence: Math.min(1, Math.max(0, m.confidence ?? 0.7)),
        importance: Math.min(1, Math.max(0, m.importance ?? 0.5)),
        entities: Array.isArray(m.entities) ? m.entities : [],
        temporalMarker: m.temporalMarker,
      }));

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
