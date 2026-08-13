// src/lib/personal-model/types.ts
// Evidence-based personal model — Spec §19–20

import { RelationshipStage } from '@/lib/conversation/types';

export interface PersonalModel {
  userId: string;
  communicationStyle?: string;
  communicationConfidence: number;
  decisionMaking?: string;
  decisionConfidence: number;
  workInterests?: string;
  workConfidence: number;
  currentGoalsSummary?: string;
  goalsConfidence: number;
  recurringConcerns?: string;
  concernsConfidence: number;
  preferredInteraction?: string;
  interactionConfidence: number;
  lifePhase?: string;
  lifePhaseConfidence: number;
  importantRelationships?: string;
  relationshipsConfidence: number;
  updatedAt: Date;
}

export interface PersonalModelUpdate {
  field: keyof PersonalModel;
  value: string | number;
  confidenceDelta: number;
  evidence: string;
}
