// src/lib/global-updates/discovery.ts
// Discovery Layer — Source ingestion pipeline (IMPROVED)
// Adds: RSS support, African outlets, URL validation, primary source detection

import { SourceType } from '@prisma/client';
import Parser from 'rss-parser';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import { RawArticle, SourceMetadata } from './types';
import { AFRICAN_RSS_FEEDS, AFRICAN_PRIMARY_SOURCES, detectAfricanRelevance } from './africa-layer';

const rssParser = new Parser({ timeout: 15000 });

const DISCOVERY_LOCK_TTL = 300;
const MAX_SOURCES_PER_RUN = 50;
const URL_MAX_LENGTH = 2048;

interface NewsApiResponse {
  articles: Array<{
    title: string;
    description: string;
    url: string;
    publishedAt: string;
    source: { name: string };
    author?: string;
    content?: string;
  }>;
}

export function validateSourceUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, reason: 'Invalid protocol' };
    }
    if (url.length > URL_MAX_LENGTH) {
      return { valid: false, reason: 'URL too long' };
    }
    const blockedDomains = ['localhost', '127.0.0.1', '0.0.0.0', 'file://'];
    if (blockedDomains.some((d) => parsed.hostname.includes(d))) {
      return { valid: false, reason: 'Blocked domain' };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Malformed URL' };
  }
}

export function detectSourceType(url: string, publisher: string): SourceType {
  const lowerUrl = url.toLowerCase();
  const lowerPub = publisher.toLowerCase();

  if (lowerUrl.match(/\.gov\./) || lowerUrl.match(/\.go\./)) return 'PRIMARY';
  if (lowerPub.match(/\b(central bank|ministry|bureau of statistics|sec|fda|who|un\s)\b/)) return 'PRIMARY';
  if (lowerUrl.match(/\.edu/) || lowerUrl.match(/\.ac\./)) return 'PRIMARY';
  if (lowerPub.match(/\b(university|institute|journal|arxiv|pubmed)\b/)) return 'PRIMARY';
  if (AFRICAN_PRIMARY_SOURCES.some((s) => lowerUrl.includes(s.domain))) return 'PRIMARY';
  if (lowerPub.match(/\b(press release|announcement|official)\b/)) return 'PRIMARY';

  return 'SECONDARY';
}

export async function discoverNewArticles(): Promise<RawArticle[]> {
  const lockKey = 'global-updates:discovery:lock';
  const acquired = await redis.set(lockKey, '1', 'EX', DISCOVERY_LOCK_TTL, 'NX');
  if (!acquired) {
    console.log('[GlobalUpdates] Discovery already running, skipping.');
    return [];
  }

  try {
    const articles: RawArticle[] = [];

    // 1. NewsAPI (global headlines)
    const newsApiArticles = await fetchFromNewsApi();
    articles.push(...newsApiArticles);

    // 2. RSS feeds (African + specialist)
    const rssArticles = await fetchFromRssFeeds();
    articles.push(...rssArticles);

    // 3. Deduplicate by URL
    const seen = new Set<string>();
    const unique = articles.filter((a) => {
      if (seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });

    console.log(`[GlobalUpdates] Discovered ${unique.length} unique articles (${rssArticles.length} from RSS).`);
    return unique.slice(0, MAX_SOURCES_PER_RUN);
  } finally {
    await redis.del(lockKey);
  }
}

async function fetchFromNewsApi(): Promise<RawArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.log('[GlobalUpdates] NEWS_API_KEY not set, skipping NewsAPI.');
    return [];
  }

  const categories = ['technology', 'business', 'science'];
  const all: RawArticle[] = [];

  for (const category of categories) {
    try {
      const res = await fetch(
        `https://newsapi.org/v2/top-headlines?category=${category}&pageSize=20&apiKey=${apiKey}`,
        { next: { revalidate: 300 } }
      );
      if (!res.ok) {
        console.warn(`[GlobalUpdates] NewsAPI ${category} returned ${res.status}`);
        continue;
      }
      const data = (await res.json()) as NewsApiResponse;

      for (const article of data.articles || []) {
        if (!article.url || !article.title) continue;
        const urlCheck = validateSourceUrl(article.url);
        if (!urlCheck.valid) {
          console.log(`[GlobalUpdates] URL validation failed: ${urlCheck.reason}`);
          continue;
        }

        const sourceType = detectSourceType(article.url, article.source?.name || '');
        all.push({
          id: `newsapi-${Buffer.from(article.url).toString('base64').slice(0, 16)}`,
          url: article.url,
          title: article.title,
          content: article.description || article.content || '',
          publishedAt: article.publishedAt ? new Date(article.publishedAt) : undefined,
          publisher: article.source?.name || 'Unknown',
          author: article.author || undefined,
          sourceType,
          topic: category,
        });
      }
    } catch (err) {
      console.error(`[GlobalUpdates] NewsAPI fetch failed for ${category}:`, err);
    }
  }

  return all;
}

