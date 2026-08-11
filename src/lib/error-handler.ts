/**
 * Centralized Error Handling & Resilience Layer
 * Apply this to every API route for consistent, user-friendly errors.
 */

import { NextResponse } from 'next/server';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string,
    public isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'AUTH_REQUIRED');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'VALIDATION_FAILED');
  }
}

export class LLMError extends AppError {
  constructor(message = 'AI service temporarily unavailable') {
    super(503, message, 'LLM_UNAVAILABLE');
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database error') {
    super(500, message, 'DATABASE_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(429, message, 'RATE_LIMITED');
  }
}

interface ErrorResponse {
  error: {
    message: string;
    code: string;
    status: number;
  };
  retryAfter?: number;
}

export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  // Log for observability (replace with proper logger in production)
  console.error('[API ERROR]', {
    name: error instanceof Error ? error.name : 'Unknown',
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  // Operational errors (expected, user-friendly)
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      error: {
        message: error.message,
        code: error.code,
        status: error.statusCode,
      },
    };

    if (error instanceof RateLimitError) {
      response.retryAfter = 60;
    }

    return NextResponse.json(response, { status: error.statusCode });
  }

  // LLM-specific failures (Groq down, timeout, rate limit)
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('groq') ||
      msg.includes('openai') ||
      msg.includes('timeout') ||
      msg.includes('econnrefused') ||
      msg.includes('etimedout') ||
      msg.includes('fetch failed') ||
      msg.includes('502') ||
      msg.includes('503') ||
      msg.includes('429')
    ) {
      return NextResponse.json(
        {
          error: {
            message: "I'm having trouble thinking right now. Please try again in a moment.",
            code: 'LLM_UNAVAILABLE',
            status: 503,
          },
          retryAfter: 30,
        },
        { status: 503, headers: { 'Retry-After': '30' } }
      );
    }

    // Database connection failures
    if (
      msg.includes('prisma') ||
      msg.includes('database') ||
      msg.includes('connection') ||
      msg.includes('neon') ||
      msg.includes('pg_')
    ) {
      return NextResponse.json(
        {
          error: {
            message: "I'm having trouble accessing your memories right now. Please try again shortly.",
            code: 'DATABASE_ERROR',
            status: 500,
          },
        },
        { status: 500 }
      );
    }
  }

  // Unknown / unexpected errors — never leak internals
  return NextResponse.json(
    {
      error: {
        message: "Something went wrong on my end. I've noted it down — please try again.",
        code: 'INTERNAL_ERROR',
        status: 500,
      },
    },
    { status: 500 }
  );
}

/**
 * Async wrapper for API route handlers.
 * Usage:
 *   export const POST = withErrorHandler(async (req) => { ... });
 */
export function withErrorHandler(
  handler: (req: Request) => Promise<NextResponse>
) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Retry with exponential backoff for any async operation.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
    retryableErrors?: string[];
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    onRetry,
    retryableErrors = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', '503', '429', '502', 'fetch failed'],
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isRetryable = retryableErrors.some((code) =>
        lastError!.message.includes(code)
      );

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt),
        maxDelayMs
      );

      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError!;
}