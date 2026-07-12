import 'server-only';
import crypto from 'node:crypto';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { calculateAssessmentResult } from './calculate';
import { assessmentQuestionOptions } from './config';
import type { AssessmentAnswers, EditedAssumptions } from './types';
import { dispatchInternalAlert } from '@/lib/integrations/alerts';

const HASH_ALGORITHM = 'sha256';

export function hashToken(value: string) {
  return crypto.createHash(HASH_ALGORITHM).update(value).digest('hex');
}

export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function findOption(questionKey: string, value: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options = (assessmentQuestionOptions as Record<string, readonly any[]>)[questionKey];
  return options?.find((option) => option.value === value);
}

export async function createAssessmentSession({ attribution, utm, userAgent, ipHash }: { attribution?: Record<string, string>; utm?: Record<string, string>; userAgent?: string; ipHash?: string; }) {
  const supabase = createSupabaseServiceRoleClient();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const { data, error } = await supabase
    .from('assessment_sessions')
    .insert([{ resume_token_hash: tokenHash, attribution: attribution ?? {}, answers: {}, last_activity_at: new Date().toISOString(), current_step: 1 }])
    .select('id,current_step,status,expires_at')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to create assessment session');
  }

  await recordSessionEvent({ sessionId: data.id, assessmentId: null, leadId: null, eventType: 'assessment_started', eventData: { userAgent, ipHash, attribution, utm }, source: 'web' });

  return {
    resumeToken: token,
    session: data,
  };
}

export async function findAssessmentSessionByToken(token: string) {
  const supabase = createSupabaseServiceRoleClient();
  const tokenHash = hashToken(token);
  const { data, error } = await supabase
    .from('assessment_sessions')
    .select('*')
    .eq('resume_token_hash', tokenHash)
    .single();

  if (error) {
    return null;
  }
  return data;
}

export async function patchAssessmentSession({ token, answers, currentStep, completedStep }: { token: string; answers?: Record<string, unknown>; currentStep?: number; completedStep?: number; }) {
  const session = await findAssessmentSessionByToken(token);
  if (!session) throw new Error('Session not found');

  const mergedAnswers = answers ? { ...(session.answers ?? {}), ...answers } : session.answers ?? {};
  const updates: Record<string, unknown> = {
    answers: mergedAnswers,
    last_activity_at: new Date().toISOString(),
  };

  if (typeof currentStep === 'number') {
    updates.current_step = currentStep;
  }
  if (typeof completedStep === 'number') {
    updates.current_step = Math.max(updates.current_step as number ?? 1, completedStep);
  }

  if (answers || currentStep || completedStep) {
    const { error } = await createSupabaseServiceRoleClient()
      .from('assessment_sessions')
      .update(updates)
      .eq('id', session.id);
    if (error) throw new Error(error.message);
  }

  if (typeof completedStep === 'number') {
    await recordSessionEvent({ sessionId: session.id, assessmentId: null, leadId: session.lead_id, eventType: 'assessment_step_completed', eventData: { completedStep }, source: 'web' });
  }

  return { ...session, answers: mergedAnswers, current_step: updates.current_step ?? session.current_step };
}

export async function upsertContactForSession({ token, contact, utm, userAgent, ipHash }: { token: string; contact: { firstName: string; lastName: string; businessName: string; email: string; phone: string; website: string; city: string; state: string; consentEmail: boolean; consentSms?: boolean; }; utm?: Record<string, string>; userAgent?: string; ipHash?: string; }) {
  const session = await findAssessmentSessionByToken(token);
  if (!session) throw new Error('Session not found');

  const supabase = createSupabaseServiceRoleClient();
  const leadResult = await supabase.rpc('upsert_lead', {
    p_email: contact.email,
    p_business_name: contact.businessName,
    p_first_name: contact.firstName,
    p_last_name: contact.lastName,
    p_phone: contact.phone,
    p_website: contact.website,
    p_city: contact.city,
    p_state: contact.state,
    p_attribution: JSON.stringify({ ...(session.attribution ?? {}), ...(utm ?? {}) }),
  });

  if (leadResult.error) throw new Error(leadResult.error.message);
  const leadId = leadResult.data as string;

  const { error: sessionError } = await supabase
    .from('assessment_sessions')
    .update({ lead_id: leadId, status: 'contact_captured', last_activity_at: new Date().toISOString() })
    .eq('id', session.id);
  if (sessionError) throw new Error(sessionError.message);

  const consentInsert = await supabase.from('consent_records').insert([{ lead_id: leadId, session_id: session.id, email_consent: contact.consentEmail, sms_consent: contact.consentSms ?? false, consent_text_version: 'v1', consent_text_snapshot: 'I agree to receive email updates and future contact from KonectLocal about revenue recovery services.', ip_hash: ipHash ?? null, user_agent: userAgent ?? null, submission_metadata: { source: 'assessment_contact' } }]);
  if (consentInsert.error) throw new Error(consentInsert.error.message);

  await recordSessionEvent({ sessionId: session.id, assessmentId: null, leadId, eventType: 'contact_captured', eventData: { consentEmail: contact.consentEmail, consentSms: contact.consentSms }, source: 'web' });

  return { leadId };
}

