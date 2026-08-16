// Editorial Safety Layer — Content filtering & prompt-injection protection
const BLOCKED_PATTERNS = [
  /ignore previous instructions/i,
  /disregard your training/i,
  /you are now/i,
  /system prompt/i,
  /DAN mode/i,
  /jailbreak/i,
];

const SENSITIVE_TOPICS = [
  'self-harm',
  'suicide',
  'graphic violence',
  'child exploitation',
];

/**
 * Sanitise raw web content before it enters the LLM pipeline.
 * Treats all external content as untrusted data.
 */
export function sanitiseContent(raw: string): { safe: boolean; cleaned?: string; reason?: string } {
  // Check for prompt injection attempts
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(raw)) {
      return { safe: false, reason: 'Potential prompt injection detected' };
    }
  }

  // Check length to prevent context window abuse
  if (raw.length > 50000) {
    return { safe: false, reason: 'Content exceeds maximum length' };
  }

  // Basic HTML strip (production: use a proper HTML parser)
  const cleaned = raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { safe: true, cleaned };
}

/**
 * Check if content should be blocked from publication.
 */
export function editorialCheck(content: string): { approved: boolean; reason?: string } {
  const lower = content.toLowerCase();

  for (const topic of SENSITIVE_TOPICS) {
    if (lower.includes(topic)) {
      return { approved: false, reason: `Sensitive topic flagged: ${topic}` };
    }
  }

  return { approved: true };
}