/**
 * Fetch articles from African RSS feeds using rss-parser.
 */
async function fetchFromRssFeeds(): Promise<RawArticle[]> {
  const all: RawArticle[] = [];

  for (const feed of AFRICAN_RSS_FEEDS) {
    try {
      const parsed = await rssParser.parseURL(feed.url);
      const items = parsed.items || [];

      for (const item of items.slice(0, 10)) {
        if (!item.link || !item.title) continue;

        const urlCheck = validateSourceUrl(item.link);
        if (!urlCheck.valid) {
          console.log(`[GlobalUpdates] RSS URL rejected: ${urlCheck.reason} — ${item.link.slice(0, 60)}`);
          continue;
        }

        const pubDate = item.pubDate || item.isoDate;
        all.push({
          id: `rss-${feed.publisher}-${Buffer.from(item.link).toString('base64').slice(0, 12)}`,
          url: item.link,
          title: item.title,
          content: item.contentSnippet || item.content || '',
          publishedAt: pubDate ? new Date(pubDate) : undefined,
          publisher: feed.publisher,
          author: item.creator || item.author || undefined,
          sourceType: 'SECONDARY',
          topic: feed.topic,
          country: feed.country,
        });
      }

      console.log(`[GlobalUpdates] RSS fetched: ${feed.publisher} — ${items.length} items (${all.length} valid so far)`);
    } catch (err: any) {
      // Graceful per-feed failure
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        console.warn(`[GlobalUpdates] RSS timeout: ${feed.publisher}`);
      } else if (err.message?.includes('Status code')) {
        console.warn(`[GlobalUpdates] RSS HTTP error: ${feed.publisher} — ${err.message}`);
      } else {
        console.warn(`[GlobalUpdates] RSS fetch failed: ${feed.publisher} — ${err.message || err}`);
      }
    }
  }

  return all;
}

export async function storeRawSource(
  article: RawArticle,
  eventId?: string
): Promise<SourceMetadata> {
  const data: any = {
    title: article.title,
    url: article.url,
    publisher: article.publisher,
    author: article.author,
    publicationDate: article.publishedAt,
    sourceType: article.sourceType,
    country: article.country,
    topic: article.topic,
    content: article.content,
    retrievedAt: new Date(),
    credibilityScore: 0.5,
    relevanceScore: 0.5,
  };

  if (eventId && eventId !== 'pending' && eventId.length === 36) {
    data.eventId = eventId;
  }

  const source = await prisma.global_event_sources.create({ data });

  return {
    sourceId: source.id,
    title: source.title,
    publisher: source.publisher || undefined,
    author: source.author || undefined,
    url: source.url,
    publicationDate: source.publicationDate || undefined,
    retrievedAt: source.retrievedAt,
    sourceType: source.sourceType as SourceType,
    country: source.country || undefined,
    topic: source.topic || undefined,
    credibility: source.credibilityScore,
    content: source.content || undefined,
  };
}
