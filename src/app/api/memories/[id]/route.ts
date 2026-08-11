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
        memory_links_memory_links_memoryIdATomemories: {
          include: { memories_memory_links_memoryIdBTomemories: true },
        },
        memory_links_memory_links_memoryIdBTomemories: {
          include: { memories_memory_links_memoryIdATomemories: true },
        },
        memory_edits: { orderBy: { editedAt: 'desc' }, take: 5 },
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'AUTH_REQUIRED', status: 401 } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { statement } = body;

    if (!statement || typeof statement !== 'string') {
      return NextResponse.json(
        { error: { message: 'Statement is required', code: 'VALIDATION_FAILED', status: 400 } },
        { status: 400 }
      );
    }

    const existing = await prisma.memories.findFirst({
      where: { id: params.id, userId: token.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Not found', code: 'NOT_FOUND', status: 404 } },
        { status: 404 }
      );
    }

    // Record the edit
    await prisma.memory_edits.create({
      data: {
        userId: token.id,
        memoryId: params.id,
        previousStatement: existing.statement,
        newStatement: statement,
      },
    });

    const updated = await prisma.memories.update({
      where: { id: params.id },
      data: {
        statement,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ memory: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'AUTH_REQUIRED', status: 401 } },
        { status: 401 }
      );
    }

    const existing = await prisma.memories.findFirst({
      where: { id: params.id, userId: token.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Not found', code: 'NOT_FOUND', status: 404 } },
        { status: 404 }
      );
    }

    await prisma.memories.update({
      where: { id: params.id },
      data: { status: 'DELETED' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
