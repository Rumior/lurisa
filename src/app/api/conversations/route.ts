import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await prisma.conversations.findMany({
      where: { userId: token.id },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ conversations: conversations || [] });
  } catch (error) {
    console.error('Conversations fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await req.json();

    const conversation = await prisma.conversations.create({
      data: {
        userId: token.id,
        title: title || 'New Conversation',
      },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error('Conversation creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}