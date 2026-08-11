import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';
import { addExportJob } from '@/lib/queue';
import { handleApiError } from '@/lib/error-handler';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'AUTH_REQUIRED', status: 401 } },
        { status: 401 }
      );
    }

    const jobId = crypto.randomUUID();
    await addExportJob({ userId: token.id, jobId, format: 'json' });

    return NextResponse.json({ jobId, status: 'queued' });
  } catch (error) {
    return handleApiError(error);
  }
}
