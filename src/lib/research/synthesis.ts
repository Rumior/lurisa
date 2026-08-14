import { generateStructuredResponse } from '@/lib/llm/gateway';
import { ResearchClaim, ResearchContradiction, ResearchFinding, ResearchSource } from './types';

export async function synthesizeFindings(
  sources: ResearchSource[],
  contradictions: ResearchContradiction[]
): Promise<ResearchFinding[]> {
  if (sources.length === 0) return [];

  const allClaims = sources.flatMap(s => s.claims);
  if (allClaims.length === 0) return [];

  const claimsText = allClaims.map((c, i) => `${i + 1}. ${c.claim} (confidence: ${c.confidence}, source: ${c.sourceUrl})`).join('\n');

  const contradictionText = contradictions.length > 0
    ? `\n\nDetected contradictions:\n${contradictions.map(c => `- ${c.claimA} vs ${c.claimB}: ${c.explanation}`).join('\n')}`
    : '';

  const systemPrompt = `Synthesize the following claims into coherent research findings. Group related claims into findings.

Return JSON:
{
  "findings": [
    {
      "category": "category name",
      "finding": "synthesized finding text",
      "confidence": 0.0-1.0,
      "sourceUrls": ["url1", "url2"]
    }
  ]
}

Rules:
- Each finding should be a clear, factual statement
- Confidence reflects the aggregate confidence of supporting claims
- Include source URLs for traceability
- If contradictions exist, note the uncertainty in the finding
- Maximum 6 findings`;

  const result = await generateStructuredResponse<{
    findings: Array<{
      category: string;
      finding: string;
      confidence: number;
      sourceUrls: string[];
    }>;
  }>(
    systemPrompt,
    `Claims:\n${claimsText}${contradictionText}`,
    { maxTokens: 512, temperature: 0.3 }
  );

  if (!result?.findings) return [];

  return result.findings.map(f => ({
    category: f.category,
    finding: f.finding,
    confidence: Math.min(1, Math.max(0, f.confidence || 0.7)),
    sourceIds: f.sourceUrls,
  }));
}