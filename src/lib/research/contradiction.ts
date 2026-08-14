import { generateStructuredResponse } from '@/lib/llm/gateway';
import { ResearchClaim, ResearchContradiction } from './types';

export async function detectContradictions(
  claims: ResearchClaim[]
): Promise<ResearchContradiction[]> {
  if (claims.length < 2) return [];

  const groups = groupClaimsByTopic(claims);
  const contradictions: ResearchContradiction[] = [];

  for (const group of groups) {
    if (group.length < 2) continue;
    
    const groupText = group.map((c, i) => `${i + 1}. ${c.claim} [Source: ${c.sourceUrl}]`).join('\n');
    
    const systemPrompt = `Analyze the following claims and identify any direct contradictions or significant discrepancies.

Return JSON:
{
  "contradictions": [
    {
      "claimA": "first claim text",
      "claimB": "second claim text",
      "sourceA": "source URL A",
      "sourceB": "source URL B",
      "explanation": "why they differ"
    }
  ]
}

Only report genuine contradictions, not minor differences in wording. If no contradictions, return {"contradictions": []}.`;

    const result = await generateStructuredResponse<{
      contradictions: Array<{
        claimA: string;
        claimB: string;
        sourceA: string;
        sourceB: string;
        explanation: string;
      }>;
    }>(systemPrompt, groupText, { maxTokens: 384, temperature: 0.2 });

    if (result?.contradictions) {
      for (const c of result.contradictions) {
        const claimA = group.find(g => g.claim === c.claimA || g.sourceUrl === c.sourceA);
        const claimB = group.find(g => g.claim === c.claimB || g.sourceUrl === c.sourceB);
        
        if (claimA && claimB && claimA.sourceUrl !== claimB.sourceUrl) {
          contradictions.push({
            claimA: c.claimA,
            claimB: c.claimB,
            sourceA: c.sourceA,
            sourceB: c.sourceB,
            explanation: c.explanation,
          });
        }
      }
    }
  }

  return contradictions;
}

function groupClaimsByTopic(claims: ResearchClaim[]): ResearchClaim[][] {
  const groups: ResearchClaim[][] = [];
  const used = new Set<number>();

  for (let i = 0; i < claims.length; i++) {
    if (used.has(i)) continue;
    
    const group = [claims[i]];
    used.add(i);
    
    const wordsA = claims[i].claim.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    
    for (let j = i + 1; j < claims.length; j++) {
      if (used.has(j)) continue;
      const wordsB = claims[j].claim.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const common = wordsA.filter(w => wordsB.includes(w));
      
      if (common.length >= 2) {
        group.push(claims[j]);
        used.add(j);
      }
    }
    
    groups.push(group);
  }

  return groups;
}