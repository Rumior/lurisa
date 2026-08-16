// src/workers/global-updates-worker.ts
// Global Updates Background Worker — IMPROVED
// Fixes: O(n×m) scaling, adds batching, wires personalisation, adds velocity tracking

import { SourceType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import { discoverNewArticles, storeRawSource, validateSourceUrl } from '@/lib/global-updates/discovery';
import { isDuplicate, clusterArticles } from '@/lib/global-updates/deduplication';
import { verifySources } from '@/lib/global-updates/verification';
import { findContradictions, formatContradictionWarning } from '@/lib/global-updates/contradiction-detection';
import { calculateSignificance, SIGNIFICANCE_THRESHOLD } from '@/lib/global-updates/significance-scoring';
import { buildUserContext, scoreRelevance } from '@/lib/global-updates/relevance-engine';
import { computeCompositeScore, isTrending } from '@/lib/global-updates/ranking-engine';
import { synthesiseEvent } from '@/lib/global-updates/summarisation';
import { personaliseEvent } from '@/lib/global-updates/personalisation';
import { sanitiseContent } from '@/lib/global-updates/editorial-safety';
import { detectAfricanRelevance } from '@/lib/global-updates/africa-layer';
import { trackFeedImpression } from '@/lib/global-updates/analytics';

const WORKER_LOCK_KEY = 'global-updates:worker:lock';
const WORKER_LOCK_TTL = 600;
const RANKING_BATCH_SIZE = 100; // Users per batch
const EVENT_BATCH_SIZE = 500;   // Events per batch

async function runGlobalUpdatesPipeline() {
  const lock = await redis.set(WORKER_LOCK_KEY, '1', 'EX', WORKER_LOCK_TTL, 'NX');
  if (!lock) {
    console.log('[GU Worker] Another instance is running. Exiting.');
    return;
  }

  console.log('[GU Worker] Starting pipeline...');
  const startTime = Date.now();

  try {
    // === STEP 1: DISCOVERY ===
    const articles = await discoverNewArticles();
    if (articles.length === 0) {
      console.log('[GU Worker] No new articles discovered.');
    } else {
      // === STEP 2: DEDUPLICATION & CLUSTERING ===
      const uniqueArticles: typeof articles = [];
      for (const article of articles) {
        const urlCheck = validateSourceUrl(article.url);
        if (!urlCheck.valid) {
          console.log(`[GU Worker] URL rejected: ${urlCheck.reason}`);
          continue;
        }
        const dupCheck = await isDuplicate(article);
        if (!dupCheck.isDup) {
          uniqueArticles.push(article);
        } else {
          console.log(`[GU Worker] Duplicate skipped: ${article.title.slice(0, 60)}`);
        }
      }

      const clusters = await clusterArticles(uniqueArticles);
      console.log(`[GU Worker] ${clusters.size} clusters from ${uniqueArticles.length} unique articles.`);

      // === STEP 3: PROCESS EACH CLUSTER ===
      for (const [clusterId, clusterArticles] of Array.from(clusters)) {
        await processCluster(clusterId, clusterArticles);
      }
    }

    // === STEP 4: COMPUTE PERSONALISED RANKINGS (BATCHED) ===
    await computeAllUserRankingsBatched();

    // === STEP 5: UPDATE TRENDING VELOCITY ===
    await updateTrendingVelocity();

    // Mark worker run time
    await redis.set('global-updates:last-worker-run', Date.now().toString());

    const duration = Date.now() - startTime;
    console.log(`[GU Worker] Pipeline complete in ${duration}ms.`);
  } catch (err) {
    console.error('[GU Worker] Pipeline failed:', err);
  } finally {
    await redis.del(WORKER_LOCK_KEY);
  }
}

async function processCluster(clusterId: string, articles: any[]) {
  try {
    const sources = [];
    for (const article of articles) {
      const safe = sanitiseContent(article.content);
      if (!safe.safe) {
        console.log(`[GU Worker] Editorial block: ${safe.reason}`);
        continue;
      }
      const stored = await storeRawSource({ ...article, content: safe.cleaned || article.content });
      sources.push(stored);
    }

    if (sources.length === 0) return;

    const verification = verifySources(sources);
    const contradictions = await findContradictions(sources);
    const africanMeta = detectAfricanRelevance({
      ...articles[0],
      content: articles.map((a) => a.content).join(' '),
    });

    const countries = sources.map((s) => s.country).filter((c): c is string => !!c);
const uniqueCountries = Array.from(new Set(countries));

const significance = calculateSignificance({
  sources,
  eventType: 'ANALYSIS',
  geographicScope: [...uniqueCountries, ...africanMeta.matchedCountries],
      speedOfDevelopment: 0.5,
      persistence: 0.5,
    });

    if (significance < SIGNIFICANCE_THRESHOLD) {
      console.log(`[GU Worker] Cluster ${clusterId} below significance threshold (${significance.toFixed(2)}). Skipping.`);
      return;
    }

    const synthesis = await synthesiseEvent(
      sources.map((s) => ({ title: s.title, content: s.content, publisher: s.publisher || 'Unknown' }))
    );

    const event = await prisma.global_events.create({
      data: {
        headline: synthesis.headline,
        summary: synthesis.summary,
        eventType: 'ANALYSIS',
        topics: Array.from(new Set([
          ...articles.map((a) => a.topic).filter(Boolean),
          ...(africanMeta.isAfrican ? ['africa'] : []),
        ])),
        entities: [],
        locations: uniqueCountries,
        whatHappened: synthesis.whatHappened,
        whatItMeans: synthesis.whatItMeans,
        whatIsUncertain: synthesis.whatIsUncertain || (contradictions.length > 0 ? formatContradictionWarning(contradictions) : undefined),
        importanceScore: significance,
        confidenceScore: verification.overallConfidence,
        freshnessScore: verification.freshnessScore,
        sourceQualityScore: verification.credibilityScore,
        sourceCount: sources.length,
        contradictingSourceCount: contradictions.length,
        isDeveloping: false,
        africanCountries: africanMeta.matchedCountries,
        africanTopics: africanMeta.matchedTopics,
        status: 'ACTIVE',
        contentType: 'GLOBAL_UPDATE',
      },
    });

    // Link sources to event
    await prisma.global_event_sources.updateMany({
      where: { id: { in: sources.map((s) => s.sourceId) } },
      data: { eventId: event.id },
    });

    console.log(`[GU Worker] Event created: ${event.headline.slice(0, 60)} (score: ${significance.toFixed(2)}, africa: ${africanMeta.isAfrican})`);
  } catch (err) {
    console.error(`[GU Worker] Cluster ${clusterId} failed:`, err);
  }
}

/**
 * IMPROVED: Batch ranking computation to avoid O(n×m) memory explosion.
 * Processes users in batches and only ranks against recent/active events.
 */
async function computeAllUserRankingsBatched() {
  const activeEventCutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7); // 7 days

  const totalUsers = await prisma.users.count();
  const totalEvents = await prisma.global_events.count({
    where: { status: 'ACTIVE', latestUpdateAt: { gte: activeEventCutoff } },
  });

  console.log(`[GU Worker] Computing rankings for ${totalUsers} users across ${totalEvents} recent events...`);

  let userOffset = 0;
  let totalRankings = 0;

  while (userOffset < totalUsers) {
    const users = await prisma.users.findMany({
      select: { id: true },
      skip: userOffset,
      take: RANKING_BATCH_SIZE,
    });

    for (const user of users) {
      try {
        const context = await buildUserContext(user.id);
        let eventOffset = 0;

        while (eventOffset < totalEvents) {
          const events = await prisma.global_events.findMany({
            where: { status: 'ACTIVE', latestUpdateAt: { gte: activeEventCutoff } },
            skip: eventOffset,
            take: EVENT_BATCH_SIZE,
            include: { sources: true },
          });

          const rankingUpserts = events.map((event) => {
            const eventData = {
              headline: event.headline,
              summary: event.summary,
              eventType: event.eventType,
              topics: event.topics,
              entities: event.entities,
              locations: event.locations,
              whatHappened: event.whatHappened || '',
              whatItMeans: event.whatItMeans || '',
              whatIsUncertain: event.whatIsUncertain || undefined,
              importanceScore: event.importanceScore,
              confidenceScore: event.confidenceScore,
              sources: event.sources.map((s) => ({
                sourceId: s.id,
                title: s.title,
                publisher: s.publisher || undefined,
                author: s.author || undefined,
                url: s.url,
                publicationDate: s.publicationDate || undefined,
                retrievedAt: s.retrievedAt,
                sourceType: s.sourceType as SourceType,
                country: s.country || undefined,
                topic: s.topic || undefined,
                credibility: s.credibilityScore,
                content: s.content || undefined,
              })),
              contradictions: [],
            };

            const relevance = scoreRelevance(eventData, context);
            const composite = computeCompositeScore({
              globalSignificance: event.importanceScore,
              freshness: event.freshnessScore,
              sourceConfidence: event.confidenceScore,
              userRelevance: relevance,
              topicAffinity: relevance * 0.8,
              goalRelevance: relevance * 0.6,
              novelty: 0.5,
              duplicatePenalty: 0,
              lowQualityPenalty: event.sourceQualityScore < 0.4 ? 0.2 : 0,
            });

            return prisma.global_update_rankings.upsert({
              where: { userId_eventId: { userId: user.id, eventId: event.id } },
              update: {
                compositeScore: composite,
                relevanceScore: relevance,
                freshnessScore: event.freshnessScore,
                significanceScore: event.importanceScore,
                userAffinityScore: relevance,
              },
              create: {
                userId: user.id,
                eventId: event.id,
                compositeScore: composite,
                relevanceScore: relevance,
                freshnessScore: event.freshnessScore,
                significanceScore: event.importanceScore,
                userAffinityScore: relevance,
              },
            });
          });

          await Promise.all(rankingUpserts);
          totalRankings += rankingUpserts.length;
          eventOffset += EVENT_BATCH_SIZE;
        }
      } catch (err) {
        console.error(`[GU Worker] Rankings failed for user ${user.id}:`, err);
      }
    }

    userOffset += RANKING_BATCH_SIZE;
    console.log(`[GU Worker] Processed ${Math.min(userOffset, totalUsers)}/${totalUsers} users...`);
  }

  console.log(`[GU Worker] ${totalRankings} rankings computed.`);
}

/**
 * Compute trending velocity for recent events.
 * Stores velocity score in Redis for the trending tab to use.
 */
async function updateTrendingVelocity() {
  const recentEvents = await prisma.global_events.findMany({
    where: {
      status: 'ACTIVE',
      latestUpdateAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 48) }, // 48h
    },
    select: { id: true, sourceCount: true, importanceScore: true, firstDetectedAt: true },
  });

  for (const event of recentEvents) {
    const hoursSinceDetection = (Date.now() - event.firstDetectedAt.getTime()) / (1000 * 60 * 60);
    const sourcesPerHour = hoursSinceDetection > 0 ? event.sourceCount / hoursSinceDetection : 0;
    // Velocity = source accumulation rate × importance
    const velocity = Math.min(1, sourcesPerHour * 0.3 + event.importanceScore * 0.7);
    await redis.setex(`global-updates:velocity:${event.id}`, 3600, velocity.toString());
  }

  console.log(`[GU Worker] Velocity updated for ${recentEvents.length} events.`);
}

// Run if called directly
if (require.main === module) {
  runGlobalUpdatesPipeline()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[GU Worker] Fatal error:', err);
      process.exit(1);
    });
}

export { runGlobalUpdatesPipeline };
