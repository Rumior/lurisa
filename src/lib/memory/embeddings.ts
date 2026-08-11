/**
 * Embedding Generation — using Jina AI (free tier)
 * Sign up: https://jina.ai/embeddings
 */

import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';

const jina = new OpenAI({
  apiKey: process.env.JINA_API_KEY || 'jina_',
  baseURL: 'https://api.jina.ai/v1',
});

const MODEL = 'jina-embeddings-v2-base-en';

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const res = await jina.embeddings.create({
      model: MODEL,
      input: text,
    });
    return res.data[0].embedding;
  } catch (err) {
    console.error('[EMBEDDING] Jina failed:', err);
    return new Array(768).fill(0);
  }
}

export async function storeEmbedding(
  userId: string,
  memoryId: string,
  text: string
): Promise<void> {
  try {
    const emb = await generateEmbedding(text);
    const vec = '[' + emb.join(',') + ']';

    await prisma.$executeRawUnsafe(
      `INSERT INTO "memory_embeddings" ("id", "memoryId", "userId", "embedding", "createdAt") VALUES ($1, $2, $3, $4::vector, NOW())`,
      randomUUID(),
      memoryId,
      userId,
      vec
    );

    console.log('[MEMORY] Embedding stored for:', memoryId);
  } catch (err) {
    console.error('[MEMORY] Embedding storage failed:', err);
  }
}