import { generateStructuredResponse } from '@/lib/llm/gateway';
import { ResearchPlan, ResearchDepth } from './types';

export async function createResearchPlan(
  query: string,
  depth: ResearchDepth,
  userContext?: string
): Promise<ResearchPlan> {
  const systemPrompt = `You are a research planner for a personal AI companion. Create a structured research plan.

Return JSON:
{
  "objective": "clear research objective",
  "questions": [
    { "question": "specific question", "priority": 1-5, "category": "category" }
  ],
  "requiredEvidence": ["type of evidence needed"],
  "estimatedTimeSeconds": number
}`;

  const userPrompt = `User query: "${query}"
Research depth: ${depth}
${userContext ? `User context: ${userContext}` : ''}

Create a focused research plan. For QUICK research: 2-3 questions. For DEEP: 4-6 questions. For REPORT: 6-10 questions.`;

  const result = await generateStructuredResponse<{
    objective: string;
    questions: Array<{ question: string; priority: number; category: string }>;
    requiredEvidence: string[];
    estimatedTimeSeconds: number;
  }>(systemPrompt, userPrompt, { maxTokens: 512, temperature: 0.3 });

  if (!result) {
    return {
      objective: query,
      depth,
      questions: [{ question: query, priority: 5, category: 'general' }],
      requiredEvidence: ['web sources'],
      estimatedTimeSeconds: depth === 'QUICK' ? 30 : depth === 'DEEP' ? 120 : 300,
    };
  }

  return {
    objective: result.objective || query,
    depth,
    questions: result.questions || [],
    requiredEvidence: result.requiredEvidence || [],
    estimatedTimeSeconds: result.estimatedTimeSeconds || 60,
  };
}