import { prisma } from "@/lib/db";

export interface DetectedPattern {
  pattern: string;
  frequency: number;
  category: string;
  confidence: number;
  examples: string[];
  suggestion: string;
}

export async function detectPatterns(userId: string): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];
  patterns.push(...(await detectDayOfWeekPatterns(userId)));
  patterns.push(...(await detectCategoryClusters(userId)));
  patterns.push(...(await detectEmotionalPatterns(userId)));
  return patterns.sort((a, b) => b.confidence - a.confidence);
}

async function detectDayOfWeekPatterns(userId: string): Promise<DetectedPattern[]> {
  const memories = await prisma.memories.findMany({
    where: {
      userId,
      status: "ACTIVE",
      createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    },
    select: { statement: true, category: true, createdAt: true },
    take: 200,
  });

  const dayMap = new Map<number, Map<string, number>>();
  for (const mem of memories) {
    const day = new Date(mem.createdAt).getDay();
    if (!dayMap.has(day)) dayMap.set(day, new Map());
    const catMap = dayMap.get(day)!;
    catMap.set(mem.category, (catMap.get(mem.category) || 0) + 1);
  }

  const results: DetectedPattern[] = [];
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  dayMap.forEach((cats, day) => {
    cats.forEach((count, cat) => {
      if (count >= 3) {
        const examples = memories
          .filter((m) => new Date(m.createdAt).getDay() === day && m.category === cat)
          .slice(0, 3)
          .map((m) => m.statement);

        results.push({
          pattern: `Frequent ${cat.toLowerCase()} memories on ${days[day]}`,
          frequency: count,
          category: cat,
          confidence: Math.min(0.95, 0.5 + count * 0.1),
          examples,
          suggestion: `You have mentioned ${cat.toLowerCase()} topics ${count} times on ${days[day]}s. Is there a pattern here?`,
        });
      }
    });
  });
  return results;
}

async function detectCategoryClusters(userId: string): Promise<DetectedPattern[]> {
  const clusters = await prisma.memories.groupBy({
    by: ["category"],
    where: {
      userId,
      status: "ACTIVE",
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    _count: { id: true },
    having: { id: { _count: { gte: 5 } } },
  });

  return clusters.map((c) => ({
    pattern: `High activity in ${c.category.toLowerCase()}`,
    frequency: c._count.id,
    category: c.category,
    confidence: 0.7,
    examples: [],
    suggestion: `You have recorded ${c._count.id} memories about ${c.category.toLowerCase()} recently. This seems important to you.`,
  }));
}

async function detectEmotionalPatterns(userId: string): Promise<DetectedPattern[]> {
  const emotions = ["stressed","tired","excited","happy","anxious","grateful","frustrated"];
  const patterns: DetectedPattern[] = [];

  for (const emotion of emotions) {
    const count = await prisma.memories.count({
      where: {
        userId,
        status: "ACTIVE",
        statement: { contains: emotion, mode: "insensitive" },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    if (count >= 3) {
      const examples = await prisma.memories.findMany({
        where: {
          userId,
          status: "ACTIVE",
          statement: { contains: emotion, mode: "insensitive" },
        },
        select: { statement: true },
        take: 3,
      });

      patterns.push({
        pattern: `Repeatedly feeling ${emotion}`,
        frequency: count,
        category: "EMOTIONS",
        confidence: Math.min(0.9, 0.5 + count * 0.05),
        examples: examples.map((e) => e.statement),
        suggestion: `You have mentioned feeling ${emotion} ${count} times recently. Want to talk about it?`,
      });
    }
  }
  return patterns;
}
