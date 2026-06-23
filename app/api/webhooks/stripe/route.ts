import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { serverEnv } from '@/lib/env.server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { buildIntegrationIdempotencyKey } from '@/lib/commerce/integrations';

function verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string) {
  const elements = signatureHeader.split(',');
  const timestamp = elements.find((entry) => entry.startsWith('t='));
  const signatures = elements.filter((entry) => entry.startsWith('v1='));
  if (!timestamp || signatures.length === 0) return false;
  const signedPayload = `${timestamp.split('=')[1]}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return signatures.some((entry) => crypto.timingSafeEqual(Buffer.from(entry.split('=')[1], 'hex'), Buffer.from(expected, 'hex')));
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');
  const secret = serverEnv.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature || !verifyStripeSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const payload = JSON.parse(rawBody);
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  const idempotencyKey = buildIntegrationIdempotencyKey({ provider: 'stripe', eventType: payload.type, leadId: null, assessmentId: null, eventVersion: 'v1', stripeEventId: payload.id });
  const { data: existing } = await supabase.from('webhook_events').select('id').eq('provider', 'stripe').eq('external_event_id', payload.id).maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  await supabase.from('webhook_events').insert({ provider: 'stripe', external_event_id: payload.id, event_type: payload.type, payload_hash: payloadHash, processing_status: 'succeeded', attempt_count: 1, processed_at: new Date().toISOString(), created_at: new Date().toISOString() });
  await supabase.from('integration_jobs').insert({ provider: 'stripe', job_type: 'webhook', payload: { type: payload.type, id: payload.id }, status: 'pending', attempt_count: 0, next_attempt_at: new Date().toISOString(), idempotency_key: idempotencyKey });
  return NextResponse.json({ ok: true });
}
