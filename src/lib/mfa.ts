import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export function generateMFASecret(userId: string): { secret: string; otpauthUrl: string } {
  const secret = speakeasy.generateSecret({
    name: `lurisa:${userId}`,
    issuer: 'lurisa',
    length: 32,
  });

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url || '',
  };
}

export async function generateQRCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyMFAToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2,
  });
}
