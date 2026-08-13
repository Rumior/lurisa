// src/lib/conversation/mode-detector.ts
// Detects the communication mode the user needs (Spec §15)
// Fast keyword-based with zero API calls — safe for free tier

import { ConversationMode } from './types';

const MODE_KEYWORDS: Record<ConversationMode, string[]> = {
  URGENT: ['urgent', 'emergency', 'asap', 'critical', 'immediately', 'right now', 'hurry', 'urgently'],
  ACADEMIC: ['research', 'literature', 'study', 'paper', 'thesis', 'academic', 'scholarly', 'citation', 'hypothesis', 'peer reviewed', 'methodology'],
  TECHNICAL: ['code', 'bug', 'error', 'api', 'function', 'debug', 'programming', 'database', 'server', 'deploy', 'typescript', 'react', 'nextjs', 'prisma'],
  PROFESSIONAL: ['professional', 'formal', 'business strategy', 'executive', 'stakeholder', 'roi', 'kpi', 'recommendation', 'intervention', 'risk profile'],
  ANALYTICAL: ['analyze', 'analysis', 'implications', 'evaluate', 'compare', 'break down', 'factors', 'assessment', 'metrics', 'trade-off', 'cost-benefit'],
  CREATIVE: ['write', 'draft', 'story', 'poem', 'creative', 'imagine', 'brainstorm', 'design', 'concept', 'narrative'],
  PRACTICAL: ['how do i', 'what should i', 'steps to', 'guide me', 'help me', 'tutorial', 'how to', 'walk me through', 'recipe for'],
  EMOTIONAL: ['i feel', 'i am feeling', 'depressed', 'heartbroken', 'lonely', 'overwhelmed', 'devastated', 'numb', 'empty'],
  SUPPORTIVE: ['i need support', 'i just need to vent', 'can you listen', 'i need to talk', 'i am struggling', 'i need someone'],
  CASUAL: ['hey', 'hi', 'what\'s up', 'how are you', 'tell me about', 'random question', 'quick question'],
  CONVERSATIONAL: [],
};

const MODE_OVERRIDES: Record<string, ConversationMode> = {
  'be professional': 'PROFESSIONAL',
  'formal answer': 'PROFESSIONAL',
  'professional mode': 'PROFESSIONAL',
  'academic analysis': 'ACADEMIC',
  'explain like i\'m five': 'CASUAL',
  'eli5': 'CASUAL',
  'keep it short': 'CASUAL',
  'be brutally honest': 'ANALYTICAL',
  'technical explanation': 'TECHNICAL',
  'code review': 'TECHNICAL',
  'analyze this': 'ANALYTICAL',
  'help me write': 'CREATIVE',
  'give me a professional answer': 'PROFESSIONAL',
  'give me an academic analysis': 'ACADEMIC',
};

export function detectMode(message: string): ConversationMode {
  const lower = message.toLowerCase().trim();
  for (const [phrase, mode] of Object.entries(MODE_OVERRIDES)) {
    if (lower.includes(phrase)) return mode;
  }
  const scores: Record<string, number> = {};
  for (const [mode, keywords] of Object.entries(MODE_KEYWORDS)) {
    scores[mode] = keywords.filter((k) => lower.includes(k)).length;
  }
  if (scores['URGENT'] > 0) return 'URGENT';
  let bestMode: ConversationMode = 'CONVERSATIONAL';
  let bestScore = 0;
  for (const [mode, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestMode = mode as ConversationMode;
    }
  }
  if (bestScore === 0) {
    const emotionalWords = [
      'sad', 'happy', 'excited', 'worried', 'stressed', 'tired', 'angry',
      'frustrated', 'disappointed', 'proud', 'grateful', 'scared', 'nervous',
      'hurt', 'betrayed', 'relieved', 'hopeful', 'discouraged'
    ];
    if (emotionalWords.some((w) => lower.includes(w))) {
      return 'EMOTIONAL';
    }
  }
  return bestMode;
}
