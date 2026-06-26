import { describe, expect, it } from 'vitest';

function parseAllowlist(raw: string | undefined) {
  return new Set((raw ?? '').split(',').map((entry) => entry.trim().toLowerCase()).filter(Boolean));
}

describe('admin allowlist parsing', () => {
  it('parses normalized email allowlist entries', () => {
    const allowlist = parseAllowlist('Admin@Example.com, ops@example.com , ,');
    expect(allowlist.has('admin@example.com')).toBe(true);
    expect(allowlist.has('ops@example.com')).toBe(true);
    expect(allowlist.size).toBe(2);
  });
});
