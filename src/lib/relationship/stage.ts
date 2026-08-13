// src/lib/relationship/stage.ts
// Tracks relationship depth over time — Spec §9
// Lurisa should not behave like a 10-year friend on Day 1

import { prisma } from '@/lib/db';
import { RelationshipStage } from '@/lib/conversation/types';

export interface RelationshipState {
  stage: RelationshipStage;
  messageCount: number;
  daysSinceFirstContact: number;
}

export async function getRelationshipStage(userId: string): Promise<RelationshipState> {
  const stage = await prisma.relationship_stages.findUnique({
    where: { userId },
  });

  if (stage) {
    return {
      stage: stage.stage as RelationshipStage,
      messageCount: stage.messageCount,
      daysSinceFirstContact: Math.floor(
        (Date.now() - stage.firstContactAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
    };
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });

  const messageCount = await prisma.messages.count({
    where: { userId, role: 'USER' },
  });

  const daysSince = Math.floor(
    (Date.now() - (user?.createdAt.getTime() || Date.now())) /
      (1000 * 60 * 60 * 24)
  );

  let inferredStage: RelationshipStage = 'NEW';
  if (daysSince > 180 && messageCount > 100) inferredStage = 'INTIMATE';
  else if (daysSince > 90 && messageCount > 50) inferredStage = 'CLOSE';
  else if (daysSince > 30 && messageCount > 20) inferredStage = 'FAMILIAR';
  else if (daysSince > 7 && messageCount > 5) inferredStage = 'ACQUAINTANCE';

  await prisma.relationship_stages
    .create({
      data: {
        userId,
        stage: inferredStage,
        firstContactAt: user?.createdAt || new Date(),
        messageCount,
        lastInteractionAt: new Date(),
      },
    })
    .catch(() => {});

  return { stage: inferredStage, messageCount, daysSinceFirstContact: daysSince };
}

export async function incrementMessageCount(userId: string): Promise<void> {
  await prisma.relationship_stages.upsert({
    where: { userId },
    create: {
      userId,
      stage: 'NEW',
      messageCount: 1,
      lastInteractionAt: new Date(),
    },
    update: {
      messageCount: { increment: 1 },
      lastInteractionAt: new Date(),
    },
  });
}

export function getStageMemoryHint(stage: RelationshipStage): string {
  switch (stage) {
    case 'NEW':
      return "You just met this person. Be friendly but don't assume familiarity. Keep memory references light and recent.";
    case 'ACQUAINTANCE':
      return "You're getting to know this person. You can reference basic facts they've shared, but don't overstep.";
    case 'FAMILIAR':
      return "You know this person fairly well. Reference ongoing themes and check in on things they've mentioned before.";
    case 'CLOSE':
      return "You have a developed understanding. You can make connections across time and notice patterns in their life.";
    case 'INTIMATE':
      return "You deeply understand this person. You can anticipate needs and reference long-term arcs with confidence.";
  }
}
