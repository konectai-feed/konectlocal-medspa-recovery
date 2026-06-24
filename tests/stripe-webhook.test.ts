import { describe, expect, it } from 'vitest';
import { STRIPE_WEBHOOK_EVENTS, getStripeWebhookEventContext, isSupportedStripeWebhookEvent } from '@/lib/commerce/stripe-webhook';

describe('stripe webhook coverage', () => {
  it('includes required Build 4A event types', () => {
    expect(STRIPE_WEBHOOK_EVENTS).toContain('checkout.session.async_payment_failed');
    expect(STRIPE_WEBHOOK_EVENTS).toContain('invoice.payment_action_required');
    expect(STRIPE_WEBHOOK_EVENTS).toContain('customer.subscription.created');
    expect(STRIPE_WEBHOOK_EVENTS).toContain('customer.subscription.updated');
    expect(STRIPE_WEBHOOK_EVENTS).toContain('charge.refunded');
  });

  it('recognizes supported and unsupported event names', () => {
    expect(isSupportedStripeWebhookEvent('charge.refunded')).toBe(true);
    expect(isSupportedStripeWebhookEvent('unknown.event')).toBe(false);
  });

  it('extracts common context fields from payload objects', () => {
    const context = getStripeWebhookEventContext({
      id: 'evt_1',
      type: 'invoice.payment_action_required',
      data: {
        object: {
          id: 'in_123',
          customer: 'cus_123',
          subscription: 'sub_123',
          invoice: 'in_123',
          payment_intent: 'pi_123',
        },
      },
    });

    expect(context.eventId).toBe('evt_1');
    expect(context.stripeCustomerId).toBe('cus_123');
    expect(context.stripeSubscriptionId).toBe('sub_123');
    expect(context.stripePaymentIntentId).toBe('pi_123');
  });
});
