import crypto from 'node:crypto';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

export function buildIntegrationIdempotencyKey({ provider, eventType, leadId, assessmentId, eventVersion, stripeEventId }: { provider: string; eventType: string; leadId?: string | null; assessmentId?: string | null; eventVersion?: string; stripeEventId?: string | null; }) {
  const parts = [provider, eventType, leadId ?? 'none', assessmentId ?? 'none', eventVersion ?? 'v1'];
  if (stripeEventId) parts.push(stripeEventId);
  return parts.join(':');
}

export async function enqueueIntegrationJob({ provider, jobType, leadId, assessmentId, payload, idempotencyKey }: { provider: string; jobType: string; leadId?: string | null; assessmentId?: string | null; payload: Record<string, unknown>; idempotencyKey: string; }) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.from('integration_jobs').insert({ provider, job_type: jobType, lead_id: leadId ?? null, assessment_id: assessmentId ?? null, payload, status: 'pending', attempt_count: 0, next_attempt_at: new Date().toISOString(), idempotency_key: idempotencyKey }).select('id').single();
  if (error) throw new Error(error.message);
  return data;
}

export function calculateRetryDelay(attemptCount: number) {
  return Math.min(60 * 60 * 1000, 1000 * 2 ** Math.max(0, attemptCount));
}

export function hashExternalId(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
