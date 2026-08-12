import { prisma } from "@/lib/db";

export interface GoalContext {
  hasGoals: boolean;
  activeGoals: Array<{ id: string; title: string; description?: string; targetDate?: Date }>;
  progressHints: string[];
}

export async function buildGoalContext(userId: string): Promise<GoalContext> {
  const activeGoals = await prisma.goals.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: { targetDate: "asc" },
    take: 5,
  });

  const progressHints: string[] = [];
  for (const goal of activeGoals) {
    if (goal.targetDate) {
      const daysUntil = Math.ceil((goal.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 0 && daysUntil <= 7) {
        progressHints.push(`Goal "${goal.title}" is due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}.`);
      }
    }
  }

  return {
    hasGoals: activeGoals.length > 0,
    activeGoals: activeGoals.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description || undefined,
      targetDate: g.targetDate || undefined,
    })),
    progressHints,
  };
}

export function injectGoalContext(basePrompt: string, context: GoalContext): string {
  if (!context.hasGoals) return basePrompt;
  const goalLines = context.activeGoals
    .map((g) => `- ${g.title}${g.targetDate ? ` (due ${g.targetDate.toISOString().split("T")[0]})` : ""}`)
    .join("\n");
  const hintLines = context.progressHints.length > 0
    ? `\nUpcoming deadlines:\n${context.progressHints.join("\n")}`
    : "";
  return `${basePrompt}\n\nThe user has the following active goals:\n${goalLines}${hintLines}\n\nWhen relevant, gently ask about progress toward these goals or offer encouragement.`;
}