import { describe, expect, it } from 'vitest';
import { buildTokenExpiry, generateOpaqueToken, hashOnboardingToken, isTokenExpired } from '@/lib/onboarding/tokens';

describe('onboarding token helpers', () => {
  it('generates opaque random token', () => {
    const first = generateOpaqueToken();
    const second = generateOpaqueToken();
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThan(20);
  });

  it('hashes tokens deterministically', () => {
    const token = 'example-token';
    const hashA = hashOnboardingToken(token);
    const hashB = hashOnboardingToken(token);
    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64);
  });

  it('builds token expiry and detects expiration', () => {
    const expiry = buildTokenExpiry(1);
    expect(isTokenExpired(expiry)).toBe(false);
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isTokenExpired(past)).toBe(true);
  });
});
