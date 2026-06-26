import { NextResponse } from 'next/server';
import { checkRateLimit, getRequestIp } from '@/lib/rate-limit';
import { resolveOnboardingByToken, submitOnboarding } from '@/lib/onboarding/service';
import type { OnboardingDraftInput } from '@/lib/onboarding/types';

function deriveLocationCount(responses: OnboardingDraftInput, fallback = 1) {
  const value = responses.business_information?.number_of_locations;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  }
  return fallback;
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const ip = getRequestIp(request);
  const limiter = checkRateLimit(`onboarding:submit:${ip}:${token}`, 10, 60);
  if (!limiter.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429, headers: { 'Retry-After': String(limiter.retryAfter ?? 60) } });
  }

  const resolved = await resolveOnboardingByToken(token);
  if (!resolved) {
    return NextResponse.json({ error: 'Onboarding link is invalid or expired.' }, { status: 404 });
  }

  const locationCount = deriveLocationCount(resolved.responses, 1);
  const submission = await submitOnboarding({
    onboardingId: String(resolved.onboarding.id),
    packageKey: String(resolved.onboarding.package_key),
    locationCount,
    actorType: 'customer',
  });

  if (!submission.ok) {
    return NextResponse.json({
      ok: false,
      error: 'Required onboarding information is missing.',
      completion: submission.completion,
    }, { status: 400 });
  }

  return NextResponse.json({ ok: true, completion: submission.completion });
}
