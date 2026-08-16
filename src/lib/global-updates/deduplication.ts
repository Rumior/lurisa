// Deduplication Layer — Near-duplicate detection using SimHash + embeddings
import { redis } from '@/lib/redis';
import { RawArticle } from './types';

const DEDUP_HASH_PREFIX = 'global-updates:simhash:';
const SIMILARITY_THRESHOLD = 0.85;

/**
 * Simple SimHash implementation for near-duplicate detection.
 * In production, replace with a proper SimHash or MinHash library.
 */
export async function isDuplicate(article: RawArticle): Promise<{ isDup: boolean; canonicalId?: string }> {
  const fingerprint = await computeFingerprint(article.title + ' ' + article.content);

  // Check against recent fingerprints in Redis
  const recentHashes = await redis.keys(`${DEDUP_HASH_PREFIX}*`);
  if (recentHashes.length === 0) return { isDup: false };

  for (const key of recentHashes) {
    const stored = await redis.get(key);
    if (!stored) continue;
    const similarity = computeJaccardSimilarity(fingerprint, stored);
    if (similarity >= SIMILARITY_THRESHOLD) {
      const canonicalId = key.replace(DEDUP_HASH_PREFIX, '');
      return { isDup: true, canonicalId };
    }
  }

  // Store fingerprint for future comparison (TTL 7 days)
  await redis.setex(`${DEDUP_HASH_PREFIX}${article.id}`, 604800, fingerprint);
  return { isDup: false };
}

async function computeFingerprint(text: string): Promise<string> {
  // Simple n-gram fingerprint. Replace with proper SimHash in production.
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const words = normalized.split(/\s+/).slice(0, 100);
  const shingles = new Set<string>();

  for (let i = 0; i < words.length - 2; i++) {
    shingles.add(words.slice(i, i + 3).join(' '));
  }

  return Array.from(shingles).sort().join('|');
}

function computeJaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split('|'));
  const setB = new Set(b.split('|'));
  const intersection = new Set(Array.from(setA).filter((x) => setB.has(x)));
  const union = new Set(Array.from(setA).concat(Array.from(setB)));
  return intersection.size / union.size;
}

/**
 * Cluster multiple articles into a single event using topic overlap.
 */
export async function clusterArticles(articles: RawArticle[]): Promise<Map<string, RawArticle[]>> {
  const clusters = new Map<string, RawArticle[]>();

  for (const article of articles) {
    let assigned = false;
    for (const [key, group] of Array.from(clusters)) {
      const first = group[0];
      const overlap = topicOverlap(article, first);
      if (overlap > 0.6) {
        group.push(article);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      clusters.set(article.id, [article]);
    }
  }

  return clusters;
}

function topicOverlap(a: RawArticle, b: RawArticle): number {
  const textA = (a.title + ' ' + a.content).toLowerCase();
  const textB = (b.title + ' ' + b.content).toLowerCase();
  const wordsA = new Set(textA.split(/\s+/));
  const wordsB = new Set(textB.split(/\s+/));
  const intersection = new Set(Array.from(wordsA).filter((x) => wordsB.has(x)));
  const union = new Set(Array.from(wordsA).concat(Array.from(wordsB)));
  return intersection.size / union.size;
}

