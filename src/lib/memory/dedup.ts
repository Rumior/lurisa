import { prisma } from '@/lib/db';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'with', 'have', 'this', 'will', 'your', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were', 'what', 'would', 'there', 'their', 'could', 'other', 'after', 'first', 'never', 'these', 'think', 'where', 'being', 'every', 'great', 'might', 'shall', 'still', 'those', 'under', 'while', 'about', 'before', 'right', 'should', 'through', 'years', 'people', 'because', 'between', 'another', 'without', 'against', 'nothing', 'something', 'someone', 'everything', 'anything', 'everyone', 'anyone', 'nobody', 'anybody', 'somebody', 'everybody'
]);

const MERGEABLE_CATEGORIES: Record<string, string[]> = {
  CAREER: ['PROJECTS', 'GOALS', 'BUSINESS'],
  PROJECTS: ['CAREER', 'GOALS', 'BUSINESS'],
  GOALS: ['CAREER', 'PROJECTS', 'BUSINESS'],
  EMOTIONS: ['DAILY_REFLECTIONS', 'STORIES'],
  DAILY_REFLECTIONS: ['EMOTIONS', 'STORIES'],
  STORIES: ['EMOTIONS', 'DAILY_REFLECTIONS'],
  PREFERENCES: ['HABITS', 'IDENTITY'],
  HABITS: ['PREFERENCES', 'IDENTITY'],
};

interface DedupResult {
  action: 'CREATE' | 'REINFORCE' | 'MERGE' | 'SKIP_CONTRADICTION' | 'SKIP_HALLUCINATION' | 'SKIP_DUPLICATE';
  existingMemoryId?: string;
  targetCategory?: string;
  reason: string;
}

export async function findDuplicateOrRelated(
  userId: string,
  statement: string,
  category: string,
  entities: string[]
): Promise<DedupResult> {
  const normalized = statement.toLowerCase().trim();
  const words = getSignificantWords(normalized);
  if (words.length === 0) return { action: 'CREATE', reason: 'empty words' };

  const categoriesToCheck = [category, ...(MERGEABLE_CATEGORIES[category] || [])];

  const candidates = await prisma.memories.findMany({
    where: {
      userId,
      status: { in: ['ACTIVE', 'SUPERSEDED'] },
      category: { in: categoriesToCheck as any },
    },
    take: 100,
    select: { id: true, statement: true, importance: true, type: true, category: true, createdAt: true },
  });

  candidates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  for (const candidate of candidates) {
    const candidateWords = getSignificantWords(candidate.statement.toLowerCase());
    const commonWords = words.filter(w => candidateWords.includes(w));
    const overlap = commonWords.length / Math.max(words.length, candidateWords.length);

    if (overlap > 0.80) {
      return {
        action: 'SKIP_DUPLICATE',
        existingMemoryId: candidate.id,
        reason: `semantic duplicate (${(overlap * 100).toFixed(0)}% overlap)`,
      };
    }

    if (overlap > 0.50) {
      if (isContradiction(normalized, candidate.statement.toLowerCase())) {
        return {
          action: 'SKIP_CONTRADICTION',
          existingMemoryId: candidate.id,
          reason: 'contradiction detected',
        };
      }

      const targetCategory = candidate.category === category ? category
        : isMoreSpecific(candidate.category, category) ? candidate.category
        : category;

      return {
        action: 'REINFORCE',
        existingMemoryId: candidate.id,
        targetCategory,
        reason: `related memory found (${(overlap * 100).toFixed(0)}% overlap) in ${candidate.category}`,
      };
    }

    if (entities.length > 0 && candidateWords.some(w => entities.includes(w))) {
      const entityOverlap = entities.filter(e => candidateWords.includes(e)).length / entities.length;
      if (entityOverlap > 0.5) {
        return {
          action: 'REINFORCE',
          existingMemoryId: candidate.id,
          reason: `entity match (${entities.filter(e => candidateWords.includes(e)).join(', ')})`,
        };
      }
    }
  }

  return { action: 'CREATE', reason: 'no match found' };
}

export function checkHallucination(statement: string, userMessage: string): { isHallucination: boolean; reason?: string } {
  const lowerStatement = statement.toLowerCase();
  const lowerUserMsg = userMessage.toLowerCase();

  const statementNumbers = lowerStatement.match(/\b\d{1,4}\b/g) || [];
  const userNumbers = lowerUserMsg.match(/\b\d{1,4}\b/g) || [];

  const smallNumbers = new Set(['1', '2', '3']);

  for (const num of statementNumbers) {
    if (!userNumbers.includes(num) && !smallNumbers.has(num)) {
      return { isHallucination: true, reason: `number "${num}" not in user message` };
    }
  }

  const statementDates = lowerStatement.match(/\b\d{1,2}(?:st|nd|rd|th)\b/g) || [];
  const userDates = lowerUserMsg.match(/\b\d{1,2}(?:st|nd|rd|th)\b/g) || [];

  for (const date of statementDates) {
    if (!userDates.includes(date)) {
      return { isHallucination: true, reason: `date "${date}" not in user message` };
    }
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const statementDays = days.filter(d => lowerStatement.includes(d));
  const userDays = days.filter(d => lowerUserMsg.includes(d));

  for (const day of statementDays) {
    if (!userDays.includes(day)) {
      return { isHallucination: true, reason: `day "${day}" not in user message` };
    }
  }

  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const statementMonths = months.filter(m => lowerStatement.includes(m));
  const userMonths = months.filter(m => lowerUserMsg.includes(m));

  for (const month of statementMonths) {
    if (!userMonths.includes(month)) {
      return { isHallucination: true, reason: `month "${month}" not in user message` };
    }
  }

  return { isHallucination: false };
}

function getSignificantWords(text: string): string[] {
  return Array.from(new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w))
  ));
}

function isContradiction(newText: string, existingText: string): boolean {
  const contradictionMarkers = ['not', 'no longer', 'quit', 'left', 'stopped', 'ended', 'cancelled', 'changed', 'different', 'was', 'used to'];
  return contradictionMarkers.some(m => newText.includes(m)) &&
    contradictionMarkers.some(m => existingText.includes(m));
}

function isMoreSpecific(a: string, b: string): boolean {
  const specificity: Record<string, number> = {
    CAREER: 3, BUSINESS: 3, GOALS: 3,
    PROJECTS: 2,
    EMOTIONS: 3, STORIES: 2, DAILY_REFLECTIONS: 1,
    PREFERENCES: 2, HABITS: 2, IDENTITY: 1,
  };
  return (specificity[a] || 0) > (specificity[b] || 0);
}
