import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const devices = await prisma.devices.findMany({
      where: { userId: token.id },
      orderBy: { lastSeenAt: 'desc' },
    });

    return NextResponse.json({ devices });
  } catch (error) {
    console.error('Devices fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceId, trusted } = await req.json();

    const device = await prisma.devices.updateMany({
      where: { id: deviceId, userId: token.id },
      data: {
        trusted,
        trustedAt: trusted ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, device });
  } catch (error) {
    console.error('Device update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
