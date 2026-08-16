// src/lib/global-updates/advertising.ts
// Sponsored content management — clearly separated from editorial intelligence

import { prisma } from '@/lib/db';
import { deriveAudienceSegments, AdTargetingContext } from './privacy-boundary';
import { UserRelevanceContext } from './types';

export interface SponsoredSlot {
  id: string;
  headline: string;
  summary: string;
  advertiserName: string;
  landingUrl: string;
  imageUrl?: string;
  contentType: 'SPONSORED';
  whyAmISeeingThis: string;
  segments: string[];
}

export interface FeedMixConfig {
  editorialRatio: number; // e.g. 0.8 = 80% editorial
  maxSponsoredPerPage: number;
  minEditorialBeforeSponsored: number;
}

const DEFAULT_MIX: FeedMixConfig = {
  editorialRatio: 0.85,
  maxSponsoredPerPage: 2,
  minEditorialBeforeSponsored: 3,
};

/**
 * Fetch sponsored content relevant to the user's audience segments.
 * NEVER uses raw personal data — only derived segments.
 */
export async function fetchSponsoredContent(
  userContext: UserRelevanceContext,
  limit: number = 2
): Promise<SponsoredSlot[]> {
  const targeting = deriveAudienceSegments(userContext);

  // In production, this queries an ad server or sponsored content table
  // For now, we query the global_events table for pre-approved sponsored content
  const sponsored = await prisma.global_events.findMany({
    where: {
      contentType: 'SPONSORED',
      status: 'ACTIVE',
      // Match sponsored content to audience segments via topics
      topics: { hasSome: targeting.segments.map((s) => s.toLowerCase().replace('_', '-')) },
    },
    orderBy: { importanceScore: 'desc' },
    take: limit,
    select: {
      id: true,
      headline: true,
      summary: true,
      topics: true,
      whatHappened: true,
    },
  });

  return sponsored.map((s) => ({
    id: s.id,
    headline: s.headline,
    summary: s.summary.slice(0, 200),
    advertiserName: s.topics.find((t) => t.startsWith('adv:'))?.replace('adv:', '') || 'Partner',
    landingUrl: '#', // Populated from ad server in production
    contentType: 'SPONSORED',
    whyAmISeeingThis: `Shown to ${targeting.segments.join(', ').toLowerCase().replace(/_/g, ' ')} audiences`,
    segments: targeting.segments,
  }));
}

/**
 * Mix sponsored slots into an editorial feed respecting ratio and placement rules.
 */
export function mixSponsoredContent<T extends { contentType?: string }>(
  editorial: T[],
  sponsored: SponsoredSlot[],
  config: FeedMixConfig = DEFAULT_MIX
): Array<T | SponsoredSlot> {
  if (sponsored.length === 0) return editorial;

  const result: Array<T | SponsoredSlot> = [];
  let editorialCount = 0;
  let sponsoredCount = 0;
  let sponsoredIndex = 0;

  for (const item of editorial) {
    result.push(item);
    editorialCount++;

    // Insert sponsored after minimum editorial threshold and at intervals
    if (
      sponsoredIndex < sponsored.length &&
      sponsoredCount < config.maxSponsoredPerPage &&
      editorialCount >= config.minEditorialBeforeSponsored &&
      editorialCount % Math.ceil(1 / (1 - config.editorialRatio)) === 0
    ) {
      result.push(sponsored[sponsoredIndex]);
      sponsoredIndex++;
      sponsoredCount++;
    }
  }

  return result;
}

/**
 * Track sponsored content impression separately from editorial.
 * Section 26: Keep editorial ranking metrics separate from advertising.
 */
export async function trackSponsoredImpression(
  eventId: string,
  userId: string,
  segments: string[]
): Promise<void> {
  await prisma.global_update_analytics.create({
    data: {
      eventId,
      userId,
      impressionAt: new Date(),
      sponsored: true,
      topic: segments.join(','),
    },
  });
}
