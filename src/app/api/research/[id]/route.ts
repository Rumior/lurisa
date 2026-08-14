import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getResearchSession } from '@/lib/research/engine';
import { handleApiError } from '@/lib/error-handler';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getResearchSession(params.id);
    if (!session || session.userId !== token.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    return handleApiError(error);
  }
}