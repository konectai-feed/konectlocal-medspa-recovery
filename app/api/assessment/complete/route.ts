import { NextResponse } from 'next/server';
import { assessmentCompleteSchema } from '@/lib/assessment/validation';
import { completeAssessmentSession } from '@/lib/assessment/service';
import { checkRateLimit, getRequestIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const limit = checkRateLimit(`assessment_complete:${ip}`, 5, 3600);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter ?? 60) } });
  }

  const body = await request.json().catch(() => null);
  const result = assessmentCompleteSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid payload', details: result.error.flatten() }, { status: 400 });
  }

  try {
    const complete = await completeAssessmentSession(result.data.resumeToken);
    return NextResponse.json(complete);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
