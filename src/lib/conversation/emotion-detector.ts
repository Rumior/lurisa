// src/lib/conversation/emotion-detector.ts
// Detects user emotion from message (Spec §21 — User Emotion input)
// Zero API calls — pure keyword heuristics

import { UserEmotion } from './types';

const EMOTION_KEYWORDS: Record<UserEmotion, string[]> = {
  happy: ['happy', 'joy', 'excited', 'great', 'awesome', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'thrilled', 'delighted', 'cheerful', 'content'],
  sad: ['sad', 'depressed', 'down', 'blue', 'gloomy', 'heartbroken', 'devastated', 'miserable', 'crying', 'tears', 'grief', 'mourning', 'sorrow'],
  anxious: ['anxious', 'nervous', 'worried', 'panic', 'uneasy', 'on edge', 'restless', 'tense', 'dread', 'apprehensive', 'jittery'],
  angry: ['angry', 'furious', 'mad', 'rage', 'pissed', 'irritated', 'annoyed', 'livid', 'outraged', 'hostile', 'resentful'],
  frustrated: ['frustrated', 'stuck', 'blocked', 'helpless', 'discouraged', 'defeated', 'hopeless', 'powerless'],
  excited: ['excited', 'pumped', 'stoked', 'hyped', 'eager', 'looking forward', 'can\'t wait', 'enthusiastic', 'elated'],
  tired: ['tired', 'exhausted', 'drained', 'wiped', 'burned out', 'fatigued', 'sleepy', 'no energy', 'lethargic'],
  stressed: ['stressed', 'overwhelmed', 'pressure', 'burdened', 'swamped', 'drowning', 'too much', 'underwater', 'crushed'],
  grateful: ['grateful', 'thankful', 'appreciate', 'blessed', 'lucky', 'fortunate', 'indebted'],
  worried: ['worried', 'concerned', 'afraid', 'scared', 'fear', 'dread', 'apprehensive', 'troubled', 'unsettled'],
  proud: ['proud', 'accomplished', 'achieved', 'nailed it', 'crushed it', 'victory', 'triumph', 'mastered'],
  disappointed: ['disappointed', 'let down', 'expected better', 'regret', 'missed', 'failed', 'blew it', 'screwed up'],
  neutral: [],
};

export function detectEmotion(message: string): UserEmotion {
  const lower = message.toLowerCase();
  const scores: Record<string, number> = {};
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    scores[emotion] = keywords.filter((k) => lower.includes(k)).length;
  }
  let bestEmotion: UserEmotion = 'neutral';
  let bestScore = 0;
  for (const [emotion, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestEmotion = emotion as UserEmotion;
    }
  }
  return bestScore > 0 ? bestEmotion : 'neutral';
}
