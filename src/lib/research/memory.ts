import { ResearchFinding } from './types';
import { extractMemoriesFromTurn } from '@/lib/memory/extraction';

export async function saveResearchAsMemories(
  userId: string,
  conversationId: string,
  query: string,
  findings: ResearchFinding[],
  recommendation?: string
): Promise<void> {
  const assistantMessage = `Research on "${query}":\n${findings.map(f => `- ${f.finding}`).join('\n')}${recommendation ? `\n\nRecommendation: ${recommendation}` : ''}`;

  await extractMemoriesFromTurn(
    userId,
    conversationId,
    query,
    assistantMessage
  );
}