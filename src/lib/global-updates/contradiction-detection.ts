// src/lib/global-updates/contradiction-detection.ts
// Contradiction Detection Layer — IMPROVED
// Uses LLM to extract and compare claims between sources.

import OpenAI from 'openai';
import { SourceMetadata, EventContradiction } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

/**
 * Scan all source pairs in an event for contradictions.
 * Only flags when reliable sources disagree.
 */
export async function findContradictions(sources: SourceMetadata[]): Promise<EventContradiction[]> {
  const contradictions: EventContradiction[] = [];

  // Only compare credible sources
  const credibleSources = sources.filter((s) => s.credibility >= 0.5);
  if (credibleSources.length < 2) return [];

  // Compare each pair (limit to avoid excessive LLM calls)
  const maxPairs = Math.min(credibleSources.length * (credibleSources.length - 1) / 2, 10);
  let pairsChecked = 0;

  for (let i = 0; i < credibleSources.length && pairsChecked < maxPairs; i++) {
    for (let j = i + 1; j < credibleSources.length && pairsChecked < maxPairs; j++, pairsChecked++) {
      const a = credibleSources[i];
      const b = credibleSources[j];

      // Skip if same publisher
      if (a.publisher && b.publisher && a.publisher === b.publisher) continue;

      const contradiction = await detectContradictionWithLLM(a, b);
      if (contradiction) {
        contradictions.push({
          claimA: contradiction.claimA,
          claimB: contradiction.claimB,
          sourceAId: a.sourceId,
          sourceBId: b.sourceId,
          explanation: contradiction.explanation,
        });
      }
    }
  }

  return contradictions;
}

/**
 * Use LLM to detect if two sources contradict on a material claim.
 */
async function detectContradictionWithLLM(
  sourceA: SourceMetadata,
  sourceB: SourceMetadata
): Promise<{ claimA: string; claimB: string; explanation: string } | null> {
  const contentA = (sourceA.content || sourceA.title).slice(0, 1200);
  const contentB = (sourceB.content || sourceB.title).slice(0, 1200);

  const prompt = `You are a fact-checking analyst. Compare two news sources reporting on the same event.

SOURCE A (${sourceA.publisher || 'Unknown'}):
${contentA}

SOURCE B (${sourceB.publisher || 'Unknown'}):
${contentB}

Task: Determine if Source A and Source B make DIRECTLY CONTRADICTORY claims about a MATERIAL fact.

Respond in this exact JSON format:
{
  "hasContradiction": true or false,
  "claimA": "The specific claim from Source A that is disputed (max 20 words)",
  "claimB": "The specific claim from Source B that contradicts it (max 20 words)",
  "explanation": "One sentence explaining why they disagree"
}

Rules:
- Only flag genuine factual disagreements, not differences in framing.
- If both sources agree, return hasContradiction: false.
- Be conservative. False positives damage trust.`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.LURISA_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 300,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed.hasContradiction) return null;

    return {
      claimA: parsed.claimA || 'Unspecified claim',
      claimB: parsed.claimB || 'Unspecified claim',
      explanation: parsed.explanation || 'Sources disagree on key details.',
    };
  } catch (err) {
    console.error('[Contradiction] LLM detection failed:', err);
    return null;
  }
}

/**
 * Format contradiction for user display.
 */
export function formatContradictionWarning(contradictions: EventContradiction[]): string | undefined {
  if (contradictions.length === 0) return undefined;
  if (contradictions.length === 1) {
    return `Reliable sources currently disagree about ${contradictions[0].claimA.toLowerCase()}.`;
  }
  return `Multiple aspects of this story are disputed among reliable sources.`;
}