export async function findActiveFormulaAndBenchmark() {
  const supabase = createSupabaseServiceRoleClient();
  const formulaResult = await supabase.rpc('get_active_formula_version');
  if (formulaResult.error || !formulaResult.data) throw new Error(formulaResult.error?.message ?? 'Unable to fetch formula version');

  const benchmarkResult = await supabase.from('benchmark_versions').select('*').eq('active', true).single();
  if (benchmarkResult.error || !benchmarkResult.data) throw new Error(benchmarkResult.error?.message ?? 'Unable to fetch benchmark version');

  return { formula: formulaResult.data, benchmark: benchmarkResult.data };
}

export async function completeAssessmentSession(token: string) {
  const session = await findAssessmentSessionByToken(token);
  if (!session) throw new Error('Session not found');
  if (!session.lead_id) throw new Error('Contact information required before completion');

  const supabase = createSupabaseServiceRoleClient();
  const existingAssessment = await supabase.from('assessments').select('*').eq('session_id', session.id).single();
  if (!existingAssessment.error && existingAssessment.data) {
    const existingReport = await supabase.from('report_links').select('*').eq('assessment_id', existingAssessment.data.id).single();
    return { assessment: existingAssessment.data, reportToken: existingReport.data ? null : null };
  }

  const { formula, benchmark } = await findActiveFormulaAndBenchmark();
  const leadResponse = await supabase.from('leads').select('id,email,phone,website,prior_campaign_opener').eq('id', session.lead_id).single();
  if (leadResponse.error || !leadResponse.data) throw new Error('Lead not found');

  const assessmentResult = calculateAssessmentResult({
    answers: session.answers as AssessmentAnswers,
    contact: { email: leadResponse.data.email, phone: leadResponse.data.phone, website: leadResponse.data.website, priorCampaignOpener: leadResponse.data.prior_campaign_opener },
    formulaVersion: formula.version,
    benchmarkVersion: benchmark.version,
  });

  const originalAssumptions = assessmentResult.calculationSnapshot.assumptions;

  const insertResult = await supabase.from('assessments').insert([{ lead_id: session.lead_id, session_id: session.id, answer_version: formula.version, answers: session.answers ?? {}, recovery_score: assessmentResult.recoveryScore, recovery_level: assessmentResult.recoveryLevel, opportunity_low: assessmentResult.opportunityLow, opportunity_high: assessmentResult.opportunityHigh, confidence_score: assessmentResult.confidenceScore, confidence_level: assessmentResult.confidenceLevel, primary_leak: assessmentResult.primaryLeak, secondary_leak: assessmentResult.secondaryLeak, third_leak: assessmentResult.thirdLeak, recommended_package: assessmentResult.recommendedPackage, routing_score: assessmentResult.routingScore, account_value_score: assessmentResult.accountValueScore, sales_readiness_score: assessmentResult.salesReadinessScore, formula_version: assessmentResult.formulaVersion, benchmark_version: assessmentResult.benchmarkVersion, original_assumptions: originalAssumptions, edited_assumptions: {}, calculation_snapshot: assessmentResult.calculationSnapshot }]).select('id').single();

  if (insertResult.error || !insertResult.data) throw new Error(insertResult.error?.message ?? 'Failed to create assessment');
  const assessmentId = insertResult.data.id as string;

  const reportToken = generateToken();
  const reportTokenHash = hashToken(reportToken);
  const reportInsert = await supabase.from('report_links').insert([{ assessment_id: assessmentId, token_hash: reportTokenHash, status: 'active' }]);
  if (reportInsert.error) throw new Error(reportInsert.error.message);

  await supabase.from('revenue_leaks').insert(assessmentResult.topLeaks.map((leak, index) => ({ assessment_id: assessmentId, leak_type: leak.key, points_earned: leak.score, points_available: leak.maxScore, severity_ratio: leak.ratio, severity_label: leak.severityLabel, estimated_low: leak.estimatedLow, estimated_high: leak.estimatedHigh, recommendation: `Improve ${leak.label.toLowerCase()} to recover more revenue.`, display_order: index + 1 })));

  await supabase.from('assessment_sessions').update({ status: 'completed', last_activity_at: new Date().toISOString() }).eq('id', session.id);
  await recordSessionEvent({ sessionId: session.id, assessmentId, leadId: session.lead_id, eventType: 'assessment_completed', eventData: {}, source: 'web' });

  if (assessmentResult.isHotLead) {
    await supabase.rpc('mark_lead_hot', { p_lead_id: session.lead_id });
    await dispatchInternalAlert({
      type: 'hot_lead',
      leadId: session.lead_id,
      assessmentId,
      score: assessmentResult.recoveryScore,
      metadata: {
        recommendedPackage: assessmentResult.recommendedPackage,
      },
    });
  }

  return { assessmentResult, reportToken };
}

