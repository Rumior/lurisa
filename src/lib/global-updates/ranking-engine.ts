// Ranking Engine — Composite scoring for personalized feed
import { RankingFactors } from './types';

/**
 * Compute composite ranking score from individual factors.
 */
export function computeCompositeScore(factors: RankingFactors): number {
  const {
    globalSignificance,
    freshness,
    sourceConfidence,
    userRelevance,
    topicAffinity,
    goalRelevance,
    novelty,
    duplicatePenalty,
    lowQualityPenalty,
  } = factors;

  const score =
    globalSignificance * 0.25 +
    freshness * 0.20 +
    sourceConfidence * 0.20 +
    userRelevance * 0.20 +
    topicAffinity * 0.08 +
    goalRelevance * 0.05 +
    novelty * 0.02 -
    duplicatePenalty -
    lowQualityPenalty;

  return Math.max(0, Math.min(1, score));
}

/**
 * Determine if an event should appear in the Trending tab.
 */
export function isTrending(factors: RankingFactors, velocity: number): boolean {
  // Trending = rapid coverage increase + high significance + geographic spread
  return velocity > 0.7 && factors.globalSignificance > 0.5 && factors.freshness > 0.6;
}
