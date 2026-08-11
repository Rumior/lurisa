import crypto from 'crypto';

// CSRF token generation
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function verifyCSRFToken(token: string, storedToken: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
  } catch {
    return false;
  }
}

// Password strength validation
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 12) score++;
  else feedback.push('Use at least 12 characters');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Include uppercase letters');

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Include lowercase letters');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Include numbers');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('Include special characters');

  return {
    valid: score >= 4,
    score,
    feedback,
  };
}

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 10000);
}

// Secure random ID
export function secureId(length = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

// Hash for comparison (e.g., device fingerprint)
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// Anomaly detection helper
export function detectAnomaly(
  current: number,
  historical: number[],
  threshold = 2
): boolean {
  if (historical.length < 5) return false;

  const mean = historical.reduce((a, b) => a + b, 0) / historical.length;
  const variance = historical.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / historical.length;
  const stdDev = Math.sqrt(variance);

  return Math.abs(current - mean) > threshold * stdDev;
}
