import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getRequestIp } from '@/lib/rate-limit';
import { resolveOnboardingByToken, saveOnboardingDraft } from '@/lib/onboarding/service';
import type { OnboardingDraftInput } from '@/lib/onboarding/types';

const patchSchema = z.object({
  responses: z.record(z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.unknown()), z.record(z.unknown()), z.null()]))),
});

function containsForbiddenCredentialField(responses: OnboardingDraftInput) {
  for (const section of Object.values(responses)) {
    if (!section) continue;
    for (const key of Object.keys(section)) {
      if (/password|passphrase|secret/i.test(key)) {
        return true;
      }
    }
  }
  return false;
}

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

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const ip = getRequestIp(_request);
  const limiter = checkRateLimit(`onboarding:get:${ip}:${token}`, 40, 60);
  if (!limiter.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429, headers: { 'Retry-After': String(limiter.retryAfter ?? 60) } });
  }

  const resolved = await resolveOnboardingByToken(token);
  if (!resolved) {
    return NextResponse.json({ error: 'Onboarding link is invalid or expired.' }, { status: 404 });
  }

  return NextResponse.json({
    onboarding: {
      id: resolved.onboarding.id,
      status: resolved.onboarding.status,
      packageKey: resolved.onboarding.package_key,
      completionPercent: resolved.onboarding.completion_percent,
      currentStep: resolved.onboarding.current_step,
      manualReviewRequired: resolved.onboarding.manual_review_required,
    },
    responses: resolved.responses,
    messaging: {
      sensitiveWarning: 'Do not enter passwords, API keys, or protected health information in this form unless a compliant process has been formally approved.',
    },
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const ip = getRequestIp(request);
  const limiter = checkRateLimit(`onboarding:patch:${ip}:${token}`, 40, 60);
  if (!limiter.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429, headers: { 'Retry-After': String(limiter.retryAfter ?? 60) } });
  }

  const resolved = await resolveOnboardingByToken(token);
  if (!resolved) {
    return NextResponse.json({ error: 'Onboarding link is invalid or expired.' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid onboarding payload.' }, { status: 400 });
  }

  const responses = parsed.data.responses as OnboardingDraftInput;
  if (containsForbiddenCredentialField(responses)) {
    return NextResponse.json({ error: 'Do not submit passwords or secrets in onboarding fields.' }, { status: 400 });
  }

  const merged = {
    ...resolved.responses,
    ...responses,
    business_information: {
      ...(resolved.responses.business_information ?? {}),
      ...(responses.business_information ?? {}),
    },
  } as OnboardingDraftInput;

  const locationCount = deriveLocationCount(merged, 1);

  const completion = await saveOnboardingDraft({
    onboardingId: String(resolved.onboarding.id),
    packageKey: String(resolved.onboarding.package_key),
    locationCount,
    responses,
    source: 'customer',
  });

  return NextResponse.json({ ok: true, completion });
}
