import { prisma } from "@/lib/db";
import { PersonalityDimensions, DEFAULT_PERSONALITY, sanitizePersonality } from "@/lib/personality/config";
import { MemoryContext } from "@/lib/personality/system-prompt";
import { generateEmbedding } from "./embeddings";

/* ------------------------------------------------------------------ */
// 1. MEMORY CONTEXT (vector + importance blended)
/* ------------------------------------------------------------------ */

export async function getMemoryContext(
  userId: string,
  currentMessage?: string
): Promise<MemoryContext> {
  let vectorIds: string[] = [];

  if (currentMessage && currentMessage.length > 3) {
    try {
      const emb = await generateEmbedding(currentMessage);
      const vec = `[${emb.join(',')}]`;
      const similar = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT m.id
        FROM memories m
        JOIN memory_embeddings e ON m.id = e.memoryId
        WHERE m.userId = ${userId}
          AND m.status = 'ACTIVE'
          AND 1 - (e.embedding <=> ${vec}::vector) >= 0.72
        ORDER BY e.embedding <=> ${vec}::vector
        LIMIT 8
      `;
      vectorIds = similar.map(s => s.id);
    } catch (e) {
      console.error('[CONTEXT] Vector search failed:', e);
    }
  }

  const vectorMemories = vectorIds.length
    ? await prisma.memories.findMany({
        where: { id: { in: vectorIds }, status: 'ACTIVE' },
        select: { id: true, statement: true, category: true }
      }).catch(() => [])
    : [];

  const recentMemories = await prisma.memories.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      ...(vectorIds.length ? { id: { notIn: vectorIds } } : {}),
    },
    orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
    take: Math.max(0, 8 - vectorMemories.length),
    select: { statement: true, category: true }
  }).catch(() => []);

  const allFacts = [
    ...vectorMemories.map(m => `[${m.category}] ${m.statement}`),
    ...recentMemories.map(m => `[${m.category}] ${m.statement}`)
  ].slice(0, 10);

  return {
    recentFacts: allFacts,
    upcomingEvents: await getUpcomingEvents(userId),
    activeGoals: await getActiveGoals(userId),
  };
}

/* ------------------------------------------------------------------ */
// 2. PERSONALITY (restored)
/* ------------------------------------------------------------------ */

export async function getUserPersonality(userId: string): Promise<PersonalityDimensions> {
  const pref = await (prisma as any).userPreference?.findUnique({
    where: { userId },
  }).catch(() => null);

  if (pref?.personality && typeof pref.personality === "object") {
    return sanitizePersonality(pref.personality as Partial<PersonalityDimensions>);
  }

  return DEFAULT_PERSONALITY;
}

/* ------------------------------------------------------------------ */
// 3. USER NAME (restored)
/* ------------------------------------------------------------------ */

export async function getUserName(userId: string): Promise<string | undefined> {
  const pref = await (prisma as any).userPreference?.findUnique({
    where: { userId },
    select: { name: true },
  }).catch(() => null);

  return pref?.name ?? undefined;
}

/* ------------------------------------------------------------------ */
// 4. HELPERS (defensive — won't crash if Prisma model missing)
/* ------------------------------------------------------------------ */

async function getUpcomingEvents(userId: string): Promise<MemoryContext['upcomingEvents']> {
  try {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const scheduledIntentsModel = (prisma as any).scheduled_intents || (prisma as any).scheduledIntents;
    let intents: any[] = [];
    if (scheduledIntentsModel?.findMany) {
      intents = await scheduledIntentsModel.findMany({
        where: { userId, status: 'PENDING', triggerAt: { gte: now, lte: nextWeek } },
        orderBy: { triggerAt: 'asc' },
        take: 5,
        select: { triggerAt: true, memories: { select: { statement: true } } }
      });
    }

    const temps = await prisma.memories.findMany({
      where: { userId, status: 'ACTIVE', type: 'TEMPORARY', expiresAt: { gte: now } },
      orderBy: { expiresAt: 'asc' },
      take: 3,
      select: { statement: true, expiresAt: true }
    }).catch(() => []);

    const events = [
      ...intents.map((i: any) => ({ description: i.memories?.statement || 'Event', date: fmt(i.triggerAt) })),
      ...temps.map(m => ({ description: m.statement, date: fmt(m.expiresAt!) }))
    ].slice(0, 5);

    return events;
  } catch (e) {
    console.error('[CONTEXT] getUpcomingEvents failed:', e);
    return [];
  }
}

async function getActiveGoals(userId: string): Promise<string[]> {
  try {
    const goals = await prisma.memories.findMany({
      where: { userId, status: 'ACTIVE', category: 'GOALS' },
      orderBy: { importance: 'desc' },
      take: 5,
      select: { statement: true }
    });
    return goals.map(g => g.statement);
  } catch (e) {
    console.error('[CONTEXT] getActiveGoals failed:', e);
    return [];
  }
}

function fmt(d: Date): string {
  const diff = Math.round((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (diff <= 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff < 7) return `in ${diff} days`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}