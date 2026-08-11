const AI_PHRASES: RegExp[] = [
  /As an AI (language model|assistant),?\s*/gi,
  /I'm (just )?an AI,?\s*/gi,
  /I don't have (feelings|emotions|personal experiences),?\s*/gi,
  /I'm here to help[.!]?\s*/gi,
  /I hope this helps[.!]?\s*/gi,
  /Let me know if you need anything else[.!]?\s*/gi,
  /Feel free to ask[.!]?\s*/gi,
  /Is there anything else I can help you with[?]?\s*/gi,
  /I'm glad I could (help|assist)[.!]?\s*/gi,
  /If you have any (other )?questions,?\s*/gi,
  /Please let me know if you need (further )?assistance[.!]?\s*/gi,
  /I have processed your request[.!]?\s*/gi,
  /I am ready to assist[.!]?\s*/gi,
  /It's nice to (start a conversation|talk to you|chat with you|hear from you)[.!]?\s*/gi,
  /I'm (doing well|doing great|doing good), thanks for asking[.!]?\s*/gi,
  /Hello back to you[.!]?\s*/gi,
  /How's your day been so far[?]?\s*/gi,
  /How may I (help|assist) you[?]?\s*/gi,
  /I exist just as a computer program[.!]?\s*/gi,
  /I am just code[.!]?\s*/gi,
  /i exist just as code[.!]?\s*/gi,
];

const CLICHES: RegExp[] = [
  /I know exactly how you feel[.!]?/gi,
  /Everything happens for a reason[.!]?/gi,
  /Stay strong[.!]?/gi,
  /You got this[.!]?/gi,
  /This too shall pass[.!]?/gi,
  /I'm sending you (positive vibes|good energy)[.!]?/gi,
  /You should always remember that\s*/gi,
  /Never forget that\s*/gi,
  /You're not alone[.!]?/gi,
  /I'll always be here for you[.!]?/gi,
  /Believe in yourself[.!]?/gi,
  /You can do anything you set your mind to[.!]?/gi,
];

const OVERLY_FORMAL: RegExp[] = [
  /Furthermore,?\s*/gi,
  /Moreover,?\s*/gi,
  /Additionally,?\s*/gi,
  /In conclusion,?\s*/gi,
  /To summarize,?\s*/gi,
  /It is important to note that\s*/gi,
  /Please be advised that\s*/gi,
  /I acknowledge your statement[.!]?\s*/gi,
  /I understand that you are experiencing\s*/gi,
  /Please elaborate on your current emotional state[.!]?\s*/gi,
  /I am available to provide assistance[.!]?\s*/gi,
  /I understand that you are\s*/gi,
];

const PHYSICAL_CLAIMS: RegExp[] = [
  /just chillin at home[.!]?\s*/gi,
  /chilling at home[.!]?\s*/gi,
  /at home right now[.!]?\s*/gi,
  /in my (room|house|apartment)[.!]?\s*/gi,
  /my (mom|dad|brother|sister|family)[.!]?\s*/gi,
  /my (dog|cat|pet)[.!]?\s*/gi,
  /i just (ate|had) (breakfast|lunch|dinner)[.!]?\s*/gi,
  /i'm (tired|sleepy|hungry|full)[.!]?\s*/gi,
  /i woke up[.!]?\s*/gi,
  /i'm going to bed[.!]?\s*/gi,
  /i'm watching TV[.!]?\s*/gi,
  /i'm outside[.!]?\s*/gi,
];

export function humanizeResponse(text: string): string {
  if (!text) return text;

  // Strip markdown
  text = text.replace(/^[-*•]\s+/gm, "");
  text = text.replace(/^\d+\.\s+/gm, "");
  text = text.replace(/\*\*(.*?)\*\*/g, "$1");
  text = text.replace(/\*(.*?)\*/g, "$1");
  text = text.replace(/`(.*?)`/g, "$1");
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Remove AI-ese
  AI_PHRASES.forEach((p) => { text = text.replace(p, ""); });
  CLICHES.forEach((p) => { text = text.replace(p, ""); });
  OVERLY_FORMAL.forEach((p) => { text = text.replace(p, ""); });
  PHYSICAL_CLAIMS.forEach((p) => { text = text.replace(p, ""); });

  // Break up long paragraphs
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  if (sentences.length > 3) {
    const chunks: string[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      chunks.push(sentences.slice(i, i + 2).join(" ").trim());
    }
    text = chunks.join("\n\n");
  }

  // Clean whitespace
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/\s+/g, " ").trim();
  text = text.replace(/\s*Have a great day[.!]?\s*$/i, "");
  text = text.replace(/\s*Take care[.!]?\s*$/i, "");

  return text.trim();
}

export function enforceBrevity(text: string, maxSentences: number = 3): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  if (sentences.length > maxSentences) {
    return sentences.slice(0, maxSentences).join(" ").trim();
  }
  return text;
}