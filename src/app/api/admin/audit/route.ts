import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isAdmin, getAuditLogs } from '@/lib/admin';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id || !(await isAdmin(token.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '100');

    const data = await getAuditLogs(page, Math.min(pageSize, 500));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Admin audit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
