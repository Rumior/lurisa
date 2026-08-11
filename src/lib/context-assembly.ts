import { prisma } from './db';
import { redis, redisKeys } from './redis';
import { searchMemoriesByVector } from './vector-search';
import { getMemoriesByEntityProximity, getLinkedMemories } from './graph-queries';
import { rankMemories } from './scoring';
import { checkPendingIntents, matchIntentToMessage } from './follow-up';

interface RetrievedMemory {
  id: string;
  statement: string;
  category: string;
  type: string;
  importance: number;
  recencyScore: number;
  relevanceScore: number;
  graphProximityScore: number;
  blendedScore: number;
}

interface ContextAssemblyResult {
  memories: RetrievedMemory[];
  recentMessages: Array<{ role: string; content: string }>;
  systemPrompt: string;
  tokenEstimate: number;
  pendingIntents: Array<any>;
  intentMatch?: { matched: boolean; intentId?: string; action?: string };
}

const MAX_CONTEXT_MESSAGES = 10;
const MAX_RETRIEVED_MEMORIES = 15;
const ALWAYS_INCLUDE_PERMANENT = 5;

export async function assembleContext(userId: string, conversationId: string, currentMessage: string): Promise<ContextAssemblyResult> {
  const recentMessages = await prisma.messages.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: MAX_CONTEXT_MESSAGES,
  });

  const formattedMessages = recentMessages.reverse().map((m) => ({ role: m.role.toLowerCase(), content: m.content }));

  const pendingIntents = await checkPendingIntents(userId);
  let intentMatch: { matched: boolean; intentId?: string; action?: string } | undefined;
  if (pendingIntents.length > 0) {
    intentMatch = await matchIntentToMessage(userId, currentMessage, conversationId);
  }

  const vectorResults = await searchMemoriesByVector(userId, currentMessage, { limit: 20, minSimilarity: 0.65 });

  const entities = extractEntities(currentMessage);
  const graphMemories = await getMemoriesByEntityProximity(userId, entities, { limit: 15 });

  const graphProximityIds = new Set<string>();
  for (const vr of vectorResults.slice(0, 5)) {
    const linked = await getLinkedMemories(userId, vr.memoryId, { limit: 5 });
    linked.forEach(l => graphProximityIds.add(l.memory.id));
  }

  const permanentMemories = await prisma.memories.findMany({
    where: { userId, status: 'ACTIVE', OR: [{ type: 'PERMANENT' }, { importance: { gte: 0.8 } }] },
    orderBy: { importance: 'desc' },
    take: ALWAYS_INCLUDE_PERMANENT,
  });

  const candidateMap = new Map<string, any>();

  for (const vr of vectorResults) {
    candidateMap.set(vr.memoryId, { id: vr.memoryId, statement: vr.statement, category: vr.category, type: vr.type, importance: vr.importance, createdAt: new Date(), vectorSimilarity: vr.similarity });
  }

  for (const gm of graphMemories) {
    if (!candidateMap.has(gm.id)) {
      candidateMap.set(gm.id, { id: gm.id, statement: gm.statement, category: gm.category, type: gm.type, importance: gm.importance, createdAt: gm.createdAt, vectorSimilarity: 0 });
    }
  }

  for (const pm of permanentMemories) {
    if (!candidateMap.has(pm.id)) {
      candidateMap.set(pm.id, { id: pm.id, statement: pm.statement, category: pm.category, type: pm.type, importance: pm.importance, createdAt: pm.createdAt, vectorSimilarity: 0 });
    }
  }

  const candidates = Array.from(candidateMap.values());
  const keywords = currentMessage.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  const ranked = rankMemories(candidates, { queryKeywords: keywords, graphProximityIds: Array.from(graphProximityIds), currentMessage });
  const selectedMemories = ranked.slice(0, MAX_RETRIEVED_MEMORIES);

  const memoryContext = selectedMemories.length > 0
    ? `\n\nRELEVANT MEMORIES:\n${selectedMemories.map((m, i) => `${i + 1}. [${m.category}] ${m.statement}`).join('\n')}`
    : '';

  const intentContext = intentMatch?.matched
    ? `\n\nThe user is responding to a follow-up about: ${pendingIntents.find(p => p.id === intentMatch?.intentId)?.memory?.statement || 'a previous topic'}`
    : '';

  const systemPrompt = `You are lurisa, a calm, patient, thoughtful personal intelligence that remembers what matters.\n\nYou have the following relevant memories about this user:${memoryContext}${intentContext}\n\nUse these memories naturally to make the conversation feel continuous and personal. Never cite memory numbers directly. If a memory seems outdated, be gentle about it.`;

  const tokenEstimate = systemPrompt.length / 4 + formattedMessages.reduce((sum, m) => sum + m.content.length / 4, 0) + currentMessage.length / 4;

  await redis.setex(redisKeys.conversationContext(conversationId), 300, JSON.stringify({ memories: selectedMemories, timestamp: Date.now() }));

  return { memories: selectedMemories, recentMessages: formattedMessages, systemPrompt, tokenEstimate, pendingIntents, intentMatch };
}

function extractEntities(text: string): string[] {
  const words = text.split(/\s+/);
  const entities: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-zA-Z]/g, '');
    if (word.length > 2 && word[0] === word[0].toUpperCase() && word[1] === word[1]?.toLowerCase()) {
      entities.push(word);
    }
  }

  const relationshipTerms = ['mom', 'mother', 'dad', 'father', 'sister', 'brother', 'wife', 'husband', 'partner', 'friend', 'boss', 'colleague'];
  for (const term of relationshipTerms) {
    if (text.toLowerCase().includes(term)) entities.push(term);
  }

  return Array.from(new Set(entities));
}
