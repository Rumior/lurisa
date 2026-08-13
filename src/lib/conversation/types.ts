// src/lib/conversation/types.ts
// Shared conversation types to prevent circular dependencies

export type ConversationMode =
  | 'CASUAL'
  | 'CONVERSATIONAL'
  | 'EMOTIONAL'
  | 'SUPPORTIVE'
  | 'PRACTICAL'
  | 'ANALYTICAL'
  | 'PROFESSIONAL'
  | 'ACADEMIC'
  | 'CREATIVE'
  | 'TECHNICAL'
  | 'URGENT';

export type UserEmotion =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'anxious'
  | 'angry'
  | 'frustrated'
  | 'excited'
  | 'tired'
  | 'stressed'
  | 'grateful'
  | 'worried'
  | 'proud'
  | 'disappointed';

export type RelationshipStage = 'NEW' | 'ACQUAINTANCE' | 'FAMILIAR' | 'CLOSE' | 'INTIMATE';
