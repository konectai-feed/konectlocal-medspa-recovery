import { NextResponse } from 'next/server';
import { assessmentStartSchema } from '@/lib/assessment/validation';
import { createAssessmentSession } from '@/lib/assessment/service';
import { checkRateLimit, getRequestIp } from '@/lib/rate-limit';
import crypto from 'node:crypto';

function hashValue(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const limit = checkRateLimit(`assessment_start:${ip}`, 10, 3600);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter ?? 60) } });
  }

  const body = await request.json().catch(() => null);
  const result = assessmentStartSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid payload', details: result.error.flatten() }, { status: 400 });
  }

  const ipHash = result.data ? hashValue(getRequestIp(request)) : undefined;
  const session = await createAssessmentSession({ attribution: result.data.attribution, utm: result.data.utm, userAgent: request.headers.get('user-agent') ?? undefined, ipHash });

  return NextResponse.json(session);
}
