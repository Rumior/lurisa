// src/lib/global-updates/privacy-boundary.ts
// Hard privacy boundary: USER PRIVATE DATA → Relevance Engine → Feed
// Advertisers NEVER access raw personal information.

import { UserRelevanceContext } from './types';

export type AudienceSegment =
  | 'TECH_PROFESSIONAL'
  | 'BUSINESS_LEADER'
  | 'AFRICA_FOCUSED'
  | 'FASHION_INTEREST'
  | 'SCIENCE_ENTHUSIAST'
  | 'GENERAL';

export interface AdTargetingContext {
  segments: AudienceSegment[];
  country?: string;
  ageBracket?: '18-24' | '25-34' | '35-44' | '45-54' | '55+';
  // NEVER includes: interests[], goals[], memories, conversations, personal model raw data
}

/**
 * Derive advertiser-safe audience segments from user context.
 * This is the ONLY data that crosses the privacy boundary toward advertising.
 */
export function deriveAudienceSegments(context: UserRelevanceContext): AdTargetingContext {
  const segments: AudienceSegment[] = [];

  const interestText = context.interests.join(' ').toLowerCase();
  const goalText = context.goals.join(' ').toLowerCase();
  const researchText = context.recentResearch.join(' ').toLowerCase();
  const combined = `${interestText} ${goalText} ${researchText}`;

  if (combined.match(/\b(ai|tech|software|developer|engineering|startup|coding|programming)\b/)) {
    segments.push('TECH_PROFESSIONAL');
  }
  if (combined.match(/\b(business|entrepreneur|ceo|founder|investor|finance|market|stock)\b/)) {
    segments.push('BUSINESS_LEADER');
  }
  if (combined.match(/\b(africa|nigeria|kenya|ghana|south africa|ethiopia|tanzania|rwanda|uganda|egypt)\b/)) {
    segments.push('AFRICA_FOCUSED');
  }
  if (combined.match(/\b(fashion|apparel|clothing|textile|design|luxury|retail)\b/)) {
    segments.push('FASHION_INTEREST');
  }
  if (combined.match(/\b(science|research|physics|biology|medicine|climate|space)\b/)) {
    segments.push('SCIENCE_ENTHUSIAST');
  }

  if (segments.length === 0) segments.push('GENERAL');

  return {
    segments,
    country: context.geographicPreferences?.[0],
    // ageBracket is never inferred from personal data without explicit consent
  };
}

/**
 * Verify that a proposed ad targeting request does NOT request raw personal data.
 * Throws if violation detected.
 */
export function validateAdTargetingRequest(request: Record<string, unknown>): void {
  const forbiddenKeys = [
    'interests', 'goals', 'projects', 'recentResearch', 'memories',
    'conversations', 'personalModel', 'communicationStyle', 'professionalInterests',
    'userId', 'email', 'name',
  ];

  for (const key of forbiddenKeys) {
    if (key in request) {
      throw new Error(
        `PRIVACY_VIOLATION: Ad targeting request attempted to access forbidden field "${key}". ` +
        'Advertisers may only target via audience segments, never raw personal data.'
      );
    }
  }
}

/**
 * Generate "Why am I seeing this?" explanation for sponsored content.
 */
export function explainSponsoredContent(segments: AudienceSegment[]): string {
  if (segments.length === 0) return 'This content is shown based on general audience targeting.';
  const segmentLabels: Record<AudienceSegment, string> = {
    TECH_PROFESSIONAL: 'technology professionals',
    BUSINESS_LEADER: 'business leaders',
    AFRICA_FOCUSED: 'readers interested in African markets',
    FASHION_INTEREST: 'fashion and apparel enthusiasts',
    SCIENCE_ENTHUSIAST: 'science and research enthusiasts',
    GENERAL: 'a general audience',
  };
  const labels = segments.map((s) => segmentLabels[s]).join(', ');
  return `This sponsored content is targeted to ${labels}. Lurisa does not share your personal data with advertisers.`;
}

/**
 * Hard boundary check: ensure no raw user data leaks into ad response.
 */
export function sanitizeAdResponse<T extends Record<string, unknown>>(response: T): T {
  const cleaned = { ...response };
  const sensitiveKeys = ['userId', 'interests', 'goals', 'memories', 'conversations', 'personalModel'];
  for (const key of sensitiveKeys) {
    delete cleaned[key];
  }
  return cleaned;
}
