// Summarisation Layer — LLM-powered "What happened / What it means"
import OpenAI from 'openai';
import { ExtractedEvent } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});
interface SummarisationResult {
  whatHappened: string;
  whatItMeans: string;
  whatIsUncertain?: string;
  headline: string;
  summary: string;
}

/**
 * Use LLM to synthesise verified sources into structured intelligence.
 */
export async function synthesiseEvent(
  sources: Array<{ title: string; content?: string; publisher: string }>,
  existingEvent?: Partial<ExtractedEvent>
): Promise<SummarisationResult> {
  const sourceText = sources
    .map((s, i) => `[${i + 1}] ${s.publisher}: ${s.title}${s.content ? `\n${s.content.slice(0, 800)}` : ''}`)
    .join('\n\n');

  const prompt = `You are Lurisa's Global Updates intelligence synthesiser. You ONLY report what the sources actually say. You NEVER fabricate facts, quotes, or URLs.

Given the following sources, produce a structured intelligence summary:

${sourceText}

Respond in this exact JSON format:
{
  "headline": "A clear, factual headline (max 10 words)",
  "summary": "A 3-5 sentence verified summary of the event",
  "whatHappened": "The verified real-world event, in 2-3 sentences",
  "whatItMeans": "Evidence-based analysis of significance, in 2-3 sentences",
  "whatIsUncertain": "What remains unclear or disputed, or null if everything is clear"
}

Rules:
- Only use information present in the sources.
- If sources disagree, acknowledge the disagreement.
- Never invent statistics, names, or quotes.
- Keep tone calm, objective, and premium editorial.`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.LURISA_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 800,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error('Empty LLM response');

    const parsed = JSON.parse(raw) as SummarisationResult;

    // Validation: ensure no hallucinated URLs
    return {
      headline: parsed.headline || existingEvent?.headline || 'Untitled Update',
      summary: parsed.summary || '',
      whatHappened: parsed.whatHappened || '',
      whatItMeans: parsed.whatItMeans || '',
      whatIsUncertain: parsed.whatIsUncertain || undefined,
    };
  } catch (err) {
    console.error('[GlobalUpdates] Summarisation failed:', err);
    // Graceful fallback
    return {
      headline: existingEvent?.headline || sources[0]?.title || 'Untitled Update',
      summary: `Multiple sources report developments in this area. ${sources.length} sources are tracking this story.`,
      whatHappened: 'Early reports are emerging. Details may change as more information becomes available.',
      whatItMeans: 'The significance of this development is still being assessed.',
      whatIsUncertain: 'Early reports are emerging. Details may change.',
    };
  }
}
