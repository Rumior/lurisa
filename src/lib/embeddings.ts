import OpenAI from 'openai';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not configured');
    openai = new OpenAI({ apiKey: key });
  }
  return openai;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAI();
  const truncated = text.slice(0, 8000);
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: truncated,
    dimensions: 1536,
  });
  return response.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const client = getOpenAI();
  const truncated = texts.map(t => t.slice(0, 8000));
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: truncated,
    dimensions: 1536,
  });
  return response.data.map(d => d.embedding);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
