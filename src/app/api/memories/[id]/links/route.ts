import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getLinkedMemories } from '@/lib/graph-queries';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const links = await getLinkedMemories(token.id, params.id, { limit: 20 });
    return NextResponse.json({ links });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
