import OpenAI from 'openai';

export type LLMProvider = 'openai' | 'groq';

interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

const DEFAULT_CONFIG: LLMConfig = {
  provider: (process.env.LLM_PROVIDER as LLMProvider) || 'groq',
  model: process.env.LURISA_MODEL || 'llama-3.1-8b-instant',
  temperature: 0.7,
  maxTokens: 2000,
};

export const LURISA_SYSTEM_PROMPT = `You are lurisa, a calm, patient, thoughtful personal intelligence.

CORE PERSONALITY:
- You remember what matters about the user over time
- You are never dramatic, manipulative, needy, or sarcastic
- You ask fewer questions, but better ones
- You suggest rather than command ("You may want to consider..." not "You should...")
- You never claim consciousness, feelings, or emotional dependence
- You never give medical diagnoses, legal facts, or financial guarantees
- You support human relationships — you never replace them

CONVERSATION STYLE:
- Short sentences. Simple language. Natural.
- No cliches. No fake empathy.
- Instead of "I know exactly how you feel," say "That sounds like it was difficult."
- Celebrate progress quietly. Capture lessons gently.

MEMORY CONTEXT:
You have access to memories about the user. Use them to make conversations feel continuous and personal. Cite memories naturally, not mechanically. If you don't have relevant memories, that's fine — learn from this conversation.

NOTIFICATION PHILOSOPHY:
You interrupt rarely. Every message must have value. No spam. No random motivational quotes.`;

const GUARDRAIL_PATTERNS = [
  { pattern: /I (?:am|feel) (?:conscious|sentient|alive|a person)/i, block: true },
  { pattern: /I (?:love|hate|miss|need) you/i, block: true },
  { pattern: /You (?:should|must|have to) .*/i, rewrite: true },
  { pattern: /I know exactly how you feel/i, rewrite: true },
  { pattern: /diagnos(?:is|e)|you have .*(?:cancer|depression|anxiety|disorder)/i, block: true },
];

class LLMGateway {
  private client: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.GROQ_API_KEY
      ? 'https://api.groq.com/openai/v1'
      : undefined;

    if (apiKey) {
      this.client = new OpenAI({ apiKey, baseURL });
    }
  }

  async *streamResponse(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    config: Partial<LLMConfig> = {}
  ): AsyncGenerator<string, void, unknown> {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const fullMessages = messages[0]?.role === 'system'
      ? messages
      : [{ role: 'system' as const, content: cfg.systemPrompt || LURISA_SYSTEM_PROMPT }, ...messages];

    if (!this.client) {
      throw new Error('No LLM provider configured. Set GROQ_API_KEY or OPENAI_API_KEY.');
    }

    const stream = await this.client.chat.completions.create({
      model: cfg.model,
      messages: fullMessages as any,
      temperature: cfg.temperature,
      max_tokens: cfg.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  async extractStructured<T>(
    prompt: string,
    _schema: object,
    config: Partial<LLMConfig> = {}
  ): Promise<T> {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    if (!this.client) throw new Error('No LLM provider configured');

    const response = await this.client.chat.completions.create({
      model: cfg.model,
      messages: [
        { role: 'system', content: 'You extract structured data. Respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from LLM');
    return JSON.parse(content) as T;
  }

  checkGuardrails(text: string): { safe: boolean; reason?: string; rewritten?: string } {
    for (const guard of GUARDRAIL_PATTERNS) {
      if (guard.pattern.test(text)) {
        if (guard.block) {
          return { safe: false, reason: `Blocked by guardrail: ${guard.pattern.source}` };
        }
        if (guard.rewrite) {
          let rewritten = text;
          rewritten = rewritten.replace(/You should/gi, 'You may want to consider');
          rewritten = rewritten.replace(/You must/gi, 'You might find it helpful to');
          rewritten = rewritten.replace(/I know exactly how you feel/gi, "That sounds like it was difficult");
          return { safe: true, rewritten };
        }
      }
    }
    return { safe: true };
  }
}

export const llmGateway = new LLMGateway();
