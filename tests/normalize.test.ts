import { describe, expect, it } from 'vitest';
import { normalizeDomain, normalizeEmail, normalizePhone } from '@/lib/db/normalize';
describe('normalization helpers', () => { it('normalizes email case and spaces', () => expect(normalizeEmail(' Owner@Spa.COM ')).toBe('owner@spa.com')); it('normalizes US phone numbers', () => expect(normalizePhone('+1 (555) 123-4567')).toBe('5551234567')); it('normalizes domains', () => expect(normalizeDomain('https://www.ExampleSpa.com/path')).toBe('examplespa.com')); });
