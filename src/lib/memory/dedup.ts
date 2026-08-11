import { prisma } from '@/lib/db';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'with', 'have', 'this', 'will', 'your', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were', 'what', 'would', 'there', 'their', 'could', 'other', 'after', 'first', 'never', 'these', 'think', 'where', 'being', 'every', 'great', 'might', 'shall', 'still', 'those', 'under', 'while', 'about', 'before', 'right', 'should', 'through', 'years', 'people', 'because', 'between', 'another', 'without', 'against', 'nothing', 'something', 'someone', 'everything', 'anything', 'everyone', 'anyone', 'nobody', 'anybody', 'somebody', 'everybody'
]);

interface DedupResult {
  duplicate: boolean;
  existingMemoryId?: string;
  contradiction?: boolean;
  related?: boolean;
}

export async function findDuplicateOrRelated(
  userId: string,
  statement: string,
  temporalMarker: string | undefined,
  entities: string[],
  category: string
): Promise<DedupResult> {
  const normalized = statement.toLowerCase().trim();
  const words = getSignificantWords(normalized);
  if (words.length === 0) return { duplicate: false };

  const candidates = await prisma.memories.findMany({
    where: {
      userId,
      status: { in: ['ACTIVE', 'SUPERSEDED'] },
      category: category as any,
    },
    take: 50,
    select: { id: true, statement: true, importance: true, type: true },
  });

  for (const candidate of candidates) {
    const candidateWords = getSignificantWords(candidate.statement.toLowerCase());
    const commonWords = words.filter(w => candidateWords.includes(w));
    const overlap = commonWords.length / Math.max(words.length, candidateWords.length);

    if (overlap > 0.85) {
      return { duplicate: true, existingMemoryId: candidate.id };
    }

    if (overlap > 0.5 && temporalMarker && !extractTemporal(candidate.statement)) {
      return { duplicate: false, related: true, existingMemoryId: candidate.id };
    }

    if (overlap > 0.6 && isContradiction(normalized, candidate.statement.toLowerCase())) {
      return { duplicate: false, contradiction: true, existingMemoryId: candidate.id };
    }
  }

  return { duplicate: false };
}

function getSignificantWords(text: string): string[] {
  return Array.from(new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w))
  ));
}

function extractTemporal(text: string): string | null {
  const markers = ['tomorrow', 'today', 'yesterday', 'next week', 'last week', 'this week',
    'next month', 'last month', 'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday'];
  const lower = text.toLowerCase();
  for (const m of markers) {
    if (lower.includes(m)) return m;
  }
  return null;
}

function isContradiction(newText: string, existingText: string): boolean {
  const contradictionMarkers = ['not', 'no longer', 'quit', 'left', 'stopped', 'ended', 'cancelled', 'changed', 'different', 'was', 'used to'];
  return contradictionMarkers.some(m => newText.includes(m)) &&
    contradictionMarkers.some(m => existingText.includes(m));
}