export async function fetchReportByToken(token: string) {
  const supabase = createSupabaseServiceRoleClient();
  const tokenHash = hashToken(token);
  const { data: reportLink, error: reportError } = await supabase
    .from('report_links')
    .select('id,assessment_id,status,expires_at')
    .eq('token_hash', tokenHash)
    .single();

  if (reportError || !reportLink) {
    return null;
  }

  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .select('id,lead_id,session_id,recovery_score,recovery_level,opportunity_low,opportunity_high,confidence_score,confidence_level,primary_leak,secondary_leak,third_leak,recommended_package,calculation_snapshot,original_assumptions,edited_assumptions,formula_version,benchmark_version,answers')
    .eq('id', reportLink.assessment_id)
    .single();

  if (assessmentError || !assessment) {
    return null;
  }

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id,business_name,email,phone,website,prior_campaign_opener')
    .eq('id', assessment.lead_id)
    .single();

  if (leadError || !lead) {
    return null;
  }

  return { reportLink, assessment, lead };
}

export async function fetchAssessmentContextForAi({
  leadId,
  assessmentId,
  reportToken,
}: {
  leadId: string;
  assessmentId?: string | null;
  reportToken?: string;
}) {
  if (reportToken) {
    const report = await fetchReportByToken(reportToken);
    if (!report) {
      return null;
    }

    if (String(report.lead.id) !== leadId) {
      return null;
    }

    if (assessmentId && String(report.assessment.id) !== assessmentId) {
      return null;
    }

    return report;
  }

  const supabase = createSupabaseServiceRoleClient();
  const assessmentQuery = supabase
    .from('assessments')
    .select('id,lead_id,session_id,recovery_score,recovery_level,opportunity_low,opportunity_high,confidence_score,confidence_level,primary_leak,secondary_leak,third_leak,recommended_package,calculation_snapshot,original_assumptions,edited_assumptions,formula_version,benchmark_version,answers,created_at');

  const assessmentResult = assessmentId
    ? await assessmentQuery.eq('id', assessmentId).eq('lead_id', leadId).maybeSingle()
    : await assessmentQuery.eq('lead_id', leadId).order('created_at', { ascending: false }).limit(1).maybeSingle();

  if (assessmentResult.error || !assessmentResult.data) {
    return null;
  }

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id,business_name,email,phone,website,prior_campaign_opener')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    return null;
  }

  return {
    reportLink: null,
    assessment: assessmentResult.data,
    lead,
  };
}

