import { prisma } from './db';

interface GraphResult {
  nodes: Array<{ id: string; statement: string; category: string; type: string; importance: number }>;
  edges: Array<any>;
}

export async function getMemoryGraph(userId: string): Promise<GraphResult> {
  const memories = await prisma.memories.findMany({
    where: { userId, status: 'ACTIVE' },
    select: { id: true, statement: true, category: true, type: true, importance: true },
  });

  const links = await prisma.memory_links.findMany({
    where: { userId },
    include: {
      memories_memory_links_memoryIdATomemories: { select: { id: true, statement: true, category: true, type: true, importance: true } },
      memories_memory_links_memoryIdBTomemories: { select: { id: true, statement: true, category: true, type: true, importance: true } },
    },
  });

  return {
    nodes: memories.map(m => ({ id: m.id, statement: m.statement, category: m.category, type: m.type, importance: m.importance })),
    edges: links.map(l => ({
      id: l.id, relationType: l.relationType, strength: l.strength,
      source: { id: l.memories_memory_links_memoryIdATomemories.id, statement: l.memories_memory_links_memoryIdATomemories.statement, category: l.memories_memory_links_memoryIdATomemories.category, type: l.memories_memory_links_memoryIdATomemories.type, importance: l.memories_memory_links_memoryIdATomemories.importance },
      target: { id: l.memories_memory_links_memoryIdBTomemories.id, statement: l.memories_memory_links_memoryIdBTomemories.statement, category: l.memories_memory_links_memoryIdBTomemories.category, type: l.memories_memory_links_memoryIdBTomemories.type, importance: l.memories_memory_links_memoryIdBTomemories.importance },
    })),
  };
}

export async function getLinkedMemories(userId: string, memoryId: string, options: { relationTypes?: string[]; minStrength?: number; limit?: number } = {}): Promise<Array<{ memory: any; link: any }>> {
  const { relationTypes, minStrength = 0, limit = 20 } = options;

  const links = await prisma.memory_links.findMany({
    where: {
      userId,
      OR: [{ memoryIdA: memoryId }, { memoryIdB: memoryId }],
      strength: { gte: minStrength },
      ...(relationTypes?.length ? { relationType: { in: relationTypes as any } } : {}),
    },
    take: limit,
    include: {
      memories_memory_links_memoryIdATomemories: true,
      memories_memory_links_memoryIdBTomemories: true,
    },
  });

  return links.map(link => {
    const isA = link.memoryIdA === memoryId;
    return {
      memory: isA ? link.memories_memory_links_memoryIdBTomemories : link.memories_memory_links_memoryIdATomemories,
      link: { id: link.id, relationType: link.relationType, strength: link.strength, direction: isA ? 'outgoing' : 'incoming' }
    };
  });
}

export async function getMemoriesByEntityProximity(userId: string, entities: string[], options: { limit?: number; activeOnly?: boolean } = {}): Promise<Array<any>> {
  const { limit = 15, activeOnly = true } = options;
  if (entities.length === 0) return [];

  return prisma.memories.findMany({
    where: {
      userId,
      ...(activeOnly ? { status: 'ACTIVE' } : {}),
      OR: entities.map(e => ({ statement: { contains: e, mode: 'insensitive' } })),
    },
    orderBy: { importance: 'desc' },
    take: limit,
  });
}

export async function createMemoryLink(userId: string, memoryIdA: string, memoryIdB: string, relationType: string, strength: number = 0.5): Promise<void> {
  const [a, b] = memoryIdA < memoryIdB ? [memoryIdA, memoryIdB] : [memoryIdB, memoryIdA];
  await prisma.memory_links.upsert({
    where: { memoryIdA_memoryIdB_relationType: { memoryIdA: a, memoryIdB: b, relationType: relationType as any } },
    update: { strength: { set: Math.max(strength, 0.5) } },
    create: { userId, memoryIdA: a, memoryIdB: b, relationType: relationType as any, strength },
  });
}
