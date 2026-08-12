import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return NextResponse.json({
    hasToken: !!token,
    tokenId: token?.id || null,
    tokenEmail: token?.email || null,
  });
}