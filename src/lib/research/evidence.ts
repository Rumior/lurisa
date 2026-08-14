import { generateStructuredResponse } from '@/lib/llm/gateway';
import { ResearchClaim, ResearchSource } from './types';

export async function extractClaimsFromSource(
  source: ResearchSource
): Promise<ResearchClaim[]> {
  if (!source.content || source.content.length < 50) {
    return [];
  }

  const systemPrompt = `Extract factual claims from the following web content. Be precise and extract only claims that are explicitly stated or strongly implied.

Return JSON:
{
  "claims": [
    {
      "claim": "concise factual claim",
      "evidence": "supporting text from the source",
      "confidence": 0.0-1.0
    }
  ]
}

Rules:
- One claim per fact
- Include specific numbers, dates, names when present
- Confidence: 1.0 = explicitly stated, 0.8 = strongly implied, 0.6 = somewhat implied
- Ignore opinions, ads, navigation text
- Maximum 8 claims per source`;

  const result = await generateStructuredResponse<{
    claims: Array<{ claim: string; evidence: string; confidence: number }>;
  }>(
    systemPrompt,
    `Source: ${source.title}\nURL: ${source.url}\n\nContent:\n${source.content.slice(0, 8000)}`,
    { maxTokens: 512, temperature: 0.2 }
  );

  if (!result?.claims) return [];

  return result.claims.map(c => ({
    claim: c.claim,
    evidence: c.evidence,
    confidence: Math.min(1, Math.max(0, c.confidence || 0.7)),
    sourceUrl: source.url,
  }));
}