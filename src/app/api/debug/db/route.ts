import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    const userCount = await prisma.users.count();
    return NextResponse.json({
      dbConnected: true,
      userCount,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({
      dbConnected: false,
      error: error.message,
      code: error.code,
    }, { status: 500 });
  }
}