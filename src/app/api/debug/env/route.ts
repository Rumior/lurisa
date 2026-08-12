import { NextResponse } from 'next/server';

export async function GET() {
  const checks = {
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasNextauthSecret: !!process.env.NEXTAUTH_SECRET,
    hasNextauthUrl: !!process.env.NEXTAUTH_URL,
    hasRedisUrl: !!process.env.REDIS_URL,
    hasOpenAiKey: !!process.env.OPENAI_API_KEY,
    nodeEnv: process.env.NODE_ENV,
  };
  
  return NextResponse.json({ checks });
}