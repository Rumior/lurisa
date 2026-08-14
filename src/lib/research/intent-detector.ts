import { generateStructuredResponse } from '@/lib/llm/gateway';
import { ResearchDepth } from './types';

export interface ResearchIntent {
  isResearch: boolean;
  depth: ResearchDepth;
  objective: string;
}

export async function detectResearchIntent(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<ResearchIntent | null> {
  const lowerMsg = message.toLowerCase();
  const researchTriggers = [
    'research', 'investigate', 'find out', 'look into', 'compare',
    'best', 'should i', 'worth it', 'pros and cons', 'vs', 'versus',
    'market', 'statistics', 'data on', 'information about',
    'how to start', 'how to launch', 'regulations', 'requirements',
  ];
  
  const hasTrigger = researchTriggers.some(t => lowerMsg.includes(t));
  const isQuestion = message.includes('?') || lowerMsg.startsWith('what') || lowerMsg.startsWith('how') || lowerMsg.startsWith('why') || lowerMsg.startsWith('which');
  
  if (!hasTrigger && !isQuestion) return null;

  const historyText = history.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n');

  const systemPrompt = `Determine if the user is requesting research/investigation.

Return JSON:
{
  "isResearch": true/false,
  "depth": "QUICK" | "DEEP" | "REPORT",
  "objective": "clear research objective"
}

Depth rules:
- QUICK: Simple facts, current info, prices, definitions (30-60s)
- DEEP: Comparisons, decisions, market analysis, recommendations (2-5min)
- REPORT: Academic, business plan, investment analysis, policy (5+ min)

The user should NOT need research for:
- Personal reflection or emotional support
- Casual conversation or greetings
- Questions about their own memories or past conversations
- Creative writing or brainstorming without factual needs`;

  const result = await generateStructuredResponse<{
    isResearch: boolean;
    depth: ResearchDepth;
    objective: string;
  }>(
    systemPrompt,
    `Recent conversation:\n${historyText}\n\nCurrent message: "${message}"`,
    { maxTokens: 128, temperature: 0.2 }
  );

  if (!result?.isResearch) return null;

  return {
    isResearch: true,
    depth: result.depth || 'QUICK',
    objective: result.objective || message,
  };
}