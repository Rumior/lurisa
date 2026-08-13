// src/lib/initiative/score-engine.ts
// Formal Initiative Score calculation — Spec §11
// INITIATIVE SCORE = Importance × Relevance × Timeliness × UserPref × Context − InterruptionCost

export interface InitiativeContext {
  importance: number;
  relevance: number;
  timeliness: number;
  userPreference: number;
  context: number;
  interruptionCost: number;
  hoursSinceLastContact: number;
}

export function calculateInitiativeScore(ctx: InitiativeContext): number {
  const baseScore =
    ctx.importance * ctx.relevance * ctx.timeliness * ctx.userPreference * ctx.context;
  const interruptionPenalty = 1 - ctx.interruptionCost * 0.5;
  const recencyFactor = Math.min(1, ctx.hoursSinceLastContact / 24);
  const score = baseScore * interruptionPenalty * (0.3 + 0.7 * recencyFactor);
  return Math.round(score * 100) / 100;
}

export function shouldInitiate(score: number, threshold: number = 0.55): boolean {
  return score >= threshold;
}

export function buildMorningCheckInContext(
  hoursSinceContact: number,
  userPreference: number
): InitiativeContext {
  return {
    importance: 0.55,
    relevance: 0.75,
    timeliness: 0.9,
    userPreference,
    context: 0.8,
    interruptionCost: 0.3,
    hoursSinceLastContact: hoursSinceContact,
  };
}

export function buildFollowUpContext(
  memoryImportance: number,
  hoursSinceContact: number,
  userPreference: number
): InitiativeContext {
  return {
    importance: memoryImportance,
    relevance: 0.9,
    timeliness: 0.85,
    userPreference,
    context: 0.7,
    interruptionCost: 0.4,
    hoursSinceLastContact: hoursSinceContact,
  };
}

export function buildEveningReflectionContext(
  hoursSinceContact: number,
  userPreference: number
): InitiativeContext {
  return {
    importance: 0.5,
    relevance: 0.7,
    timeliness: 0.9,
    userPreference,
    context: 0.8,
    interruptionCost: 0.2,
    hoursSinceLastContact: hoursSinceContact,
  };
}

export function buildAnniversaryContext(
  hoursSinceContact: number,
  userPreference: number
): InitiativeContext {
  return {
    importance: 0.7,
    relevance: 0.8,
    timeliness: 1.0,
    userPreference,
    context: 0.9,
    interruptionCost: 0.3,
    hoursSinceLastContact: hoursSinceContact,
  };
}
