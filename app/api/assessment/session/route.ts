import { NextResponse } from 'next/server';
import { assessmentSessionPatchSchema } from '@/lib/assessment/validation';
import { findAssessmentSessionByToken, patchAssessmentSession } from '@/lib/assessment/service';
import { checkRateLimit, getRequestIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('resumeToken');
  if (!token) {
    return NextResponse.json({ error: 'Missing resume token' }, { status: 400 });
  }

  const session = await findAssessmentSessionByToken(token);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ session: { id: session.id, status: session.status, currentStep: session.current_step, answers: session.answers, leadId: session.lead_id, expiresAt: session.expires_at } });
}

export async function PATCH(request: Request) {
  const ip = getRequestIp(request);
  const limit = checkRateLimit(`assessment_session_patch:${ip}`, 60, 3600);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter ?? 60) } });
  }

  const body = await request.json().catch(() => null);
  const result = assessmentSessionPatchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid payload', details: result.error.flatten() }, { status: 400 });
  }

  try {
    const session = await patchAssessmentSession({ token: result.data.resumeToken, answers: result.data.answers as Record<string, unknown> | undefined, currentStep: result.data.currentStep, completedStep: result.data.completedStep });
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
