import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { serverEnv } from '@/lib/env.server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { buildIntegrationIdempotencyKey } from '@/lib/commerce/integrations';
import { getStripeWebhookEventContext, isSupportedStripeWebhookEvent } from '@/lib/commerce/stripe-webhook';
import { dispatchInternalAlert } from '@/lib/integrations/alerts';
import { createOrUpdateOnboardingFromPurchase, issueOnboardingToken } from '@/lib/onboarding/service';

function deriveLocationCountFromAssessmentAnswers(answers: unknown) {
  if (!answers || typeof answers !== 'object') return 1;
  const raw = (answers as Record<string, unknown>).location_count_band;
  if (raw === 'ten_plus') return 10;
  if (raw === 'four_nine') return 5;
  if (raw === 'two_three') return 2;
  return 1;
}

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

  const context = getStripeWebhookEventContext(payload);

  await supabase.from('webhook_events').insert({ provider: 'stripe', external_event_id: payload.id, event_type: payload.type, payload_hash: payloadHash, processing_status: 'processing', attempt_count: 1, processed_at: new Date().toISOString(), created_at: new Date().toISOString() });

  if (isSupportedStripeWebhookEvent(payload.type)) {
    if (payload.type === 'checkout.session.async_payment_failed' && context.checkoutSessionId) {
      await supabase.from('checkout_sessions').update({ status: 'failed' }).eq('stripe_checkout_session_id', context.checkoutSessionId);
      await dispatchInternalAlert({
        type: 'payment_failed',
        metadata: { checkoutSessionId: context.checkoutSessionId, stripeEventId: context.eventId },
      });
    }

    if (payload.type === 'invoice.payment_action_required' && context.stripeSubscriptionId) {
      await supabase.from('subscriptions').update({ status: 'past_due', latest_invoice_id: context.stripeInvoiceId }).eq('stripe_subscription_id', context.stripeSubscriptionId);
      await supabase.from('purchases').update({ payment_status: 'requires_action' }).eq('stripe_subscription_id', context.stripeSubscriptionId);
    }

    if ((payload.type === 'customer.subscription.created' || payload.type === 'customer.subscription.updated') && context.stripeSubscriptionId) {
      await supabase.from('purchases').update({ stripe_subscription_id: context.stripeSubscriptionId, stripe_customer_id: context.stripeCustomerId }).eq('stripe_customer_id', context.stripeCustomerId);
      await supabase.from('subscriptions').update({ stripe_customer_id: context.stripeCustomerId, latest_invoice_id: context.stripeInvoiceId }).eq('stripe_subscription_id', context.stripeSubscriptionId);

      const { data: purchase } = await supabase
        .from('purchases')
        .select('id,lead_id,assessment_id,package_key,stripe_customer_id,payment_status,purchase_status')
        .eq('stripe_subscription_id', context.stripeSubscriptionId)
        .maybeSingle();

      const { data: assessment } = purchase?.assessment_id
        ? await supabase
          .from('assessments')
          .select('answers')
          .eq('id', purchase.assessment_id)
          .maybeSingle()
        : { data: null };

      const derivedLocationCount = deriveLocationCountFromAssessmentAnswers(assessment?.answers ?? null);

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id,status')
        .eq('stripe_subscription_id', context.stripeSubscriptionId)
        .maybeSingle();

      if (purchase?.id && purchase.lead_id) {
        const { data: existingActivation } = await supabase
          .from('activation_records')
          .select('id')
          .eq('purchase_id', purchase.id)
          .maybeSingle();

        let activationId = existingActivation?.id as string | undefined;
        if (!activationId) {
          const { data: insertedActivation } = await supabase
            .from('activation_records')
            .insert({
              purchase_id: purchase.id,
              lead_id: purchase.lead_id,
              assessment_id: purchase.assessment_id,
              package_key: purchase.package_key,
              status: 'onboarding_required',
              requires_manual_review: false,
            })
            .select('id')
            .single();
          activationId = insertedActivation?.id;
        }

        if (activationId) {
          const onboarding = await createOrUpdateOnboardingFromPurchase({
            purchaseId: purchase.id,
            subscriptionId: subscription?.id ?? null,
            activationId,
            leadId: purchase.lead_id,
            assessmentId: purchase.assessment_id,
            packageKey: String(purchase.package_key),
            locationCount: derivedLocationCount,
            stripeCustomerId: purchase.stripe_customer_id,
            subscriptionStatus: subscription?.status ?? null,
          });

          await issueOnboardingToken({
            onboardingId: onboarding.onboardingId,
            actorType: 'system',
            replaceCurrent: true,
          });
        }
      }
    }

    if (payload.type === 'charge.refunded') {
      if (context.stripePaymentIntentId) {
        await supabase.from('purchases').update({ payment_status: 'refunded', purchase_status: 'refunded' }).eq('stripe_payment_intent_id', context.stripePaymentIntentId);
      }
      if (context.stripeInvoiceId) {
        await supabase.from('purchases').update({ payment_status: 'refunded', purchase_status: 'refunded' }).eq('stripe_invoice_id', context.stripeInvoiceId);
      }
      await dispatchInternalAlert({
        type: 'payment_refunded',
        metadata: { stripeEventId: context.eventId, stripePaymentIntentId: context.stripePaymentIntentId, stripeInvoiceId: context.stripeInvoiceId },
      });
    }

    await supabase.from('payment_events').insert({
      event_type: payload.type,
      stripe_event_id: context.eventId,
      provider: 'stripe',
      event_payload: payload,
      status: 'recorded',
    });
  }

  await supabase.from('webhook_events').update({ processing_status: 'succeeded', processed_at: new Date().toISOString() }).eq('provider', 'stripe').eq('external_event_id', payload.id);
  await supabase.from('integration_jobs').insert({ provider: 'stripe', job_type: 'webhook', payload: { type: payload.type, id: payload.id }, status: 'pending', attempt_count: 0, next_attempt_at: new Date().toISOString(), idempotency_key: idempotencyKey });
  return NextResponse.json({ ok: true });
}
