import { NextResponse } from 'next/server';
import { assessmentCompleteSchema } from '@/lib/assessment/validation';
import { completeAssessmentSession, findAssessmentSessionByToken, generateToken, hashToken } from '@/lib/assessment/service';
import { checkRateLimit, getRequestIp } from '@/lib/rate-limit';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { createBrevoAdapter } from '@/lib/integrations/brevo';
import { serverEnv } from '@/lib/env.server';

async function ensureReportToken(result: Awaited<ReturnType<typeof completeAssessmentSession>>) {
  if (result.reportToken) return result.reportToken;

  const assessment = 'assessment' in result ? result.assessment : null;
  if (!assessment?.id) throw new Error('Assessment completed but report could not be resolved');

  // Raw report tokens are intentionally not stored. On a completion retry, issue
  // another active token instead of invalidating a previously emailed/bookmarked URL.
  const reportToken = generateToken();
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from('report_links').insert([{
    assessment_id: assessment.id,
    token_hash: hashToken(reportToken),
    status: 'active',
  }]);
  if (error) throw new Error(error.message);
  return reportToken;
}

async function syncCompletedAssessmentToBrevo(resumeToken: string, reportToken: string, origin: string) {
  const session = await findAssessmentSessionByToken(resumeToken);
  if (!session?.id) return;

  const supabase = createSupabaseServiceRoleClient();
  const { data: storedAssessment } = await supabase
    .from('assessments')
    .select('id,lead_id,recovery_score,recovery_level,opportunity_low,opportunity_high,primary_leak,secondary_leak,recommended_package')
    .eq('session_id', session.id)
    .single();
  if (!storedAssessment?.lead_id) return;

  const { data: lead } = await supabase
    .from('leads')
    .select('email,business_name')
    .eq('id', storedAssessment.lead_id)
    .single();
  if (!lead?.email) return;

  const completedListId = Number(serverEnv.BREVO_LIST_ASSESSMENT_COMPLETED);
  const reportUrl = `${origin}/assessment/results/${encodeURIComponent(reportToken)}`;

  // Best-effort nurture handoff. A temporary marketing-provider failure must never
  // prevent the prospect from receiving/viewing the assessment result.
  await createBrevoAdapter().upsertContact({
    email: lead.email,
    listIds: Number.isFinite(completedListId) ? [completedListId] : [],
    attributes: {
      BUSINESS_NAME: lead.business_name ?? '',
      ASSESSMENT_STATUS: 'Completed',
      RECOVERY_SCORE: storedAssessment.recovery_score ?? 0,
      RECOVERY_LEVEL: storedAssessment.recovery_level ?? '',
      OPPORTUNITY_LOW: storedAssessment.opportunity_low ?? 0,
      OPPORTUNITY_HIGH: storedAssessment.opportunity_high ?? 0,
      PRIMARY_LEAK: storedAssessment.primary_leak ?? '',
      SECONDARY_LEAK: storedAssessment.secondary_leak ?? '',
      RECOMMENDED_PACKAGE: storedAssessment.recommended_package ?? '',
      REPORT_URL: reportUrl,
    },
  });
}

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
    const reportToken = await ensureReportToken(complete);
    await syncCompletedAssessmentToBrevo(result.data.resumeToken, reportToken, new URL(request.url).origin).catch(() => undefined);
    return NextResponse.json({ ...complete, reportToken });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
