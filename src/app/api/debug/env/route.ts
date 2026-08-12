import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    nextauth_url: process.env.NEXTAUTH_URL || 'NOT SET',
    app_url: process.env.APP_URL || 'NOT SET',
    has_secret: !!process.env.NEXTAUTH_SECRET,
    has_database: !!process.env.DATABASE_URL,
    has_redis: !!process.env.REDIS_URL,
    node_env: process.env.NODE_ENV,
  });
}
