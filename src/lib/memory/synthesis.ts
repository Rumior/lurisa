/**
 * Memory Synthesis Layer — Spec §19, §21, §22
 * Converts raw memories into a concise narrative "user state" for the LLM.
 * Runs in background after memory changes. Cached in Redis.
 * The user still sees raw memories in the Memories page.
 */

import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';

const CACHE_TTL_SECONDS = 3600;

export interface SynthesizedContext {
  userState: string;
  activeThemes: string[];
  recentShifts: string[];
}

export async function getSynthesizedContext(userId: string): Promise<SynthesizedContext> {
  const cached = await redis.get(`synthesis:${userId}`);
  if (cached) {
    try {
      return JSON.parse(cached) as SynthesizedContext;
    } catch {
      // cache corrupted, regenerate
    }
  }
  return await regenerateSynthesis(userId);
}

export async function invalidateSynthesis(userId: string): Promise<void> {
  await redis.del(`synthesis:${userId}`);
}

export async function regenerateSynthesis(userId: string): Promise<SynthesizedContext> {
  const [memories, personalModel, goals] = await Promise.all([
    prisma.memories.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      select: { category: true, statement: true, importance: true, createdAt: true },
    }),
    prisma.user_personal_models.findUnique({
      where: { userId },
      select: {
        communicationStyle: true, communicationConfidence: true,
        lifePhase: true, lifePhaseConfidence: true,
        recurringConcerns: true, concernsConfidence: true,
        currentGoalsSummary: true, goalsConfidence: true,
      },
    }),
    prisma.goals.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { title: true, category: true },
      take: 5,
    }),
  ]);

  const byCategory: Record<string, typeof memories> = {};
  for (const m of memories) {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m);
  }

  const categoryScores = Object.entries(byCategory).map(([cat, mems]) => ({
    category: cat,
    memories: mems.slice(0, 3),
    totalImportance: mems.reduce((sum, m) => sum + m.importance, 0),
  }));

  categoryScores.sort((a, b) => b.totalImportance - a.totalImportance);
  const topTopics = categoryScores.slice(0, 4);

  const sentences: string[] = [];
  const activeThemes: string[] = [];
  const recentShifts: string[] = [];

  for (const topic of topTopics) {
    const sentence = synthesizeTopic(topic.category, topic.memories);
    if (sentence) {
      sentences.push(sentence);
      activeThemes.push(topic.category.toLowerCase());
    }
  }

  if (personalModel) {
    if (personalModel.lifePhase && personalModel.lifePhaseConfidence > 0.5) {
      sentences.push(`Currently in a phase of ${personalModel.lifePhase}.`);
    }
    if (personalModel.recurringConcerns && personalModel.concernsConfidence > 0.5) {
      sentences.push(`Recurring theme: ${personalModel.recurringConcerns}.`);
    }
  }

  if (goals.length > 0) {
    sentences.push(`Active goals: ${goals.map(g => g.title).join(', ')}.`);
    activeThemes.push('goals');
  }

  const recentMemories = memories.filter(m =>
    m.createdAt > new Date(Date.now() - 48 * 60 * 60 * 1000) && m.importance > 0.7
  );
  for (const mem of recentMemories) {
    recentShifts.push(`${mem.category.toLowerCase()}: ${mem.statement}`);
  }

  const userState = sentences.join(' ') || 'No significant memories yet.';

  const result: SynthesizedContext = { userState, activeThemes, recentShifts: recentShifts.slice(0, 3) };
  await redis.setex(`synthesis:${userId}`, CACHE_TTL_SECONDS, JSON.stringify(result));
  return result;
}

function synthesizeTopic(category: string, memories: Array<{ statement: string }>): string | null {
  if (memories.length === 0) return null;
  const combined = mergeStatements(memories.map(m => m.statement));
  const map: Record<string, string> = {
    CAREER: 'Work', BUSINESS: 'Work', PROJECTS: 'Working on',
    GOALS: 'Goals', EMOTIONS: 'Emotional state', DAILY_REFLECTIONS: 'Emotional state',
    RELATIONSHIPS: 'Relationships', HEALTH: 'Health', FINANCE: 'Financial situation',
    PREFERENCES: 'Preferences', HABITS: 'Preferences', EDUCATION: 'Learning',
    LEARNING: 'Learning', SKILLS: 'Learning', ACHIEVEMENTS: 'Recent wins',
    CONCERNS: 'Concerns', FAILURES: 'Concerns',
  };
  return `${map[category] || category}: ${combined}.`;
}

function mergeStatements(statements: string[]): string {
  const unique: string[] = [];
  for (const stmt of statements) {
    const normalized = stmt.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const isDup = unique.some(u => {
      const un = u.toLowerCase().replace(/[^a-z0-9\s]/g, '');
      return un.includes(normalized) || normalized.includes(un);
    });
    if (!isDup) unique.push(stmt);
  }
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) {
    return `${unique[0]} and ${unique[1].charAt(0).toLowerCase() + unique[1].slice(1)}`;
  }
  const last = unique[unique.length - 1];
  const rest = unique.slice(0, -1).join('; ');
  return `${rest}; and ${last.charAt(0).toLowerCase() + last.slice(1)}`;
}
