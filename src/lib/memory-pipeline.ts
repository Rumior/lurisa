import { prisma } from './db';
import { llmGateway } from './llm-gateway';
import { logAudit } from './audit';
import { storeEmbedding } from './vector-search';
import { createMemoryLink } from './graph-queries';
import { createScheduledIntent } from './follow-up';
import { getCategoryWeight, getEmotionalBoost, computeRecurrenceBoost, computeRecencyDecay, calculateImportance } from './importance-engine';

interface ExtractedMemory {
  statement: string;
  category: string;
  type: string;
  confidence: number;
  importance: number;
  entities: string[];
  temporalMarkers?: string[];
  emotionalSignal?: string;
}

interface MemoryExtractionResult {
  memories: ExtractedMemory[];
  hasTemporalEvent: boolean;
}

export async function isMemoryWorthy(message: string): Promise<boolean> {
  const trivialPatterns = [/^\s*hi\b/i, /^\s*hello\b/i, /^\s*hey\b/i, /^\s*thanks?\b/i, /^\s*ok\b/i, /^\s*yes\b/i, /^\s*no\b/i, /^\s*bye\b/i, /^\s*goodbye\b/i, /^\s*\?+$/];
  if (trivialPatterns.some(p => p.test(message))) return false;

  const substanceIndicators = [
    /\b(feel|felt|feeling)\b/i, /\b(want|wanted|wishing|hope|hoping)\b/i,
    /\b(plan|planning|scheduled|tomorrow|next week|next month)\b/i,
    /\b(job|work|career|promotion|interview)\b/i,
    /\b(family|mother|father|sister|brother|friend|partner)\b/i,
    /\b(health|doctor|exercise|gym|sick)\b/i,
    /\b(learn|studying|course|skill)\b/i,
    /\b(travel|trip|vacation|visit)\b/i,
    /\b(achieved|accomplished|succeeded|failed|lesson)\b/i,
    /\b(dream|nightmare|woke up)\b/i,
  ];

  return substanceIndicators.some(p => p.test(message)) || message.length > 80;
}

export async function extractMemories(message: string, conversationHistory: Array<{ role: string; content: string }>): Promise<MemoryExtractionResult> {
  const historyContext = conversationHistory.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');

  const prompt = `You are a memory extraction system for a personal intelligence called lurisa.\n\nYour job is to extract meaningful, structured memories from the user's message. Extract the MEANING, not the transcript. Store what matters.\n\nCONVERSATION CONTEXT:\n${historyContext}\n\nUSER MESSAGE:\n"""${message}"""\n\nExtract memories as JSON. Rules:\n- Each memory should be a single, atomic fact or observation\n- "statement" should be in third person about the user (e.g., "User is training for a marathon")\n- "category" must be one of: IDENTITY, RELATIONSHIPS, GOALS, PROJECTS, CAREER, EDUCATION, FINANCE, HEALTH, PREFERENCES, HABITS, TIMELINE, ACHIEVEMENTS, FAILURES, LESSONS, DREAMS, VALUES, STORIES, EMOTIONS, TRAVEL, READING, LEARNING, SKILLS, INTERESTS, DAILY_REFLECTIONS\n- "type" must be one of: PERMANENT, LONG_TERM, TEMPORARY, EMOTIONAL, STORY\n- "confidence": 0.0-1.0 (higher if explicitly stated, lower if inferred)\n- "importance": 0.0-1.0 (higher for identity, relationships, major goals, life events)\n- "entities": array of people, places, organizations mentioned\n- "temporalMarkers": any dates, times, or relative time references\n- "emotionalSignal": the dominant emotion if any\n\nRespond with valid JSON:\n{\n  "memories": [\n    {\n      "statement": "...",\n      "category": "...",\n      "type": "...",\n      "confidence": 0.9,\n      "importance": 0.8,\n      "entities": ["..."],\n      "temporalMarkers": ["..."],\n      "emotionalSignal": "..."\n    }\n  ],\n  "hasTemporalEvent": true/false\n}\n\nIf no memories are worth extracting, return {"memories": [], "hasTemporalEvent": false}.`;

  try {
    const result = await llmGateway.extractStructured<MemoryExtractionResult>(prompt, {});
    return result;
  } catch (error) {
    console.error('Memory extraction failed:', error);
    return { memories: [], hasTemporalEvent: false };
  }
}

