// Verification Layer — Source credibility, corroboration, freshness scoring
import { SourceMetadata } from './types';

interface VerificationResult {
  credibilityScore: number;
  isCorroborated: boolean;
  corroboratingCount: number;
  contradictoryCount: number;
  freshnessScore: number;
  overallConfidence: number;
}

/**
 * Verify a cluster of sources reporting the same event.
 */
export function verifySources(sources: SourceMetadata[]): VerificationResult {
  if (sources.length === 0) {
    return {
      credibilityScore: 0,
      isCorroborated: false,
      corroboratingCount: 0,
      contradictoryCount: 0,
      freshnessScore: 0,
      overallConfidence: 0,
    };
  }

  // 1. Source credibility
  const credibilityScores = sources.map((s) => assessSourceCredibility(s));
  const avgCredibility = credibilityScores.reduce((a, b) => a + b, 0) / credibilityScores.length;

  // 2. Corroboration
  const primaryCount = sources.filter((s) => s.sourceType === 'PRIMARY').length;
  const secondaryCount = sources.filter((s) => s.sourceType === 'SECONDARY').length;
  const isCorroborated = primaryCount >= 1 && secondaryCount >= 2;
  const corroboratingCount = sources.length;

  // 3. Freshness
  const now = Date.now();
  const ageHours = sources.map((s) => {
    if (!s.publicationDate) return 48;
    return (now - s.publicationDate.getTime()) / (1000 * 60 * 60);
  });
  const avgAge = ageHours.reduce((a, b) => a + b, 0) / ageHours.length;
  const freshnessScore = Math.max(0, 1 - avgAge / 72); // Decay over 72 hours

  // 4. Overall confidence
  const overallConfidence = Math.min(1, (avgCredibility * 0.4) + (freshnessScore * 0.3) + (isCorroborated ? 0.3 : 0.1));

  return {
    credibilityScore: avgCredibility,
    isCorroborated,
    corroboratingCount,
    contradictoryCount: 0, // Set by contradiction layer
    freshnessScore,
    overallConfidence,
  };
}

function assessSourceCredibility(source: SourceMetadata): number {
  let score = 0.5;

  // Primary sources get a boost
  if (source.sourceType === 'PRIMARY') score += 0.2;

  // Known reputable publishers
  const reputable = [
    'reuters', 'ap news', 'bloomberg', 'financial times', 'economist',
    'nature', 'science', 'bbc', 'al jazeera', 'techcrunch', 'the guardian',
    'forbes', 'wall street journal', 'new york times', 'washington post',
  ];
  if (reputable.some((r) => source.publisher?.toLowerCase().includes(r))) {
    score += 0.15;
  }

  // Has author attribution
  if (source.author && source.author.length > 2) score += 0.05;

  // Recent publication
  if (source.publicationDate) {
    const hoursOld = (Date.now() - source.publicationDate.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 24) score += 0.05;
    else if (hoursOld > 168) score -= 0.1; // Older than 1 week
  }

  return Math.min(1, Math.max(0, score));
}

/**
 * Detect if two sources contradict each other on a specific claim.
 * Returns a contradiction record if detected, null otherwise.
 */
export function detectContradiction(sourceA: SourceMetadata, sourceB: SourceMetadata): { claimA: string; claimB: string; explanation: string } | null {
  // Placeholder: In production, use LLM to compare claims extracted from each source.
  // For now, return null (no contradiction detected) to avoid false positives.
  return null;
}
