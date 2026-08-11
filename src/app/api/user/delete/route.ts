import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';
import { redis, revokeAllUserSessions } from '@/lib/redis';
import { cryptographicallyDeleteUserData } from '@/lib/encryption';
import { logAudit } from '@/lib/audit';

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { password } = await req.json();

    const user = await prisma.users.findUnique({
      where: { id: token.id },
      select: { id: true, passwordHash: true, email: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const userId = user.id;

    await revokeAllUserSessions(userId);
    await cryptographicallyDeleteUserData(userId);
    await prisma.users.delete({ where: { id: userId } });

    const keys = await redis.keys(`*:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    await logAudit({
      userId,
      action: 'account.delete',
      details: 'Full account deletion completed',
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
