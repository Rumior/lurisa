import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isAdmin, getUserList } from '@/lib/admin';
import { authRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isAdmin(token.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Admin-specific rate limit
    const rateLimit = await authRateLimit.api(`admin:${token.id}`);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    const data = await getUserList(page, Math.min(pageSize, 100));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
