import { prisma } from "@/lib/db";

export interface CrossMemoryInsight {
  type: "connection" | "progression" | "conflict";
  description: string;
  memoryIds: string[];
  confidence: number;
}

export async function findCrossMemoryInsights(userId: string): Promise<CrossMemoryInsight[]> {
  const insights: CrossMemoryInsight[] = [];

  const goals = await prisma.goals.findMany({
    where: { userId, status: "ACTIVE" },
    select: { id: true, title: true, category: true },
  });

  for (const goal of goals) {
    const relatedMemories = await prisma.memories.findMany({
      where: {
        userId,
        status: "ACTIVE",
        category: goal.category,
        statement: { contains: goal.title.split(" ")[0], mode: "insensitive" },
      },
      select: { id: true, statement: true, createdAt: true },
      take: 5,
    });

    if (relatedMemories.length >= 2) {
      insights.push({
        type: "connection",
        description: `Your goal "${goal.title}" connects to ${relatedMemories.length} recent memories.`,
        memoryIds: relatedMemories.map((m) => m.id),
        confidence: 0.8,
      });
    }
  }

  const contradictions = await prisma.memory_links.findMany({
    where: { userId, relationType: "CONTRADICTS" },
    select: { memoryIdA: true, memoryIdB: true },
    take: 5,
  });

  for (const link of contradictions) {
    insights.push({
      type: "conflict",
      description: "Two of your memories appear to contradict each other.",
      memoryIds: [link.memoryIdA, link.memoryIdB],
      confidence: 0.75,
    });
  }

  return insights;
}