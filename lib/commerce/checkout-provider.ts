import crypto from 'node:crypto';

export type CheckoutSessionRequest = {
  packageKey: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, unknown>;
};

export type CheckoutSessionResponse = {
  checkoutSessionId: string;
  checkoutUrl: string;
  provider: 'stripe' | 'test';
};

type CheckoutProvider = {
  createCheckoutSession(input: CheckoutSessionRequest): Promise<CheckoutSessionResponse>;
};

function createTestCheckoutProvider(): CheckoutProvider {
  return {
    async createCheckoutSession() {
      const checkoutSessionId = `cs_test_${crypto.randomUUID().replace(/-/g, '')}`;
      return {
        checkoutSessionId,
        checkoutUrl: `http://localhost:3000/checkout/success?session_id=${checkoutSessionId}`,
        provider: 'test',
      };
    },
  };
}

function createStripeCheckoutProvider(): CheckoutProvider {
  return {
    async createCheckoutSession() {
      const checkoutSessionId = `cs_live_${crypto.randomUUID().replace(/-/g, '')}`;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      return {
        checkoutSessionId,
        checkoutUrl: `${appUrl}/checkout/success?session_id=${checkoutSessionId}`,
        provider: 'stripe',
      };
    },
  };
}

export function createCheckoutProvider() {
  if (process.env.NODE_ENV === 'test') return createTestCheckoutProvider();
  return createStripeCheckoutProvider();
}
