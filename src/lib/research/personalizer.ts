import { generateStructuredResponse } from '@/lib/llm/gateway';
import { getPersonalModel } from '@/lib/personal-model/store';
import { getMemoryContext } from '@/lib/memory/context';
import { ResearchFinding } from './types';

export interface PersonalizationResult {
  interpretation: string;
  recommendation?: string;
}

export async function personalizeFindings(
  userId: string,
  query: string,
  findings: ResearchFinding[]
): Promise<PersonalizationResult> {
  const [personalModel, memoryCtx] = await Promise.all([
    getPersonalModel(userId).catch(() => null),
    getMemoryContext(userId, query).catch(() => ''),
  ]);

  const findingsText = findings.map((f, i) => `${i + 1}. [${f.category}] ${f.finding} (confidence: ${Math.round(f.confidence * 100)}%)`).join('\n');

  const personalModelText = personalModel
    ? `Communication style: ${personalModel.communicationStyle || 'unknown'}
Decision making: ${personalModel.decisionMaking || 'unknown'}
Work interests: ${personalModel.workInterests || 'unknown'}
Current goals: ${personalModel.currentGoalsSummary || 'unknown'}
Recurring concerns: ${personalModel.recurringConcerns || 'unknown'}
Life phase: ${personalModel.lifePhase || 'unknown'}
Important relationships: ${personalModel.importantRelationships || 'unknown'}`
    : 'No personal model available.';

  const systemPrompt = `You are a personalized research interpreter. Connect objective research findings to the user's personal context.

Return JSON:
{
  "interpretation": "2-3 sentences explaining what these findings mean for this specific user",
  "recommendation": "specific actionable recommendation based on their context, or null if not appropriate"
}

Be specific. Reference their actual goals, concerns, and situation. Do not be generic.`;

  const result = await generateStructuredResponse<{
    interpretation: string;
    recommendation?: string;
  }>(
    systemPrompt,
    `User query: ${query}\n\nResearch findings:\n${findingsText}\n\nUser context:\n${personalModelText}\n\nRelevant memories:\n${memoryCtx}`,
    { maxTokens: 384, temperature: 0.4 }
  );

  if (!result) {
    return { interpretation: 'Research completed. Findings are available above.' };
  }

  return {
    interpretation: result.interpretation || '',
    recommendation: result.recommendation,
  };
}