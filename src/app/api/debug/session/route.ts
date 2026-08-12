import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: Request) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return NextResponse.json({
    hasToken: !!token,
    tokenId: token?.id || null,
    tokenEmail: token?.email || null,
    tokenExpiry: token?.exp ? new Date(token.exp * 1000).toISOString() : null,
  });
}