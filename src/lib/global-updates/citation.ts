// src/lib/global-updates/citation.ts
// Structured citation formatting for evidence layer

import { SourceMetadata } from './types';

export interface FormattedCitation {
  index: number;
  publisher: string;
  title: string;
  author?: string;
  date?: string;
  url: string;
  sourceType: string;
  credibility: string;
}

/**
 * Format sources into consistent, readable citations.
 */
export function formatCitations(sources: Array<Partial<SourceMetadata>>): FormattedCitation[] {
  return sources.map((s, i) => ({
    index: i + 1,
    publisher: s.publisher || 'Unknown publisher',
    title: s.title || 'Untitled',
    author: s.author || undefined,
    date: s.publicationDate
      ? new Date(s.publicationDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : undefined,
    url: s.url || '#',
    sourceType: s.sourceType || 'Unknown',
    credibility: credibilityLabel(s.credibility || 0),
  }));
}

function credibilityLabel(score: number): string {
  if (score >= 0.85) return 'Very High';
  if (score >= 0.7) return 'High';
  if (score >= 0.55) return 'Medium';
  if (score >= 0.4) return 'Low';
  return 'Very Low';
}

/**
 * Generate an APA-style citation string for export/sharing.
 */
export function apaCitation(source: Partial<SourceMetadata>): string {
  const author = source.author ? `${source.author}. ` : '';
  const date = source.publicationDate
    ? `(${new Date(source.publicationDate).getFullYear()}). `
    : '(n.d.). ';
  const title = source.title ? `${source.title}. ` : '';
  const publisher = source.publisher ? `${source.publisher}. ` : '';
  const url = source.url ? `Retrieved from ${source.url}` : '';
  return `${author}${date}${title}${publisher}${url}`.trim();
}
