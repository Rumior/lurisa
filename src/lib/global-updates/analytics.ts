// src/lib/global-updates/analytics.ts
// Analytics aggregation — editorial and sponsored metrics kept separate

import { prisma } from '@/lib/db';

export interface FeedMetrics {
  totalImpressions: number;
  uniqueOpens: number;
  saveRate: number;
  researchRate: number;
  avgRelevanceScore: number;
  freshnessScore: number;
}

export interface SponsoredMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  revenue: number;
}

/**
 * Aggregate editorial performance metrics for a given time window.
 */
export async function getEditorialMetrics(
  startDate: Date,
  endDate: Date
): Promise<FeedMetrics> {
  const rows = await prisma.global_update_analytics.groupBy({
    by: ['eventId'],
    where: {
      sponsored: false,
      impressionAt: { gte: startDate, lte: endDate },
    },
    _count: { eventId: true },
  });

  const impressions = rows.reduce((sum, r) => sum + r._count.eventId, 0);

  const opens = await prisma.global_update_analytics.count({
    where: { sponsored: false, openAt: { not: null }, impressionAt: { gte: startDate, lte: endDate } },
  });

  const saves = await prisma.global_update_analytics.count({
    where: { sponsored: false, saveAt: { not: null }, impressionAt: { gte: startDate, lte: endDate } },
  });

  const research = await prisma.global_update_analytics.count({
    where: { sponsored: false, researchAt: { not: null }, impressionAt: { gte: startDate, lte: endDate } },
  });

  return {
    totalImpressions: impressions,
    uniqueOpens: opens,
    saveRate: impressions > 0 ? saves / impressions : 0,
    researchRate: impressions > 0 ? research / impressions : 0,
    avgRelevanceScore: 0, // Computed from rankings table in full implementation
    freshnessScore: 0,    // Computed from event ages in full implementation
  };
}

/**
 * Aggregate sponsored content performance.
 * Kept strictly separate from editorial metrics.
 */
export async function getSponsoredMetrics(
  startDate: Date,
  endDate: Date
): Promise<SponsoredMetrics> {
  const impressions = await prisma.global_update_analytics.count({
    where: { sponsored: true, impressionAt: { gte: startDate, lte: endDate } },
  });

  const clicks = await prisma.global_update_analytics.count({
    where: { sponsored: true, openAt: { not: null }, impressionAt: { gte: startDate, lte: endDate } },
  });

  return {
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : 0,
    revenue: 0, // Populated from ad server reconciliation
  };
}

/**
 * Track a feed-level impression (not tied to a specific event).
 * Uses a separate tracking approach to avoid FK issues.
 */
export async function trackFeedImpression(
  userId: string,
  tab: string
): Promise<void> {
  // Use a lightweight Redis counter instead of DB row to avoid FK issues
  const { redis } = await import('@/lib/redis');
  const key = `analytics:feed-impressions:${new Date().toISOString().slice(0, 10)}:${tab}`;
  await redis.incr(key);
  await redis.expire(key, 86400 * 30); // 30 days
}
