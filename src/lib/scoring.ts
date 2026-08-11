import { prisma } from './db';
import { calculateImportance, computeRecencyDecay, getCategoryWeight, getEmotionalBoost, computeRecurrenceBoost, computeRetrievalScore } from './importance-engine';

interface ScoredMemory {
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

export async function rescoreMemories(userId: string): Promise<void> {
  const memories = await prisma.memories.findMany({ where: { userId, status: 'ACTIVE' } });
  for (const memory of memories) {
    const recencyDecay = computeRecencyDecay(memory.createdAt, memory.type, memory.lastReinforcedAt);
    const newImportance = calculateImportance({
      baseImportance: memory.importance,
      categoryWeight: getCategoryWeight(memory.category),
      emotionalBoost: 0,
      recurrenceBoost: computeRecurrenceBoost(memory.reinforcementCount),
      recencyDecay,
      userEditBoost: 0,
    });
    await prisma.memories.update({ where: { id: memory.id }, data: { importance: newImportance } });
  }
}

export function rankMemories(
  memories: Array<{ id: string; statement: string; category: string; type: string; importance: number; createdAt: Date; lastReinforcedAt?: Date | null }>,
  options: { queryKeywords?: string[]; graphProximityIds?: string[]; currentMessage?: string } = {}
): ScoredMemory[] {
  const { queryKeywords = [], graphProximityIds = [] } = options;

  const scored = memories.map(mem => {
    const daysSince = (Date.now() - mem.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.exp(-daysSince / 30);
    const memText = mem.statement.toLowerCase();
    const keywordMatches = queryKeywords.filter(k => memText.includes(k.toLowerCase())).length;
    const relevanceScore = queryKeywords.length > 0 ? Math.min(1, keywordMatches / Math.max(1, queryKeywords.length)) : 0.5;
    const graphProximityScore = graphProximityIds.includes(mem.id) ? 0.8 : 0;
    const blendedScore = computeRetrievalScore({ importance: mem.importance, recencyScore, relevanceScore, graphProximityScore });

    return { id: mem.id, statement: mem.statement, category: mem.category, type: mem.type, importance: mem.importance, recencyScore, relevanceScore, graphProximityScore, blendedScore };
  });

  return scored.sort((a, b) => b.blendedScore - a.blendedScore);
}
