import { prisma } from "@/lib/db";
import { createScheduledIntent } from "@/lib/follow-up";

export async function detectMilestone(
  userId: string,
  conversationId: string,
  userMessage: string,
  assistantMessage: string
): Promise<{ detected: boolean; milestoneId?: string }> {
  const milestoneIndicators = [
    /\b(finished|completed|achieved|accomplished|graduated|promoted|hired|married|moved|bought|won|passed)\b/i,
    /\b(first time|finally|after .* (years|months)|dream come true)\b/i,
  ];

  const combined = `${userMessage} ${assistantMessage}`;
  const isMilestone = milestoneIndicators.some((p) => p.test(combined));
  if (!isMilestone) return { detected: false };

  const summary = `Milestone: ${combined.slice(0, 120)}...`;
  const memory = await prisma.memories.create({
    data: {
      userId,
      category: "ACHIEVEMENTS",
      type: "STORY",
      statement: summary,
      confidence: 0.85,
      importance: 0.8,
      sourceConversationId: conversationId,
    },
  });

  const event = await prisma.timeline_events.create({
    data: {
      userId,
      title: "Milestone detected",
      description: combined.slice(0, 500),
      eventType: "MILESTONE",
      eventDate: new Date(),
      memoryId: memory.id,
      importance: 0.8,
    },
  });

  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  await createScheduledIntent({
    userId,
    sourceMemoryId: memory.id,
    triggerType: "DATE",
    triggerAt: nextYear,
    actionType: "ANNIVERSARY_NOTE",
    expectsResponse: false,
    recurrenceRule: "ANNUAL",
  });

  return { detected: true, milestoneId: event.id };
}