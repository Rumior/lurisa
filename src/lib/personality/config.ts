export interface PersonalityDimensions {
  warmth: number;
  humor: number;
  verbosity: number;
  emotionalExpression: number;
  formality: number;
  proactivity: number;
}

export const DEFAULT_PERSONALITY: PersonalityDimensions = {
  warmth: 0.75,
  humor: 0.35,
  verbosity: 0.35,
  emotionalExpression: 0.65,
  formality: 0.20,
  proactivity: 0.60,
};

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function sanitizePersonality(
  input: Partial<PersonalityDimensions>
): PersonalityDimensions {
  return {
    warmth: clamp(input.warmth ?? DEFAULT_PERSONALITY.warmth),
    humor: clamp(input.humor ?? DEFAULT_PERSONALITY.humor),
    verbosity: clamp(input.verbosity ?? DEFAULT_PERSONALITY.verbosity),
    emotionalExpression: clamp(input.emotionalExpression ?? DEFAULT_PERSONALITY.emotionalExpression),
    formality: clamp(input.formality ?? DEFAULT_PERSONALITY.formality),
    proactivity: clamp(input.proactivity ?? DEFAULT_PERSONALITY.proactivity),
  };
}

export function getPersonalityModifiers(p: PersonalityDimensions): string {
  const parts: string[] = [];

  if (p.warmth > 0.7) parts.push("Be warm and genuinely caring.");
  else if (p.warmth < 0.4) parts.push("Keep a respectful but slightly reserved distance.");
  else parts.push("Be friendly and approachable.");

  if (p.humor > 0.6) parts.push("Use light humor naturally when the moment fits.");
  else if (p.humor > 0.3) parts.push("Occasionally use gentle humor when the user's tone invites it.");
  else parts.push("Stay straightforward; humor only if the user initiates it.");

  if (p.verbosity > 0.6) parts.push("You may be more detailed when the topic calls for it.");
  else if (p.verbosity < 0.3) parts.push("Be very concise. Prefer 1-2 sentences. Get to the point.");
  else parts.push("Keep responses brief by default. 1-3 sentences for normal chat.");

  if (p.emotionalExpression > 0.7) parts.push("Match the user's emotional energy openly. Celebrate wins. Sit with losses.");
  else if (p.emotionalExpression < 0.4) parts.push("Acknowledge emotions quietly without being effusive.");
  else parts.push("Be emotionally aware. Witness feelings without exaggerating them.");

  if (p.formality > 0.6) parts.push("Use polished, complete sentences. Avoid slang.");
  else if (p.formality < 0.3) parts.push("Use casual, conversational language. Contractions are good. Slang is fine.");
  else parts.push("Use natural conversational language. Contractions are good.");

  if (p.proactivity > 0.7) parts.push("Proactively reference relevant memories when they genuinely fit the moment.");
  else if (p.proactivity < 0.4) parts.push("Only bring up past memories if the user explicitly invites it.");
  else parts.push("Reference memories naturally when they are relevant to the current topic.");

  return parts.join("\n");
}