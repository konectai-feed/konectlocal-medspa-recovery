import { log } from '@/lib/logger';

export type InternalAlertLevel = 'hot' | 'warm' | 'watch';

export function mapHotLeadAlertLevel(score: number): InternalAlertLevel {
  if (score >= 85) return 'hot';
  if (score >= 70) return 'warm';
  return 'watch';
}

export async function dispatchInternalAlert(input: {
  type: 'hot_lead' | 'payment_failed' | 'payment_refunded';
  leadId?: string | null;
  assessmentId?: string | null;
  score?: number;
  metadata?: Record<string, unknown>;
}) {
  const level = input.type === 'hot_lead' ? mapHotLeadAlertLevel(input.score ?? 0) : 'watch';
  log('info', 'internal_alert_dispatched', {
    type: input.type,
    level,
    leadId: input.leadId,
    assessmentId: input.assessmentId,
    ...input.metadata,
  });

  return {
    ok: true,
    level,
  };
}
