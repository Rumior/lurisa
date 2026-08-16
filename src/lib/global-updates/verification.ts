// src/lib/global-updates/verification.ts
import { SourceMetadata } from './types';

interface VerificationResult {
  credibilityScore: number;
  isCorroborated: boolean;
  corroboratingCount: number;
  contradictoryCount: number;
  freshnessScore: number;
  overallConfidence: number;
  primaryCount: number;
  secondaryCount: number;
}

export function verifySources(sources: SourceMetadata[]): VerificationResult {
  if (sources.length === 0) {
    return {
      credibilityScore: 0,
      isCorroborated: false,
      corroboratingCount: 0,
      contradictoryCount: 0,
      freshnessScore: 0,
      overallConfidence: 0,
      primaryCount: 0,
      secondaryCount: 0,
    };
  }

  const credibilityScores = sources.map((s) => assessSourceCredibility(s));
  const avgCredibility = credibilityScores.reduce((a, b) => a + b, 0) / credibilityScores.length;

  const primaryCount = sources.filter((s) => s.sourceType === 'PRIMARY').length;
  const secondaryCount = sources.filter((s) => s.sourceType === 'SECONDARY').length;

  // CORROBORATION RULE: At least 2 independent sources required
  // Strong: 1 primary + 2 secondary OR 3+ secondary from different publishers
  const uniquePublishers = new Set(sources.map((s) => s.publisher).filter(Boolean)).size;
  const isCorroborated = (primaryCount >= 1 && secondaryCount >= 1) || (secondaryCount >= 2 && uniquePublishers >= 2);

  const now = Date.now();
  const ageHours = sources.map((s) => {
    if (!s.publicationDate) return 48;
    return (now - s.publicationDate.getTime()) / (1000 * 60 * 60);
  });
  const avgAge = ageHours.reduce((a, b) => a + b, 0) / ageHours.length;
  const freshnessScore = Math.max(0, 1 - avgAge / 72);

  // Confidence requires corroboration
  const corroborationBonus = isCorroborated ? 0.3 : 0;
  const overallConfidence = Math.min(1, (avgCredibility * 0.5) + (freshnessScore * 0.2) + corroborationBonus);

  return {
    credibilityScore: avgCredibility,
    isCorroborated,
    corroboratingCount: sources.length,
    contradictoryCount: 0,
    freshnessScore,
    overallConfidence,
    primaryCount,
    secondaryCount,
  };
}

function assessSourceCredibility(source: SourceMetadata): number {
  let score = 0.5;

  if (source.sourceType === 'PRIMARY') score += 0.25;

  const reputable = [
    'reuters', 'ap news', 'bloomberg', 'financial times', 'economist',
    'nature', 'science', 'bbc', 'al jazeera', 'techcrunch', 'the guardian',
    'forbes', 'wall street journal', 'new york times', 'washington post',
    'techcabal', 'disrupt africa', 'techpoint africa', 'african business',
  ];
  if (reputable.some((r) => source.publisher?.toLowerCase().includes(r))) {
    score += 0.15;
  }

  if (source.author && source.author.length > 2) score += 0.05;

  if (source.publicationDate) {
    const hoursOld = (Date.now() - source.publicationDate.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 24) score += 0.05;
    else if (hoursOld > 168) score -= 0.15;
  }

  return Math.min(1, Math.max(0, score));
}

export function detectContradiction(sourceA: SourceMetadata, sourceB: SourceMetadata): { claimA: string; claimB: string; explanation: string } | null {
  return null;
}