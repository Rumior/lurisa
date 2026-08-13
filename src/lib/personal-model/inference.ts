// src/lib/personal-model/inference.ts
// Infers personal model attributes from conversation patterns — Spec §20
// Runs every 5 user messages to save API calls (free tier friendly)

import { prisma } from '@/lib/db';
import { PersonalModel } from './types';
import { ConversationMode, UserEmotion } from '@/lib/conversation/types';
import { updatePersonalModel } from './store';

export async function inferPersonalModelUpdates(
  userId: string,
  userMessage: string,
  assistantResponse: string,
  mode: ConversationMode,
  emotion: UserEmotion
): Promise<void> {
  const messageCount = await prisma.messages.count({
    where: { userId, role: 'USER' },
  });
  if (messageCount % 5 !== 0) return;

  const recentMessages = await prisma.messages.findMany({
    where: { userId, role: 'USER' },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { content: true },
  });

  const recentMemories = await prisma.memories.findMany({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { category: true, statement: true, importance: true },
  });

  const currentModel = await prisma.user_personal_models.findUnique({
    where: { userId },
  });

  const updates: Partial<PersonalModel> = {};

  const avgLength =
    recentMessages.reduce((sum, m) => sum + m.content.length, 0) /
    Math.max(1, recentMessages.length);
  const detailRequests = recentMessages.filter((m) =>
    /explain|details|elaborate|tell me more|why|how does|break it down/i.test(m.content)
  ).length;

  if (avgLength > 200 && detailRequests > 3) {
    updates.communicationStyle = 'detailed';
    updates.communicationConfidence = Math.min(
      1,
      (currentModel?.communicationConfidence || 0) + 0.15
    );
  } else if (avgLength < 50) {
    updates.communicationStyle = 'concise';
    updates.communicationConfidence = Math.min(
      1,
      (currentModel?.communicationConfidence || 0) + 0.15
    );
  }

  const comparativeLanguage = recentMessages.filter((m) =>
    /compare|versus|vs|pros and cons|alternatives|options|should i|better to/i.test(m.content)
  ).length;
  if (comparativeLanguage > 3) {
    updates.decisionMaking = 'comparative';
    updates.decisionConfidence = Math.min(
      1,
      (currentModel?.decisionConfidence || 0) + 0.15
    );
  }

  const careerMemories = recentMemories.filter((m) => m.category === 'CAREER');
  if (careerMemories.length > 0) {
    const topics = careerMemories
      .map((m) => m.statement)
      .join('; ')
      .slice(0, 200);
    updates.workInterests = topics;
    updates.workConfidence = Math.min(1, (currentModel?.workConfidence || 0) + 0.1);
  }

  const goalMemories = recentMemories.filter((m) => m.category === 'GOALS');
  if (goalMemories.length > 0) {
    const goals = goalMemories
      .map((m) => m.statement)
      .join('; ')
      .slice(0, 200);
    updates.currentGoalsSummary = goals;
    updates.goalsConfidence = Math.min(1, (currentModel?.goalsConfidence || 0) + 0.1);
  }

  const concernKeywords = ['stressed', 'anxious', 'worried', 'tired', 'overwhelmed', 'frustrated'];
  const concernCount = recentMemories.filter((m) =>
    concernKeywords.some((k) => m.statement.toLowerCase().includes(k))
  ).length;
  if (concernCount >= 3) {
    updates.recurringConcerns = 'stress and anxiety';
    updates.concernsConfidence = Math.min(
      1,
      (currentModel?.concernsConfidence || 0) + 0.15
    );
  }

  if (mode === 'ANALYTICAL' || mode === 'PROFESSIONAL') {
    updates.preferredInteraction = 'analytical';
    updates.interactionConfidence = Math.min(
      1,
      (currentModel?.interactionConfidence || 0) + 0.1
    );
  } else if (emotion === 'sad' || emotion === 'anxious') {
    updates.preferredInteraction = 'supportive';
    updates.interactionConfidence = Math.min(
      1,
      (currentModel?.interactionConfidence || 0) + 0.1
    );
  }

  const categoryCounts: Record<string, number> = {};
  for (const mem of recentMemories) {
    categoryCounts[mem.category] = (categoryCounts[mem.category] || 0) + 1;
  }
  const dominant = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (dominant) {
    const phaseMap: Record<string, string> = {
      CAREER: 'career development',
      EDUCATION: 'education and learning',
      RELATIONSHIPS: 'relationship building',
      GOALS: 'goal pursuit',
      BUSINESS: 'business development',
      HEALTH: 'health and wellness focus',
      FINANCE: 'financial planning',
    };
    if (phaseMap[dominant]) {
      updates.lifePhase = phaseMap[dominant];
      updates.lifePhaseConfidence = Math.min(
        1,
        (currentModel?.lifePhaseConfidence || 0) + 0.1
      );
    }
  }

  const relationshipMemories = recentMemories.filter(
    (m) => m.category === 'RELATIONSHIPS'
  );
  if (relationshipMemories.length > 0) {
    const names = extractNames(
      relationshipMemories.map((m) => m.statement).join(' ')
    );
    if (names.length > 0) {
      updates.importantRelationships = names.slice(0, 5).join(', ');
      updates.relationshipsConfidence = Math.min(
        1,
        (currentModel?.relationshipsConfidence || 0) + 0.1
      );
    }
  }

  if (Object.keys(updates).length > 0) {
    await updatePersonalModel(userId, updates);
    console.log('[PERSONAL MODEL] Updated for user', userId, Object.keys(updates));
  }
}

function extractNames(text: string): string[] {
  const commonWords = new Set([
    'The', 'A', 'An', 'I', 'You', 'He', 'She', 'They', 'We', 'It',
    'This', 'That', 'My', 'Your', 'His', 'Her', 'Their', 'Our',
    'And', 'But', 'Or', 'For', 'With', 'About', 'From', 'To', 'In', 'On', 'At', 'By', 'As', 'Of',
  ]);
  const words = text.match(/\b[A-Z][a-z]{1,15}\b/g) || [];
  const names = words.filter((w) => !commonWords.has(w));
  return Array.from(new Set(names));
}
