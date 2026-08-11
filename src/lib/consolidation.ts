import { prisma } from './db';
import { llmGateway } from './llm-gateway';
import { logAudit } from './audit';

interface ConsolidationCandidate {
  memories: Array<{ id: string; statement: string; category: string; importance: number; createdAt: Date }>;
  reason: 'low_importance' | 'near_duplicate' | 'expired_temp' | 'old_reinforced';
}

export async function findConsolidationCandidates(userId: string): Promise<ConsolidationCandidate[]> {
  const candidates: ConsolidationCandidate[] = [];

  const oldLowImportance = await prisma.memories.findMany({
    where: { userId, status: 'ACTIVE', importance: { lt: 0.3 }, createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
    orderBy: { category: 'asc' },
    take: 50,
  });

  if (oldLowImportance.length >= 3) {
    const byCategory = groupBy(oldLowImportance, 'category');
    for (const [category, memories] of Object.entries(byCategory)) {
      if (memories.length >= 3) candidates.push({ memories, reason: 'low_importance' });
    }
  }

  const expiredTemp = await prisma.memories.findMany({
    where: { userId, status: 'ACTIVE', type: 'TEMPORARY', expiresAt: { lt: new Date() } },
    take: 20,
  });
  if (expiredTemp.length > 0) candidates.push({ memories: expiredTemp, reason: 'expired_temp' });

  const oldReinforced = await prisma.memories.findMany({
    where: { userId, status: 'ACTIVE', reinforcementCount: { gt: 5 }, lastReinforcedAt: { lt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } },
    take: 20,
  });
  if (oldReinforced.length > 0) candidates.push({ memories: oldReinforced, reason: 'old_reinforced' });

  return candidates;
}

export async function consolidateMemories(userId: string, candidate: ConsolidationCandidate): Promise<string | null> {
  const { memories, reason } = candidate;
  if (memories.length < 2) return null;

  try {
    const statements = memories.map(m => `- ${m.statement}`).join('\n');
    const prompt = `Summarize the following related memories into a single, concise memory statement. Preserve the key information but make it compact.\n\nMEMORIES:\n${statements}\n\nRespond with a single sentence summary.`;

    const summary = await llmGateway.extractStructured<{ summary: string }>(prompt, {}, { temperature: 0.3, maxTokens: 200 });
    if (!summary.summary || summary.summary.length < 10) return null;

    const consolidated = await prisma.memories.create({
      data: { userId, category: memories[0].category as any, type: 'LONG_TERM', statement: summary.summary, confidence: 0.9, importance: Math.max(...memories.map(m => m.importance)) * 0.9, status: 'ACTIVE' },
    });

    for (const mem of memories) {
      await prisma.memory_links.create({
        data: { userId, memoryIdA: consolidated.id, memoryIdB: mem.id, relationType: 'PART_OF', strength: 0.7 },
      });
      await prisma.memories.update({ where: { id: mem.id }, data: { status: 'ARCHIVED' } });
    }

    await logAudit({ userId, action: 'memory.consolidate', resource: `memory:${consolidated.id}`, details: `Consolidated ${memories.length} memories (${reason})` });
    return consolidated.id;
  } catch (error) {
    console.error('Consolidation failed:', error);
    return null;
  }
}

export async function runConsolidation(userId: string): Promise<{ consolidated: number; archived: number }> {
  const candidates = await findConsolidationCandidates(userId);
  let consolidated = 0, archived = 0;
  for (const candidate of candidates) {
    const result = await consolidateMemories(userId, candidate);
    if (result) { consolidated++; archived += candidate.memories.length; }
  }
  return { consolidated, archived };
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((groups, item) => {
    const val = String(item[key]);
    groups[val] = groups[val] || [];
    groups[val].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}
