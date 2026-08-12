import { prisma } from "@/lib/db";

export interface MemoryChainLink {
  memoryId: string;
  statement: string;
  category: string;
  importance: number;
  relationType: string;
  strength: number;
}

export async function explainMemoryChain(userId: string, memoryId: string): Promise<MemoryChainLink[]> {
  const links = await prisma.memory_links.findMany({
    where: {
      OR: [
        { memoryIdA: memoryId, userId },
        { memoryIdB: memoryId, userId },
      ],
    },
    include: {
      memories_memory_links_memoryIdATomemories: {
        select: { id: true, statement: true, category: true, importance: true },
      },
      memories_memory_links_memoryIdBTomemories: {
        select: { id: true, statement: true, category: true, importance: true },
      },
    },
    orderBy: { strength: "desc" },
    take: 10,
  });

  return links.map((link) => {
    const isA = link.memoryIdA === memoryId;
    const related = isA
      ? link.memories_memory_links_memoryIdBTomemories
      : link.memories_memory_links_memoryIdATomemories;

    return {
      memoryId: related.id,
      statement: related.statement,
      category: related.category,
      importance: related.importance,
      relationType: link.relationType,
      strength: link.strength,
    };
  });
}

export async function explainSuggestion(
  userId: string,
  suggestionText: string,
  sourceMemoryIds: string[]
): Promise<{ summary: string; chain: MemoryChainLink[] }> {
  const allChains = await Promise.all(
    sourceMemoryIds.map((id) => explainMemoryChain(userId, id))
  );

  const flatChain = allChains.flat();
  const uniqueChain = Array.from(new Map(flatChain.map((c) => [c.memoryId, c])).values());

  return {
    summary: `This suggestion was based on ${sourceMemoryIds.length} memories with ${uniqueChain.length} related connections.`,
    chain: uniqueChain,
  };
}