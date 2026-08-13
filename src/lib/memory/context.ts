import { prisma } from '@/lib/db';
import { getSynthesizedContext } from './synthesis';

export interface MemoryContext {
  recentFacts: string[];
  upcomingEvents?: { description: string; date: string }[];
  activeGoals?: string[];
  userState?: string;
  activeThemes?: string[];
  recentShifts?: string[];
}

export async function getMemoryContext(
  userId: string,
  currentMessage?: string
): Promise<MemoryContext> {
  const [synthesis, recentMemories, goals, upcomingEvents] = await Promise.all([
    getSynthesizedContext(userId),
    getRecentMemories(userId, 5),
    getActiveGoals(userId),
    getUpcomingEvents(userId),
  ]);

  let relevantFacts: string[] = [];
  if (currentMessage) {
    relevantFacts = await getRelevantMemories(userId, currentMessage);
  }

  return {
    recentFacts: relevantFacts.length > 0 ? relevantFacts : recentMemories,
    upcomingEvents,
    activeGoals: goals,
    userState: synthesis.userState,
    activeThemes: synthesis.activeThemes,
    recentShifts: synthesis.recentShifts,
  };
}

async function getRecentMemories(userId: string, limit: number): Promise<string[]> {
  const memories = await prisma.memories.findMany({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { statement: true },
  });
  return memories.map(m => m.statement);
}

async function getActiveGoals(userId: string): Promise<string[]> {
  const goals = await prisma.goals.findMany({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { title: true },
  });
  return goals.map(g => g.title);
}

async function getUpcomingEvents(userId: string): Promise<{ description: string; date: string }[]> {
  const events = await prisma.memories.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      OR: [
        { statement: { contains: 'tomorrow' } },
        { statement: { contains: 'next week' } },
        { statement: { contains: 'interview' } },
        { statement: { contains: 'meeting' } },
        { statement: { contains: 'deadline' } },
      ],
    },
    orderBy: { importance: 'desc' },
    take: 3,
    select: { statement: true },
  });
  return events.map(e => ({ description: e.statement, date: 'upcoming' }));
}

async function getRelevantMemories(userId: string, message: string): Promise<string[]> {
  try {
    const memories = await prisma.memories.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { statement: true, importance: true },
    });
    const messageWords = new Set(message.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const scored = memories.map(m => {
      const memWords = m.statement.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const overlap = memWords.filter(w => messageWords.has(w)).length;
      return { statement: m.statement, score: overlap * m.importance };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 5).map(s => s.statement);
  } catch (err) {
    console.error('[MEMORY CONTEXT] Relevance search failed:', err);
    return [];
  }
}
