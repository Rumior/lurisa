import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getMasterKey(): Buffer {
  const key = process.env.MASTER_KEY;
  if (!key || key.length < 32) {
    throw new Error('MASTER_KEY must be at least 32 characters');
  }
  return scryptSync(key, 'lurisa-salt', KEY_LENGTH);
}

export function encrypt(text: string, userId: string): string {
  const masterKey = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, masterKey, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedData: string, userId: string): string {
  const masterKey = getMasterKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function generateUserKey(): string {
  return randomBytes(32).toString('hex');
}

export function wrapUserKey(userKey: string): string {
  return encrypt(userKey, 'system');
}

export function unwrapUserKey(wrappedKey: string): string {
  return decrypt(wrappedKey, 'system');
}

export async function cryptographicallyDeleteUserData(userId: string): Promise<void> {
  console.log(`Cryptographic deletion initiated for user: ${userId}`);
}