export async function checkDuplicate(userId: string, newMemory: ExtractedMemory): Promise<{ action: 'insert' | 'merge' | 'contradiction' | 'related_distinct'; existingMemoryId?: string; reason: string }> {
  const keywords = newMemory.statement.toLowerCase().split(/\s+/).filter(w => w.length > 4);

  const existingMemories = await prisma.memories.findMany({
    where: { userId, status: 'ACTIVE', OR: keywords.map(k => ({ statement: { contains: k, mode: 'insensitive' } })) },
    take: 20,
  });

  if (existingMemories.length === 0) return { action: 'insert', reason: 'No similar memories found' };

  for (const existing of existingMemories) {
    const existingLower = existing.statement.toLowerCase();
    const newLower = newMemory.statement.toLowerCase();
    if (existingLower === newLower || (existingLower.length > 20 && newLower.includes(existingLower.substring(0, 20))) || (newLower.length > 20 && existingLower.includes(newLower.substring(0, 20)))) {
      return { action: 'merge', existingMemoryId: existing.id, reason: 'Near-duplicate detected' };
    }
  }

  const topCandidates = existingMemories.slice(0, 5);
  for (const existing of topCandidates) {
    const classification = await classifyRelationship(newMemory.statement, existing.statement);
    if (classification === 'DUPLICATE') return { action: 'merge', existingMemoryId: existing.id, reason: 'LLM classified as duplicate' };

    if (classification === 'CONTRADICTION') {
      const appendOnlyCategories = ['TIMELINE', 'STORIES', 'ACHIEVEMENTS', 'FAILURES'];
      if (appendOnlyCategories.includes(existing.category) || existing.type === 'PERMANENT' || existing.importance > 0.8) {
        return { action: 'contradiction', existingMemoryId: existing.id, reason: 'High-stakes contradiction - flag for confirmation' };
      }
      const mutableCategories = ['CAREER', 'PREFERENCES', 'HABITS', 'INTERESTS', 'FINANCE'];
      if (mutableCategories.includes(existing.category)) {
        return { action: 'contradiction', existingMemoryId: existing.id, reason: 'Mutable category contradiction - auto-supersede' };
      }
    }

    if (classification === 'RELATED_DISTINCT') return { action: 'related_distinct', existingMemoryId: existing.id, reason: 'Related but distinct fact' };
  }

  return { action: 'insert', reason: 'No duplicates or contradictions found' };
}

async function classifyRelationship(newStatement: string, existingStatement: string): Promise<string> {
  try {
    const prompt = `Classify the relationship between two memory statements:\n\nNEW: "${newStatement}"\nEXISTING: "${existingStatement}"\n\nChoose exactly one:\n- DUPLICATE: Same fact, reworded\n- CONTRADICTION: Same topic, changed/opposed state\n- RELATED_DISTINCT: Same topic, genuinely different fact\n- UNRELATED: Not meaningfully related\n\nRespond with JSON: {"classification": "...", "confidence": 0.0-1.0}`;
    const result = await llmGateway.extractStructured<{ classification: string; confidence: number }>(prompt, {}, { temperature: 0.1, maxTokens: 100 });
    if (result.confidence > 0.7) return result.classification;
    return 'RELATED_DISTINCT';
  } catch { return 'RELATED_DISTINCT'; }
}

export function refineImportance(memory: ExtractedMemory): number {
  return calculateImportance({
    baseImportance: memory.importance,
    categoryWeight: getCategoryWeight(memory.category),
    emotionalBoost: getEmotionalBoost(memory.emotionalSignal),
    recurrenceBoost: 0,
    recencyDecay: 1.0,
    userEditBoost: 0,
  });
}

export async function linkMemory(userId: string, memoryId: string, entities: string[]): Promise<void> {
  for (const entity of entities) {
    if (entity.length < 3) continue;
    const related = await prisma.memories.findMany({
      where: { userId, id: { not: memoryId }, status: 'ACTIVE', statement: { contains: entity, mode: 'insensitive' } },
      take: 5,
    });
    for (const rel of related) {
      await createMemoryLink(userId, memoryId, rel.id, 'RELATED_TO', 0.5);
    }
  }
}

