import OpenAI from 'openai';
import { buildSystemPrompt } from '@/lib/personality/system-prompt';
import { checkResponseQuality, isResponseAcceptable } from '@/lib/personality/quality-check';
import { humanizeResponse, enforceBrevity } from '@/lib/personality/humanize';
import { getMemoryContext, getUserPersonality, getUserName } from '@/lib/memory/context';
import { withRetry } from '@/lib/error-handler';
import { ConversationMode, UserEmotion } from '@/lib/conversation/types';
import { PersonalModel } from '@/lib/personal-model/types';
import { RelationshipStage } from '@/lib/conversation/types';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const MODEL = process.env.LURISA_MODEL || 'llama-3.1-8b-instant';
const MAX_RETRIES = 2;

let circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
let circuitFailureCount = 0;
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 30000;
let circuitLastFailure = 0;

export interface GenerateOptions {
  message: string;
  userId: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  skipIntentCheck?: boolean;
  mode?: ConversationMode;
  emotion?: UserEmotion;
  personalModel?: PersonalModel;
  relationshipStage?: {
    stage: RelationshipStage;
    messageCount: number;
    daysSinceFirstContact: number;
  };
}

export interface GenerateResult {
  response: string;
  qualityScore: number;
  retriesUsed: number;
  fallback?: boolean;
}

function isCircuitOpen(): boolean {
  if (circuitState === 'CLOSED') return false;
  if (circuitState === 'OPEN') {
    if (Date.now() - circuitLastFailure > CIRCUIT_COOLDOWN_MS) {
      circuitState = 'HALF_OPEN';
      circuitFailureCount = 0;
      return false;
    }
    return true;
  }
  return false;
}

function recordCircuitSuccess() {
  circuitFailureCount = 0;
  circuitState = 'CLOSED';
}

function recordCircuitFailure() {
  circuitFailureCount++;
  circuitLastFailure = Date.now();
  if (circuitFailureCount >= CIRCUIT_FAILURE_THRESHOLD) {
    circuitState = 'OPEN';
    console.warn('[LLM GATEWAY] Circuit breaker OPEN');
  }
}

const FALLBACK_RESPONSES = [
  "I'm having a little trouble connecting right now. Mind trying again in a moment?",
  "My thoughts are a bit scattered at the moment. Could you give me a second?",
  "I'm experiencing a brief hiccup. Please try again — I'll be back shortly.",
  "Something's temporarily off on my end. Try me again in a few seconds?",
];

function getFallbackResponse(): string {
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

const MODE_TOKEN_MULTIPLIERS: Record<ConversationMode, number> = {
  CASUAL: 1,
  CONVERSATIONAL: 1,
  EMOTIONAL: 1,
  SUPPORTIVE: 1,
  PRACTICAL: 1.5,
  ANALYTICAL: 2,
  PROFESSIONAL: 2,
  ACADEMIC: 2.5,
  CREATIVE: 1.5,
  TECHNICAL: 2,
  URGENT: 1,
};

export async function generateLurisaResponse(options: GenerateOptions): Promise<GenerateResult> {
  const { message, userId, conversationHistory = [], mode, emotion, personalModel, relationshipStage } = options;

  if (isCircuitOpen()) {
    console.warn('[LLM GATEWAY] Circuit open — returning fallback');
    return { response: getFallbackResponse(), qualityScore: 0, retriesUsed: 0, fallback: true };
  }

  try {
    const [personality, memoryCtx, userName] = await Promise.all([
      getUserPersonality(userId),
      getMemoryContext(userId, message),
      getUserName(userId),
    ]);

    const systemPrompt =
      buildSystemPrompt(personality, memoryCtx, userName, mode, emotion, personalModel, relationshipStage) +
      '\n\nCRITICAL: Only reference facts, people, or events that appear in the conversation history or memory context provided above. NEVER invent names, people, events, or details that are not explicitly present in the history. If you do not know something, do not guess. Just respond naturally without mentioning it.';

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const baseTokens = 128;
    const multiplier = mode ? MODE_TOKEN_MULTIPLIERS[mode] : 1;
    const maxTokens = Math.min(512, Math.round(baseTokens * multiplier));

    let attempt = 0;
    let lastResponse = '';
    let lastQualityScore = 0;

    while (attempt <= MAX_RETRIES) {
      const completion = await withRetry(
        () =>
          groq.chat.completions.create({
            model: MODEL,
            messages,
            temperature: 0.8,
            max_tokens: maxTokens,
            top_p: 0.9,
            frequency_penalty: 0.4,
            presence_penalty: 0.3,
          }),
        {
          maxRetries: 2,
          baseDelayMs: 1000,
          maxDelayMs: 8000,
          onRetry: (n, err) => console.warn(`[LLM GATEWAY] Retry ${n} for ${userId}: ${err.message}`),
        }
      );

      const raw = completion.choices[0]?.message?.content || '';
      lastResponse = raw;

      let processed = humanizeResponse(raw);
      processed = enforceBrevity(processed, mode === 'PROFESSIONAL' || mode === 'ANALYTICAL' || mode === 'ACADEMIC' ? 5 : 3);

      const quality = checkResponseQuality(processed, message);
      lastQualityScore = quality.score;

      if (isResponseAcceptable(quality)) {
        recordCircuitSuccess();
        return { response: processed, qualityScore: quality.score, retriesUsed: attempt };
      }

      attempt++;
      if (attempt <= MAX_RETRIES) {
        const issues = [...quality.failures, ...quality.warnings].slice(0, 3);
        messages.push({ role: 'assistant', content: raw });
        messages.push({
          role: 'user',
          content: `That was wrong. ${issues.join('. ')}. Rewrite like you're texting a friend.`,
        });
      }
    }

    recordCircuitSuccess();
    return {
      response: humanizeResponse(enforceBrevity(lastResponse, 3)),
      qualityScore: lastQualityScore,
      retriesUsed: MAX_RETRIES,
    };
  } catch (error) {
    recordCircuitFailure();
    console.error('LLM ERROR:', error);
    return { response: getFallbackResponse(), qualityScore: 0, retriesUsed: MAX_RETRIES, fallback: true };
  }
}

export async function generateStructuredResponse<T>(
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<T | null> {
  if (isCircuitOpen()) {
    console.warn('[LLM GATEWAY] Circuit open — skipping structured call');
    return null;
  }

  try {
    const completion = await withRetry(
      () =>
        groq.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 256,
          response_format: { type: 'json_object' },
        }),
      { maxRetries: 2, baseDelayMs: 1000, maxDelayMs: 8000 }
    );

    const raw = completion.choices[0]?.message?.content || '{}';
    recordCircuitSuccess();
    return JSON.parse(raw) as T;
  } catch (error) {
    recordCircuitFailure();
    console.error('[LLM GATEWAY] Structured response failed:', error);
    return null;
  }
}
