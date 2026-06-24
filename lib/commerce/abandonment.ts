import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { serverEnv } from '@/lib/env.server';
import { createBrevoAdapter } from '@/lib/integrations/brevo';
import { recordSessionEvent } from '@/lib/assessment/service';

export async function processCheckoutAbandonment() {
  const supabase = createSupabaseServiceRoleClient();
  const cutoff = new Date(Date.now() - serverEnv.CHECKOUT_ABANDONMENT_HOURS * 60 * 60 * 1000).toISOString();
  const { data: sessions, error } = await supabase.from('checkout_sessions').select('*').eq('status', 'started').lt('created_at', cutoff);
  if (error) throw new Error(error.message);

  const brevo = createBrevoAdapter();
  for (const session of sessions ?? []) {
    await supabase.from('checkout_sessions').update({ status: 'abandoned' }).eq('id', session.id);
    if (session.lead_id) {
      await recordSessionEvent({ sessionId: null, assessmentId: session.assessment_id, leadId: session.lead_id, eventType: 'checkout_abandoned', eventData: { packageKey: session.package_key }, source: 'system' });
      await brevo.trackEvent({ email: session.metadata?.email ?? '', eventName: 'checkout_abandoned' });
    }
  }

  return { processed: sessions?.length ?? 0 };
}
