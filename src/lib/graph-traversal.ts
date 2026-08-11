import { prisma } from './db';

interface TraversalNode {
  nodeId: string;
  hops: number;
  path: string[];
}

export async function traverseMemoryGraph(
  userId: string,
  startNodeId: string,
  options: { maxHops?: number; minStrength?: number; relationTypes?: string[] } = {}
): Promise<Array<{ nodeId: string; statement: string; hops: number; path: string[] }>> {
  const { maxHops = 3, minStrength = 0.3, relationTypes } = options;
  const visited = new Set<string>();
  const results: Array<{ nodeId: string; statement: string; hops: number; path: string[] }> = [];
  const queue: TraversalNode[] = [{ nodeId: startNodeId, hops: 0, path: [startNodeId] }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.nodeId)) continue;
    visited.add(current.nodeId);

    const memory = await prisma.memories.findUnique({
      where: { id: current.nodeId },
      select: { id: true, statement: true },
    });

    if (memory) {
      results.push({ nodeId: memory.id, statement: memory.statement, hops: current.hops, path: current.path });
    }

    if (current.hops >= maxHops) continue;

    const links = await prisma.memory_links.findMany({
      where: {
        userId,
        OR: [{ memoryIdA: current.nodeId }, { memoryIdB: current.nodeId }],
        strength: { gte: minStrength },
        ...(relationTypes?.length ? { relationType: { in: relationTypes as any } } : {}),
      },
      include: {
        memories_memory_links_memoryIdATomemories: { select: { id: true, statement: true } },
        memories_memory_links_memoryIdBTomemories: { select: { id: true, statement: true } },
      },
    });

    for (const link of links) {
      const nextId = link.memoryIdA === current.nodeId ? link.memoryIdB : link.memoryIdA;
      if (!visited.has(nextId)) {
        queue.push({ nodeId: nextId, hops: current.hops + 1, path: [...current.path, nextId] });
      }
    }
  }

  return results;
}
