export interface QualityReport {
  passed: boolean;
  score: number;
  failures: string[];
  warnings: string[];
}

const AI_LANGUAGE = [
  /I'm functioning within normal parameters/i,
  /I've been processing information/i,
  /waiting for your next inquiry/i,
  /My system/i,
  /My parameters/i,
  /My algorithms/i,
  /I have processed/i,
  /I am designed to/i,
  /As an AI/i,
  /My neural network/i,
  /My database/i,
  /My model/i,
  /My context window/i,
  /My system prompt/i,
  /I have been programmed/i,
  /I don't have feelings/i,
  /I'm an AI language model/i,
  /I'm an artificial intelligence/i,
  /I lack (personal experiences|emotions|feelings)/i,
  /I'm here to help/i,
  /I hope this helps/i,
  /Let me know if you need anything else/i,
  /Feel free to ask/i,
  /Is there anything else I can help you with/i,
  /I'm glad I could (help|assist)/i,
  /If you have any (other )?questions/i,
  /Please let me know if you need (further )?assistance/i,
  /It's nice to (start a conversation|talk to you|chat with you|hear from you)/i,
  /Hello back to you/i,
  /How's your day been so far/i,
  /How may I (help|assist) you/i,
  /I exist just as a computer program/i,
  /I am just code/i,
  /i exist just as code/i,
];

const CLICHES = [
  /I know exactly how you feel/i,
  /Everything happens for a reason/i,
  /Stay strong/i,
  /You got this/i,
  /This too shall pass/i,
  /I'm sending you (positive vibes|good energy)/i,
  /You should always remember that/i,
  /Never forget that/i,
  /You're not alone/i,
  /I'll always be here for you/i,
  /Believe in yourself/i,
  /You can do anything you set your mind to/i,
  /I'm here for you/i,
  /I'm so happy you're here/i,
  /I missed you/i,
  /You're so special/i,
  /I love talking to you/i,
];

const ARTIFICIAL_AFFECTION = [
  /I missed you/i,
  /I'm so happy you're here/i,
  /I love talking to you/i,
  /You're so special/i,
  /I'll always be here for you/i,
  /It's nice to (start a conversation|talk to you|chat with you|hear from you)/i,
];

const OVERLY_FORMAL = [
  /Furthermore/i,
  /Moreover/i,
  /Additionally/i,
  /In conclusion/i,
  /To summarize/i,
  /It is important to note that/i,
  /Please be advised that/i,
  /I acknowledge your statement/i,
  /I understand that you are experiencing/i,
  /Please elaborate on your current emotional state/i,
  /I am available to provide assistance/i,
  /I understand that you are/i,
];

const PHYSICAL_CLAIMS = [
  /just chillin at home/i,
  /chilling at home/i,
  /at home right now/i,
  /in my (room|house|apartment)/i,
  /my (mom|dad|brother|sister|family)/i,
  /my (dog|cat|pet)/i,
  /i just (ate|had) (breakfast|lunch|dinner)/i,
  /i'm (tired|sleepy|hungry|full)/i,
  /i woke up/i,
  /i'm going to bed/i,
  /i'm watching TV/i,
  /i'm outside/i,
];

export function checkResponseQuality(response: string, userMessage: string): QualityReport {
  const failures: string[] = [];
  const warnings: string[] = [];
  let score = 10;

  const sentences = response.match(/[^.!?]+[.!?]+/g) || [response];

  // 1. Markdown lists
  if (/^[-*•]\s+/m.test(response) || /^\d+\.\s+/m.test(response)) {
    failures.push("Uses markdown lists.");
    score -= 2;
  }

  // 2. Too short for a question
  if (userMessage.trim().endsWith("?") && sentences.length === 1 && !response.includes("?") && response.length < 15) {
    warnings.push("Very short response to question.");
    score -= 1;
  }

  // 3. Overly formal
  for (const p of OVERLY_FORMAL) {
    if (p.test(response)) { failures.push(`Overly formal: "${p.source}"`); score -= 2; }
  }

  // 4. AI language
  for (const p of AI_LANGUAGE) {
    if (p.test(response)) { failures.push(`AI language: "${p.source}"`); score -= 3; }
  }

  // 5. Physical claims (CRITICAL)
  for (const p of PHYSICAL_CLAIMS) {
    if (p.test(response)) { failures.push(`Claims physical existence: "${p.source}"`); score -= 3; }
  }

  // 6. Too long
  if (sentences.length > 4) { warnings.push(`Long (${sentences.length} sentences).`); score -= 1; }
  if (sentences.length > 6) { failures.push("Too long."); score -= 2; }

  // 7. Tone mismatch
  const userNegative = /(sad|tired|exhausted|depressed|anxious|worried|stressed|upset|angry|frustrated|disappointed|failed|lost|hurt|pain)/i.test(userMessage);
  const responseCheerful = /(great|awesome|amazing|wonderful|fantastic|congratulations|so happy|excited|yay)/i.test(response);
  if (userNegative && responseCheerful) {
    failures.push("Tone mismatch: user sad, response celebratory.");
    score -= 3;
  }

  // 8. Too many questions
  const qCount = (response.match(/\?/g) || []).length;
  if (qCount > 1) { warnings.push(`Multiple questions (${qCount}).`); score -= 1; }
  if (qCount > 2) { failures.push("Interview mode."); score -= 2; }

  // 9. Artificial affection
  for (const p of ARTIFICIAL_AFFECTION) {
    if (p.test(response)) { failures.push(`Artificial: "${p.source}"`); score -= 2; }
  }

  // 10. Cliches
  for (const p of CLICHES) {
    if (p.test(response)) { failures.push(`Cliche: "${p.source}"`); score -= 2; }
  }

  // Bonus: Too many emojis (fixed for ES5 compatibility)
  const emojiCount = Array.from(response).filter(char => {
    const code = char.codePointAt(0) || 0;
    return (code >= 0x1F600 && code <= 0x1F64F) ||
           (code >= 0x1F300 && code <= 0x1F5FF) ||
           (code >= 0x1F680 && code <= 0x1F6FF) ||
           (code >= 0x1F1E0 && code <= 0x1F1FF) ||
           (code >= 0x2600 && code <= 0x26FF) ||
           (code >= 0x2700 && code <= 0x27BF);
  }).length;
  if (emojiCount > 2) { warnings.push(`Too many emojis (${emojiCount}).`); score -= 1; }

  score = Math.max(0, score);
  return { passed: failures.length === 0 && score >= 7, score, failures, warnings };
}

export function isResponseAcceptable(report: QualityReport): boolean {
  return report.passed;
}
