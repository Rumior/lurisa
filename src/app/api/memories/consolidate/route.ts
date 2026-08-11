import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { runConsolidation } from '@/lib/consolidation';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await runConsolidation(token.id);
    return NextResponse.json({ message: 'Consolidation complete', consolidated: result.consolidated, archived: result.archived });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
