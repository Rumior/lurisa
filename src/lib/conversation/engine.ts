// src/lib/conversation/engine.ts
// The Conversation Engine — Spec §21
// Orchestrates: Intent → Emotion → Memory → Personal Model → Mode → Response

import { detectMode } from './mode-detector';
import { detectEmotion } from './emotion-detector';
import { ConversationMode, UserEmotion } from './types';
import { getMemoryContext, getUserPersonality, getUserName } from '@/lib/memory/context';
import { buildSystemPrompt } from '@/lib/personality/system-prompt';
import { generateLurisaResponse } from '@/lib/llm/gateway';
import { getPersonalModel } from '@/lib/personal-model/store';
import { getRelationshipStage, incrementMessageCount } from '@/lib/relationship/stage';
import { inferPersonalModelUpdates } from '@/lib/personal-model/inference';

export interface ConversationTurnInput {
  userId: string;
  conversationId: string;
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  intentContext?: string;
}

export interface ConversationTurnResult {
  response: string;
  mode: ConversationMode;
  emotion: UserEmotion;
  qualityScore: number;
  retriesUsed: number;
  fallback: boolean;
}

export async function processConversationTurn(
  input: ConversationTurnInput
): Promise<ConversationTurnResult> {
  const { userId, conversationId, message, history, intentContext } = input;

  const mode = detectMode(message);
  const emotion = detectEmotion(message);

  const [personalModel, relationshipStage, personality, userName] = await Promise.all([
    getPersonalModel(userId),
    getRelationshipStage(userId),
    getUserPersonality(userId),
    getUserName(userId),
  ]);

  const memoryCtx = await getMemoryContext(userId, message);

  const systemPrompt = buildSystemPrompt(
    personality,
    memoryCtx,
    userName,
    mode,
    emotion,
    personalModel,
    relationshipStage
  );

  const fullMessage = intentContext ? `${intentContext}\n\n${message}` : message;

  const result = await generateLurisaResponse({
    message: fullMessage,
    userId,
    conversationHistory: history,
    mode,
    emotion,
    personalModel,
    relationshipStage,
  });

  incrementMessageCount(userId).catch((err) => {
    console.error('[RELATIONSHIP] Failed to increment message count:', err);
  });

  inferPersonalModelUpdates(userId, message, result.response, mode, emotion).catch((err) => {
    console.error('[PERSONAL MODEL] Inference failed:', err);
  });

  return {
    response: result.response,
    mode,
    emotion,
    qualityScore: result.qualityScore,
    retriesUsed: result.retriesUsed,
    fallback: result.fallback || false,
  };
}
