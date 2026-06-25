export const STRIPE_WEBHOOK_EVENTS = [
  'checkout.session.async_payment_failed',
  'invoice.payment_action_required',
  'customer.subscription.created',
  'customer.subscription.updated',
  'charge.refunded',
] as const;

export type SupportedStripeWebhookEvent = (typeof STRIPE_WEBHOOK_EVENTS)[number];

export function isSupportedStripeWebhookEvent(eventType: string): eventType is SupportedStripeWebhookEvent {
  return (STRIPE_WEBHOOK_EVENTS as readonly string[]).includes(eventType);
}

export function getStripeWebhookEventContext(payload: { id?: string; type?: string; data?: { object?: Record<string, unknown> } }) {
  const object = payload.data?.object ?? {};
  return {
    eventId: payload.id ?? null,
    eventType: payload.type ?? 'unknown',
    checkoutSessionId: typeof object.id === 'string' && String(payload.type).startsWith('checkout.session') ? object.id : null,
    stripeCustomerId: typeof object.customer === 'string' ? object.customer : null,
    stripeSubscriptionId: typeof object.subscription === 'string' ? object.subscription : null,
    stripeInvoiceId: typeof object.invoice === 'string' ? object.invoice : null,
    stripePaymentIntentId: typeof object.payment_intent === 'string' ? object.payment_intent : null,
    promotionCode: typeof object.promotion_code === 'string' ? object.promotion_code : null,
    couponId: typeof object.coupon === 'string' ? object.coupon : null,
  };
}
