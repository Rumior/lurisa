interface ImportanceFactors {
  baseImportance: number;
  categoryWeight: number;
  emotionalBoost: number;
  recurrenceBoost: number;
  recencyDecay: number;
  userEditBoost: number;
}

const CATEGORY_WEIGHTS: Record<string, number> = {
  IDENTITY: 1.0, RELATIONSHIPS: 0.9, VALUES: 0.9, GOALS: 0.85, HEALTH: 0.8,
  CAREER: 0.8, ACHIEVEMENTS: 0.75, FAILURES: 0.75, LESSONS: 0.7, STORIES: 0.7,
  DREAMS: 0.6, EMOTIONS: 0.6, PROJECTS: 0.6, EDUCATION: 0.55, FINANCE: 0.55,
  SKILLS: 0.55, HABITS: 0.5, PREFERENCES: 0.45, INTERESTS: 0.45, TRAVEL: 0.4,
  READING: 0.4, LEARNING: 0.4, DAILY_REFLECTIONS: 0.35, TIMELINE: 0.3,
};

const EMOTIONAL_BOOSTS: Record<string, number> = {
  excited: 0.15, grateful: 0.12, hopeful: 0.12, proud: 0.15, love: 0.1,
  passionate: 0.1, anxious: 0.08, stressed: 0.05, sad: 0.05, angry: 0.05, fear: 0.08,
};

export function calculateImportance(factors: ImportanceFactors): number {
  const score = factors.baseImportance * factors.categoryWeight * (1 + factors.emotionalBoost) * (1 + factors.recurrenceBoost) * factors.recencyDecay + factors.userEditBoost;
  return Math.min(1, Math.max(0, score));
}

export function computeRecencyDecay(createdAt: Date, memoryType: string, lastReinforcedAt?: Date | null): number {
  const referenceDate = lastReinforcedAt || createdAt;
  const daysSince = (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
  const halfLife = memoryType === 'TEMPORARY' ? 7 : 30;
  return Math.exp(-daysSince / halfLife);
}

export function getCategoryWeight(category: string): number {
  return CATEGORY_WEIGHTS[category] || 0.5;
}

export function getEmotionalBoost(emotion?: string): number {
  if (!emotion) return 0;
  return EMOTIONAL_BOOSTS[emotion.toLowerCase()] || 0.05;
}

export function computeRecurrenceBoost(reinforcementCount: number): number {
  return Math.min(0.3, reinforcementCount * 0.05);
}

export function computeRetrievalScore(params: { importance: number; recencyScore: number; relevanceScore: number; graphProximityScore?: number }): number {
  const { importance, recencyScore, relevanceScore, graphProximityScore = 0 } = params;
  return importance * recencyScore * 0.4 + relevanceScore * 0.35 + graphProximityScore * 0.25;
}