export async function recalculateAssessmentByReportToken(token: string, editedAssumptions: EditedAssumptions) {
  const supabase = createSupabaseServiceRoleClient();
  const tokenHash = hashToken(token);
  const { data: reportLink, error: reportError } = await supabase
    .from('report_links')
    .select('assessment_id')
    .eq('token_hash', tokenHash)
    .single();

  if (reportError || !reportLink) throw new Error(reportError?.message ?? 'Report not found');

  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .select('id,lead_id,session_id,answers,formula_version,benchmark_version,original_assumptions,edited_assumptions')
    .eq('id', reportLink.assessment_id)
    .single();

  if (assessmentError || !assessment) throw new Error(assessmentError?.message ?? 'Assessment not found');

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('email,phone,website,prior_campaign_opener')
    .eq('id', assessment.lead_id)
    .single();

  if (leadError || !lead) throw new Error('Lead not found');

  const safeEdited: EditedAssumptions = {
    monthlyInquiries: editedAssumptions.monthlyInquiries ? Math.min(5000, Math.max(1, editedAssumptions.monthlyInquiries)) : undefined,
    averageValue: editedAssumptions.averageValue ? Math.min(10000, Math.max(50, editedAssumptions.averageValue)) : undefined,
    bookingRate: editedAssumptions.bookingRate ? Math.min(1.0, Math.max(0.1, editedAssumptions.bookingRate)) : undefined,
    noShowRate: editedAssumptions.noShowRate ? Math.min(1.0, Math.max(0, editedAssumptions.noShowRate)) : undefined,
    dormantPool: editedAssumptions.dormantPool ? Math.min(1500, Math.max(50, editedAssumptions.dormantPool)) : undefined,
  };

  const result = calculateAssessmentResult({
    answers: assessment.answers as AssessmentAnswers,
    contact: { email: lead.email, phone: lead.phone, website: lead.website, priorCampaignOpener: lead.prior_campaign_opener },
    editedAssumptions: safeEdited,
    formulaVersion: assessment.formula_version,
    benchmarkVersion: assessment.benchmark_version,
  });

  const { error: updateError } = await supabase.from('assessments').update({
    recovery_score: result.recoveryScore,
    recovery_level: result.recoveryLevel,
    opportunity_low: result.opportunityLow,
    opportunity_high: result.opportunityHigh,
    confidence_score: result.confidenceScore,
    confidence_level: result.confidenceLevel,
    primary_leak: result.primaryLeak,
    secondary_leak: result.secondaryLeak,
    third_leak: result.thirdLeak,
    recommended_package: result.recommendedPackage,
    routing_score: result.routingScore,
    account_value_score: result.accountValueScore,
    sales_readiness_score: result.salesReadinessScore,
    edited_assumptions: safeEdited,
    calculation_snapshot: result.calculationSnapshot,
  }).eq('id', assessment.id);

  if (updateError) throw new Error(updateError.message);

  await recordSessionEvent({ sessionId: assessment.session_id, assessmentId: assessment.id, leadId: assessment.lead_id, eventType: 'report_assumptions_edited', eventData: safeEdited, source: 'web' });

  return result;
}

export async function createReportViewEvent(token: string) {
  const supabase = createSupabaseServiceRoleClient();
  const tokenHash = hashToken(token);
  const { data: reportLink, error: reportError } = await supabase
    .from('report_links')
    .select('assessment_id')
    .eq('token_hash', tokenHash)
    .single();

  if (reportError || !reportLink) return;

  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .select('id,lead_id,session_id')
    .eq('id', reportLink.assessment_id)
    .single();

  if (assessmentError || !assessment) return;

  await recordSessionEvent({ sessionId: assessment.session_id, assessmentId: assessment.id, leadId: assessment.lead_id, eventType: 'report_viewed', eventData: {}, source: 'web' });
}

export async function recordSessionEvent({ sessionId, assessmentId, leadId, eventType, eventData, source }: { sessionId: string | null; assessmentId: string | null; leadId: string | null; eventType: string; eventData?: Record<string, unknown>; source: string; }) {
  const supabase = createSupabaseServiceRoleClient();
  await supabase.rpc('record_lead_event', {
    p_lead_id: leadId,
    p_assessment_id: assessmentId,
    p_session_id: sessionId,
    p_event_type: eventType,
    p_event_data: eventData ?? {},
    p_source: source,
  });
}