export async function storeMemory(userId: string, conversationId: string, memory: ExtractedMemory): Promise<string | null> {
  const dupCheck = await checkDuplicate(userId, memory);

  if (dupCheck.action === 'merge' && dupCheck.existingMemoryId) {
    await prisma.memories.update({
      where: { id: dupCheck.existingMemoryId },
      data: { reinforcementCount: { increment: 1 }, lastReinforcedAt: new Date(), importance: { increment: 0.05 } },
    });
    return dupCheck.existingMemoryId;
  }

  if (dupCheck.action === 'contradiction' && dupCheck.existingMemoryId) {
    const existing = await prisma.memories.findUnique({ where: { id: dupCheck.existingMemoryId } });
    if (!existing) return null;

    const mutableCategories = ['CAREER', 'PREFERENCES', 'HABITS', 'INTERESTS', 'FINANCE'];
    if (mutableCategories.includes(existing.category) && existing.type !== 'PERMANENT' && existing.importance < 0.8) {
      await prisma.memories.update({ where: { id: dupCheck.existingMemoryId }, data: { status: 'SUPERSEDED' } });
      const newMem = await prisma.memories.create({
        data: { userId, category: memory.category as any, type: memory.type as any, statement: memory.statement, confidence: memory.confidence, importance: refineImportance(memory), sourceConversationId: conversationId },
      });
      await createMemoryLink(userId, newMem.id, dupCheck.existingMemoryId, 'SUPERSEDES', 0.9);
      await storeEmbedding(newMem.id, userId, memory.statement);
      return newMem.id;
    } else {
      await prisma.pending_confirmations.create({
        data: { userId, existingMemoryId: dupCheck.existingMemoryId, candidateStatement: memory.statement, relationType: 'CONTRADICTION' },
      });
      return null;
    }
  }

  if (dupCheck.action === 'related_distinct' && dupCheck.existingMemoryId) {
    const stored = await prisma.memories.create({
      data: { userId, category: memory.category as any, type: memory.type as any, statement: memory.statement, confidence: memory.confidence, importance: refineImportance(memory), sourceConversationId: conversationId },
    });
    await createMemoryLink(userId, stored.id, dupCheck.existingMemoryId, 'RELATED_TO', 0.5);
    await storeEmbedding(stored.id, userId, memory.statement);
    return stored.id;
  }

  let expiresAt: Date | null = null;
  if (memory.type === 'TEMPORARY' && memory.temporalMarkers) {
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  const stored = await prisma.memories.create({
    data: { userId, category: memory.category as any, type: memory.type as any, statement: memory.statement, confidence: memory.confidence, importance: refineImportance(memory), sourceConversationId: conversationId, expiresAt },
  });

  await storeEmbedding(stored.id, userId, memory.statement);

  if (memory.entities && memory.entities.length > 0) {
    await linkMemory(userId, stored.id, memory.entities);
  }

  if (memory.temporalMarkers && memory.temporalMarkers.length > 0 && memory.importance > 0.5) {
    const triggerDate = parseTemporalMarker(memory.temporalMarkers[0]);
    if (triggerDate && triggerDate > new Date()) {
      await createScheduledIntent({ userId, sourceMemoryId: stored.id, triggerType: 'DATE', triggerAt: triggerDate, actionType: 'CHECK_IN_QUESTION', expectsResponse: true });
    }
  }

  if (memory.category === 'ACHIEVEMENTS' && memory.emotionalSignal && ['excited', 'proud', 'grateful'].includes(memory.emotionalSignal)) {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    await createScheduledIntent({ userId, sourceMemoryId: stored.id, triggerType: 'RECURRENCE', triggerAt: nextYear, actionType: 'ANNIVERSARY_NOTE', expectsResponse: false, recurrenceRule: 'ANNUAL' });
  }

  await logAudit({ userId, action: 'memory.create', resource: `memory:${stored.id}`, details: `Created ${memory.type} memory in ${memory.category}` });
  return stored.id;
}

function parseTemporalMarker(marker: string): Date | null {
  const today = new Date();
  if (/tomorrow/i.test(marker)) return new Date(today.getTime() + 24 * 60 * 60 * 1000);
  if (/next week/i.test(marker)) return new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (/next month/i.test(marker)) return new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  if (/\d{4}-\d{2}-\d{2}/.test(marker)) {
    const parsed = new Date(marker);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export async function runMemoryPipeline(userId: string, conversationId: string, message: string, conversationHistory: Array<{ role: string; content: string }>): Promise<{ extracted: number; stored: number }> {
  try {
    const worthy = await isMemoryWorthy(message);
    if (!worthy) return { extracted: 0, stored: 0 };

    const extraction = await extractMemories(message, conversationHistory);
    if (extraction.memories.length === 0) return { extracted: 0, stored: 0 };

    let storedCount = 0;
    for (const memory of extraction.memories) {
      const storedId = await storeMemory(userId, conversationId, memory);
      if (storedId) storedCount++;
    }

    return { extracted: extraction.memories.length, stored: storedCount };
  } catch (error) {
    console.error('Memory pipeline error:', error);
    return { extracted: 0, stored: 0 };
  }
}
