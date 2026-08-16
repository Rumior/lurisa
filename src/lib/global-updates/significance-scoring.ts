// src/lib/global-updates/significance-scoring.ts
import { EventType } from '@prisma/client';
import { SourceMetadata } from './types';

interface SignificanceInput {
  sources: SourceMetadata[];
  eventType: EventType;
  geographicScope: string[];
  economicMagnitude?: number;
  socialMagnitude?: number;
  speedOfDevelopment: number;
  persistence: number;
}

export function calculateSignificance(input: SignificanceInput): number {
  const { sources, eventType, geographicScope, economicMagnitude, socialMagnitude, speedOfDevelopment, persistence } = input;

  // HARD GATE: Single source stories are automatically insignificant
  if (sources.length < 2) return 0;

  // Source volume & quality (max 0.3) — requires 5+ sources for full score
  const sourceScore = Math.min(1, sources.length / 5) * 0.3;

  // Source credibility (max 0.25) — requires avg 0.8+ for full score
  const avgCredibility = sources.reduce((sum, s) => sum + s.credibility, 0) / sources.length;
  const credibilityScore = avgCredibility * 0.25;

  // Geographic impact (max 0.15)
  const geoScore = Math.min(1, geographicScope.length / 3) * 0.15;

  // Economic/social magnitude (max 0.15) — NO defaults. If unknown, it's 0.
  const magnitudeScore = ((economicMagnitude ?? 0) + (socialMagnitude ?? 0)) / 2 * 0.15;

  // Speed & persistence (max 0.15)
  const velocityScore = ((speedOfDevelopment || 0.5) + (persistence || 0.5)) / 2 * 0.15;

  let total = sourceScore + credibilityScore + geoScore + magnitudeScore + velocityScore;

  // Boost for breaking news with strong corroboration
  if (eventType === 'BREAKING' && sources.length >= 5) total += 0.05;

  // Severe penalty for thin sourcing
  if (sources.length === 2) total *= 0.7;
  if (sources.length === 3) total *= 0.85;

  return Math.min(1, Math.max(0, total));
}

export const SIGNIFICANCE_THRESHOLD = 0.45;