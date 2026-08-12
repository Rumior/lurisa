import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { generateLurisaResponse } from '@/lib/llm/gateway';
import { extractMemoriesFromTurn } from '@/lib/memory/extraction';
import { matchIntentToMessage } from '@/lib/follow-up';
import { buildGoalContext, injectGoalContext } from '@/lib/goals/chat-context';
import { detectMilestone } from '@/lib/timeline/milestones';
import { prisma } from '@/lib/db';
import { handleApiError, withRetry } from '@/lib/error-handler';

export async function POST(req: NextRequest) {
  try {
    // â”€â”€ Auth â”€â”€
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json(
        { error: { message: 'Please sign in to continue.', code: 'AUTH_REQUIRED', status: 401 } },
        { status: 401 }
      );
    }

    // â”€â”€ Parse & validate â”€â”€
    let body: { message?: string; conversationId?: string; history?: any[] };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { message: 'Invalid JSON in request body.', code: 'BAD_REQUEST', status: 400 } },
        { status: 400 }
      );
    }

    const { message, conversationId, history } = body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: { message: 'Message is required and cannot be empty.', code: 'VALIDATION_FAILED', status: 400 } },
        { status: 400 }
      );
    }

    if (message.length > 4000) {
      return NextResponse.json(
        { error: { message: 'Message is too long. Please keep it under 4000 characters.', code: 'VALIDATION_FAILED', status: 400 } },
        { status: 400 }
      );
    }

    // â”€â”€ Get or create conversation â”€â”€
    let convId = conversationId;
    if (!convId) {
      const conv = await withRetry(
        () => prisma.conversations.create({
          data: {
            userId: token.id,
            title: message.slice(0, 50),
            updatedAt: new Date(),
          },
        }),
        { maxRetries: 2, baseDelayMs: 100 }
      );
      convId = conv.id;
    }

    // â”€â”€ Store user message â”€â”€
    await withRetry(
      () => prisma.messages.create({
        data: {
          conversationId: convId,
          userId: token.id,
          role: 'USER',
          content: message,
        },
      }),
      { maxRetries: 2, baseDelayMs: 100 }
    );

    // â”€â”€ OPEN-LOOP RESOLUTION (Upgrade 5) â”€â”€
    // Before treating this as a fresh topic, check if it's a response
    // to a pending follow-up intent ("How did it go?" â†’ "She said yes!")
    let intentContext = '';
    let intentResolved = false;

    try {
      const match = await matchIntentToMessage(token.id, message, convId);
      if (match.matched && match.outcome) {
        intentResolved = true;
        intentContext = `The user is responding to a follow-up about: ${match.action}. `;
        if (match.outcome.whatHappened) {
          intentContext += `They reported: ${match.outcome.whatHappened}. `;
        }
        if (match.outcome.sentiment) {
          intentContext += `Sentiment: ${match.outcome.sentiment}. `;
        }
        console.log(`[CHAT] Resolved intent ${match.intentId} for user ${token.id}`);
      }
    } catch (err) {
      // Intent resolution failure should NOT block the chat
      console.error('[CHAT] Intent resolution error (non-blocking):', err);
    }

    // â”€â”€ Generate response â”€â”€
    const result = await generateLurisaResponse({
      message: intentContext ? `${intentContext}

${message}` : message,
      userId: token.id,
      conversationHistory: history || [],
    });

    // â”€â”€ Store assistant message â”€â”€
    await withRetry(
      () => prisma.messages.create({
        data: {
          conversationId: convId,
          userId: token.id,
          role: 'ASSISTANT',
          content: result.response,
        },
      }),
      { maxRetries: 2, baseDelayMs: 100 }
    );

    // â”€â”€ Async memory extraction (never blocks response) â”€â”€
    extractMemoriesFromTurn(token.id, convId, message, result.response).catch((err) => {
      console.error('[CHAT] Memory extraction error (non-blocking):', err);
    });

    // â”€â”€ Return â”€â”€
    return NextResponse.json({
      response: result.response,
      conversationId: convId,
      meta: {
        qualityScore: result.qualityScore,
        retriesUsed: result.retriesUsed,
        fallback: result.fallback || false,
        intentResolved,
      },
    });

  } catch (error) {
    return handleApiError(error);
  }
}

