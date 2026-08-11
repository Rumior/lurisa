import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { generateMFASecret, generateQRCode } from '@/lib/mfa';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { secret, otpauthUrl } = generateMFASecret(token.id);
    const qrCode = await generateQRCode(otpauthUrl);

    return NextResponse.json({
      secret,
      qrCode,
      message: 'Scan this QR code with your authenticator app',
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
