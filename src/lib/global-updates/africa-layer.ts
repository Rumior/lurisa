// src/lib/global-updates/africa-layer.ts
// Dedicated African market intelligence: discovery, filtering, and relevance

import { RawArticle } from './types';

export const AFRICAN_COUNTRIES = [
  'Kenya', 'Nigeria', 'Ghana', 'South Africa', 'Ethiopia',
  'Tanzania', 'Rwanda', 'Uganda', 'Egypt', 'Morocco',
  'Algeria', 'Tunisia', 'Senegal', 'Ivory Coast', 'Cameroon',
  'Zambia', 'Zimbabwe', 'Botswana', 'Namibia', 'Mozambique',
];

export const AFRICAN_TOPICS = [
  'African business', 'African technology', 'African finance',
  'African policy', 'African entrepreneurship', 'African fashion',
  'African science', 'African culture', 'AfCFTA', 'Nigerian tech',
  'Kenyan startup', 'Ghanaian business', 'South African market',
];

/**
 * RSS feeds for African news outlets and aggregators.
 * Extend with real endpoints in production.
 */
export const AFRICAN_RSS_FEEDS: Array<{ url: string; publisher: string; country: string; topic: string }> = [
  { url: 'https://techcabal.com/feed/', publisher: 'TechCabal', country: 'Nigeria', topic: 'African technology' },
  { url: 'https://disrupt-africa.com/feed/', publisher: 'Disrupt Africa', country: 'South Africa', topic: 'African business' },
  { url: 'https://techpoint.africa/feed/', publisher: 'Techpoint Africa', country: 'Nigeria', topic: 'African technology' },
  { url: 'https://www.busiweek.com/feed/', publisher: 'Business Week', country: 'Uganda', topic: 'African business' },
  { url: 'https://www.theeastafrican.co.ke/rss.xml', publisher: 'The East African', country: 'Kenya', topic: 'African policy' },
  { url: 'https://www.africanbusinessmagazine.com/feed/', publisher: 'African Business', country: 'UK', topic: 'African business' },
  { url: 'https://qz.com/africa/feed', publisher: 'Quartz Africa', country: 'Nigeria', topic: 'African business' },
];

/**
 * Detect if an article is Africa-relevant based on content and metadata.
 */
export function detectAfricanRelevance(article: RawArticle): {
  isAfrican: boolean;
  matchedCountries: string[];
  matchedTopics: string[];
} {
  const text = `${article.title} ${article.content} ${article.topic || ''}`.toLowerCase();
  const matchedCountries = AFRICAN_COUNTRIES.filter((c) => text.includes(c.toLowerCase()));
  const matchedTopics = AFRICAN_TOPICS.filter((t) => text.includes(t.toLowerCase()));

  const isAfrican = matchedCountries.length > 0 || matchedTopics.length > 0 ||
    text.includes('africa') || text.includes('african');

  return { isAfrican, matchedCountries, matchedTopics };
}

/**
 * Boost significance for Africa-relevant events when user follows Africa topics.
 */
export function computeAfricaBoost(
  eventCountries: string[],
  eventTopics: string[],
  userInterests: string[]
): number {
  const userFollowsAfrica = userInterests.some((i) =>
    i.toLowerCase().includes('africa') || i.toLowerCase().includes('african')
  );
  if (!userFollowsAfrica) return 0;

  const countryOverlap = eventCountries.filter((c) =>
    AFRICAN_COUNTRIES.map((ac) => ac.toLowerCase()).includes(c.toLowerCase())
  ).length;

  const topicOverlap = eventTopics.filter((t) =>
    AFRICAN_TOPICS.map((at) => at.toLowerCase()).includes(t.toLowerCase())
  ).length;

  return Math.min(0.15, countryOverlap * 0.05 + topicOverlap * 0.05);
}

/**
 * Government and institutional primary sources for Africa.
 */
export const AFRICAN_PRIMARY_SOURCES = [
  { domain: 'nbs.go.ke', country: 'Kenya', type: 'statistics' },
  { domain: 'nigerianstat.gov.ng', country: 'Nigeria', type: 'statistics' },
  { domain: 'statsghana.gov.gh', country: 'Ghana', type: 'statistics' },
  { domain: 'statssa.gov.za', country: 'South Africa', type: 'statistics' },
  { domain: 'cbn.gov.ng', country: 'Nigeria', type: 'central_bank' },
  { domain: 'cbk.go.ke', country: 'Kenya', type: 'central_bank' },
  { domain: 'resbank.co.za', country: 'South Africa', type: 'central_bank' },
  { domain: 'sec.gov.ng', country: 'Nigeria', type: 'regulator' },
  { domain: 'cma.or.ke', country: 'Kenya', type: 'regulator' },
];
