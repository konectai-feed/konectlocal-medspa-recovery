import crypto from 'node:crypto';

const HASH_ALGORITHM = 'sha256';

export function generateOpaqueToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashOnboardingToken(token: string) {
  return crypto.createHash(HASH_ALGORITHM).update(token).digest('hex');
}

export function buildTokenExpiry(hours = 72) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function isTokenExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now();
}
