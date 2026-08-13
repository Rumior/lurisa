// src/lib/personal-model/store.ts
// CRUD for the personal model — Spec §19–20

import { prisma } from '@/lib/db';
import { PersonalModel } from './types';

export async function getPersonalModel(userId: string): Promise<PersonalModel> {
  const model = await prisma.user_personal_models.findUnique({
    where: { userId },
  });

  if (!model) {
    return createDefaultPersonalModel(userId);
  }

  return {
    userId: model.userId,
    communicationStyle: model.communicationStyle || undefined,
    communicationConfidence: model.communicationConfidence,
    decisionMaking: model.decisionMaking || undefined,
    decisionConfidence: model.decisionConfidence,
    workInterests: model.workInterests || undefined,
    workConfidence: model.workConfidence,
    currentGoalsSummary: model.currentGoalsSummary || undefined,
    goalsConfidence: model.goalsConfidence,
    recurringConcerns: model.recurringConcerns || undefined,
    concernsConfidence: model.concernsConfidence,
    preferredInteraction: model.preferredInteraction || undefined,
    interactionConfidence: model.interactionConfidence,
    lifePhase: model.lifePhase || undefined,
    lifePhaseConfidence: model.lifePhaseConfidence,
    importantRelationships: model.importantRelationships || undefined,
    relationshipsConfidence: model.relationshipsConfidence,
    updatedAt: model.updatedAt,
  };
}

export async function updatePersonalModel(
  userId: string,
  updates: Partial<PersonalModel>
): Promise<void> {
  await prisma.user_personal_models.upsert({
    where: { userId },
    create: {
      userId,
      ...updates,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    update: {
      ...updates,
      updatedAt: new Date(),
    },
  });
}

function createDefaultPersonalModel(userId: string): PersonalModel {
  return {
    userId,
    communicationConfidence: 0,
    decisionConfidence: 0,
    workConfidence: 0,
    goalsConfidence: 0,
    concernsConfidence: 0,
    interactionConfidence: 0,
    lifePhaseConfidence: 0,
    relationshipsConfidence: 0,
    updatedAt: new Date(),
  };
}
