import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/error-handler';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'AUTH_REQUIRED', status: 401 } },
        { status: 401 }
      );
    }

    const memory = await prisma.memories.findFirst({
      where: { id: params.id, userId: token.id },
      include: {
        conversations: { select: { createdAt: true } },
        memory_links_memory_links_memoryIdATomemories: {
          include: {
            memories_memory_links_memoryIdBTomemories: { select: { id: true, statement: true } },
          },
        },
        memory_links_memory_links_memoryIdBTomemories: {
          include: {
            memories_memory_links_memoryIdATomemories: { select: { id: true, statement: true } },
          },
        },
      },
    });

    if (!memory) {
      return NextResponse.json(
        { error: { message: 'Not found', code: 'NOT_FOUND', status: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ memory });
  } catch (error) {
    return handleApiError(error);
  }
}
