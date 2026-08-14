import { withRetry } from '@/lib/error-handler';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface SearchProvider {
  name: string;
  search(query: string, options?: { limit?: number }): Promise<SearchResult[]>;
}

class SerperProvider implements SearchProvider {
  name = 'serper';
  async search(query: string, options?: { limit?: number }): Promise<SearchResult[]> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) throw new Error('SERPER_API_KEY not configured');
    
    const res = await withRetry(
      () => fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: options?.limit || 10 }),
      }),
      { maxRetries: 2, baseDelayMs: 1000, maxDelayMs: 8000 }
    );
    
    if (!res.ok) throw new Error(`Serper search failed: ${res.status}`);
    const data = await res.json();
    
    return (data.organic || []).map((r: any) => ({
      title: r.title || '',
      url: r.link || '',
      snippet: r.snippet || '',
      source: r.link ? new URL(r.link).hostname : 'unknown',
    }));
  }
}

class MockProvider implements SearchProvider {
  name = 'mock';
  async search(query: string): Promise<SearchResult[]> {
    console.warn('[RESEARCH SEARCH] Using mock provider â€” no real search results. Set SEARCH_API_PROVIDER and SERPER_API_KEY for live search.');
    return [];
  }
}

export function getSearchProvider(): SearchProvider {
  const provider = process.env.SEARCH_API_PROVIDER || 'mock';
  switch (provider) {
    case 'serper': return new SerperProvider();
    case 'mock': return new MockProvider();
    default: return new MockProvider();
  }
}

export async function searchWeb(query: string, options?: { limit?: number }): Promise<SearchResult[]> {
  const provider = getSearchProvider();
  return provider.search(query, options);
}