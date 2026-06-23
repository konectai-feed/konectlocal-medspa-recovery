const rateLimitStore = new Map<string, { count: number; expiresAt: number }>();

export function getRequestIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export function checkRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const existing = rateLimitStore.get(key);
  if (!existing || existing.expiresAt <= now) {
    rateLimitStore.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1 };
  }
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((existing.expiresAt - now) / 1000) };
  }
  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count };
}
