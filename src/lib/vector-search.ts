import { prisma } from './db';
import { generateEmbedding, cosineSimilarity } from './embeddings';

interface VectorSearchResult {
  memoryId: string;
  statement: string;
  category: string;
  type: string;
  importance: number;
  similarity: number;
}

export async function searchMemoriesByVector(
  userId: string,
  query: string,
  options: { limit?: number; minSimilarity?: number; categoryFilter?: string[]; typeFilter?: string[] } = {}
): Promise<VectorSearchResult[]> {
  const { limit = 10, minSimilarity = 0.7, categoryFilter, typeFilter } = options;

  try {
    const queryEmbedding = await generateEmbedding(query);
    const embeddingString = `[${queryEmbedding.join(',')}]`;

    const catFilter = categoryFilter && categoryFilter.length > 0 
      ? `AND m.category IN (${categoryFilter.map(c => `'${c}'`).join(',')})` : '';
    const typeFilterSql = typeFilter && typeFilter.length > 0 
      ? `AND m.type IN (${typeFilter.map(t => `'${t}'`).join(',')})` : '';

    const results = await prisma.$queryRawUnsafe<VectorSearchResult[]>(`
      SELECT 
        m.id as "memoryId",
        m.statement,
        m.category,
        m.type,
        m.importance,
        1 - (me.embedding <=> '${embeddingString}'::vector) as similarity
      FROM memories m
      JOIN memory_embeddings me ON m.id = me."memoryId"
      WHERE m."userId" = '${userId}'
        AND m.status = 'ACTIVE'
        AND 1 - (me.embedding <=> '${embeddingString}'::vector) >= ${minSimilarity}
        ${catFilter}
        ${typeFilterSql}
      ORDER BY me.embedding <=> '${embeddingString}'::vector
      LIMIT ${limit}
    `);

    return results;
  } catch (error) {
    console.warn('pgvector search failed, falling back to in-memory:', error);
    return fallbackVectorSearch(userId, query, options);
  }
}

async function fallbackVectorSearch(
  userId: string,
  query: string,
  options: { limit?: number; minSimilarity?: number; categoryFilter?: string[]; typeFilter?: string[] }
): Promise<VectorSearchResult[]> {
  const { limit = 10, minSimilarity = 0.7, categoryFilter, typeFilter } = options;
  const queryEmbedding = await generateEmbedding(query);

  const candidates = await prisma.memories.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      memory_embeddings: { isNot: null },
      ...(categoryFilter?.length ? { category: { in: categoryFilter as any } } : {}),
      ...(typeFilter?.length ? { type: { in: typeFilter as any } } : {}),
    },
    include: { memory_embeddings: true },
    take: 200,
  });

  const scored = candidates
    .filter(c => {
      const me = c.memory_embeddings as any;
      return me && me.embedding;
    })
    .map(c => {
      const me = c.memory_embeddings as any;
      const memEmbedding = me.embedding as number[];
      const similarity = cosineSimilarity(queryEmbedding, memEmbedding);
      return {
        memoryId: c.id,
        statement: c.statement,
        category: c.category,
        type: c.type,
        importance: c.importance,
        similarity,
      };
    })
    .filter(c => c.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return scored;
}

export async function storeEmbedding(memoryId: string, userId: string, text: string): Promise<void> {
  const embedding = await generateEmbedding(text);
  await prisma.memory_embeddings.upsert({
    where: { memoryId },
    update: { embedding: embedding as any } as any,
    create: { memoryId, userId, embedding: embedding as any } as any,
  });
}
