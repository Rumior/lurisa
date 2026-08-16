// src/lib/global-updates/relevance-engine.ts
// Personal Relevance Engine — CORRECTED
// Uses Personal Model (privacy boundary) + explicit signals per spec Section 10

import { prisma } from '@/lib/db';
import { UserRelevanceContext, ExtractedEvent } from './types';

export async function buildUserContext(userId: string): Promise<UserRelevanceContext> {
  const [interests, goals, recentResearch, personalModel, recentConversations] = await Promise.all([
    prisma.user_interests.findMany({ where: { userId, isFollowed: true, isHidden: false } }),
    prisma.goals.findMany({ where: { userId, status: 'ACTIVE' } }),
    prisma.research_sessions.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.user_personal_models.findUnique({ where: { userId } }),
    // "Recurring conversation topics" — permitted per spec Section 10
    prisma.conversations.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { title: true, summary: true },
    }),
  ]);

  // Build recurring topics from conversation metadata (titles/summaries), NOT raw messages
  const conversationTopics = recentConversations
    .flatMap((c) => [c.title, c.summary])
    .filter((s): s is string => !!s && s.length > 3);

  return {
    userId,
    interests: interests.map((i) => i.topic),
    goals: goals.map((g) => g.title),
    projects: goals.map((g) => g.description).filter(Boolean) as string[],
    recentResearch: recentResearch.map((r) => r.query),
    // Personal Model fields — the privacy-respecting bridge per Section 25
    professionalInterests: personalModel?.workInterests || undefined,
    currentGoalsSummary: personalModel?.currentGoalsSummary || undefined,
    recurringConcerns: personalModel?.recurringConcerns || undefined,
    lifePhase: personalModel?.lifePhase || undefined,
    decisionMaking: personalModel?.decisionMaking || undefined,
    communicationStyle: personalModel?.communicationStyle || undefined,
    importantRelationships: personalModel?.importantRelationships || undefined,
    preferredInteraction: personalModel?.preferredInteraction || undefined,
    // Permitted lightweight conversation signals
    recentConversationTopics: conversationTopics,
  };
}

export function scoreRelevance(event: ExtractedEvent, context: UserRelevanceContext): number {
  let score = 0;

  // 1. Explicit interests (max 0.35) — user control dominant per spec
  const interestOverlap = event.topics.filter((t) =>
    context.interests.some((i) => t.toLowerCase().includes(i.toLowerCase()) || i.toLowerCase().includes(t.toLowerCase()))
  ).length;
  score += Math.min(1, interestOverlap / 3) * 0.35;

  // 2. Personal Model — professional interests (max 0.15)
  if (context.professionalInterests) {
    const profText = context.professionalInterests.toLowerCase();
    const profOverlap = event.topics.filter((t) => profText.includes(t.toLowerCase())).length;
    score += Math.min(1, profOverlap / 2) * 0.15;
  }

  // 3. Personal Model — current goals summary (max 0.15)
  if (context.currentGoalsSummary) {
    const goalsText = context.currentGoalsSummary.toLowerCase();
    const goalsOverlap = event.topics.filter((t) => goalsText.includes(t.toLowerCase())).length;
    score += Math.min(1, goalsOverlap / 2) * 0.15;
  }

  // 4. Personal Model — recurring concerns (max 0.1)
  if (context.recurringConcerns) {
    const concernsText = context.recurringConcerns.toLowerCase();
    const concernsOverlap = event.topics.filter((t) => concernsText.includes(t.toLowerCase())).length;
    score += Math.min(1, concernsOverlap / 2) * 0.1;
  }

  // 5. Active goals (max 0.15)
  const goalText = context.goals.join(' ').toLowerCase();
  const goalOverlap = event.entities.filter((e) => goalText.includes(e.toLowerCase())).length;
  score += Math.min(1, goalOverlap / 2) * 0.15;

  // 6. Recent research (max 0.1)
  const researchText = context.recentResearch.join(' ').toLowerCase();
  const researchOverlap = event.topics.filter((t) => researchText.includes(t.toLowerCase())).length;
  score += Math.min(1, researchOverlap / 2) * 0.1;

  return Math.min(1, Math.max(0, score));
}