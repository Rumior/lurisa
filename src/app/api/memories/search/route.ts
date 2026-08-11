import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { searchMemoriesByVector } from '@/lib/vector-search';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

    const results = await searchMemoriesByVector(token.id, query, {
      limit, minSimilarity: 0.6,
      ...(category && category !== 'ALL' ? { categoryFilter: [category] } : {}),
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Vector search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
