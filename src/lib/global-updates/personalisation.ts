// Personalisation Layer — "Why it may matter to you"
import OpenAI from 'openai';
import { UserRelevanceContext, ExtractedEvent } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});
/**
 * Generate personalised explanation of why an event matters to this user.
 * Returns undefined if no legitimate connection exists.
 */
export async function personaliseEvent(
  event: ExtractedEvent,
  context: UserRelevanceContext
): Promise<string | undefined> {
  // Fast-path: if relevance score is very low, don't manufacture a connection
  const hasConnection =
    context.interests.some((i) => event.topics.some((t) => t.toLowerCase().includes(i.toLowerCase()))) ||
    context.goals.some((g) => event.entities.some((e) => g.toLowerCase().includes(e.toLowerCase()))) ||
    context.recentResearch.some((r) => event.topics.some((t) => r.toLowerCase().includes(t.toLowerCase())));

  if (!hasConnection) return undefined;

  const prompt = `You are Lurisa's personal relevance engine. You explain why a world event matters to a specific user, based ONLY on their actual context. You NEVER invent connections.

EVENT:
Headline: ${event.headline}
Summary: ${event.summary}
Topics: ${event.topics.join(', ')}

USER CONTEXT:
Interests: ${context.interests.join(', ') || 'None specified'}
Goals: ${context.goals.join(', ') || 'None specified'}
Recent research: ${context.recentResearch.join(', ') || 'None'}
Professional interests: ${context.professionalInterests || 'None'}

Write ONE concise sentence (max 25 words) explaining why this event may matter to this user. Be specific and honest. If the connection is weak, say so.`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.LURISA_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 100,
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text || text.toLowerCase().includes('no clear connection')) return undefined;
    return text;
  } catch (err) {
    console.error('[GlobalUpdates] Personalisation failed:', err);
    return undefined;
  }
}
