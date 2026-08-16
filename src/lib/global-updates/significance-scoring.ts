// Significance Scoring Layer
import { EventType } from '@prisma/client';
import { SourceMetadata } from './types';

interface SignificanceInput {
  sources: SourceMetadata[];
  eventType: EventType;
  geographicScope: string[];
  economicMagnitude?: number; // 0-1 estimated impact
  socialMagnitude?: number;
  speedOfDevelopment: number; // 0-1 how fast story is evolving
  persistence: number; // 0-1 how long story has been relevant
}

/**
 * Calculate global significance score (0-1).
 * Prevents noisy, low-impact stories from flooding the feed.
 */
export function calculateSignificance(input: SignificanceInput): number {
  const { sources, eventType, geographicScope, economicMagnitude, socialMagnitude, speedOfDevelopment, persistence } = input;

  // Source volume & quality (max 0.3)
  const sourceScore = Math.min(1, sources.length / 10) * 0.3;

  // Source credibility (max 0.25)
  const avgCredibility = sources.reduce((sum, s) => sum + s.credibility, 0) / (sources.length || 1);
  const credibilityScore = avgCredibility * 0.25;

  // Geographic impact (max 0.15)
  const geoScore = Math.min(1, geographicScope.length / 5) * 0.15;

  // Economic/social magnitude (max 0.15)
  const magnitudeScore = ((economicMagnitude || 0.3) + (socialMagnitude || 0.3)) / 2 * 0.15;

  // Speed & persistence (max 0.15)
  const velocityScore = ((speedOfDevelopment || 0.5) + (persistence || 0.5)) / 2 * 0.15;

  let total = sourceScore + credibilityScore + geoScore + magnitudeScore + velocityScore;

  // Boost for breaking news
  if (eventType === 'BREAKING') total += 0.05;

  // Penalty for single-source stories
  if (sources.length < 2) total *= 0.6;

  return Math.min(1, Math.max(0, total));
}

/**
 * Minimum significance threshold for an event to become a Global Update.
 */
export const SIGNIFICANCE_THRESHOLD = 0.40;
