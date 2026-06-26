import { serverEnv } from '@/lib/env.server';

export type BrevoContactInput = {
  email: string;
  attributes?: Record<string, string | number | boolean | null | undefined>;
  listIds?: number[];
};

export type BrevoProviderResult = {
  ok: boolean;
  dryRun: boolean;
  contactId?: string;
  providerId?: string;
  retries?: number;
  idempotencyKey?: string;
};

const BREVO_BASE_URL = 'https://api.brevo.com/v3';

async function brevoRequest(path: string, init: RequestInit, apiKey: string) {
  const response = await fetch(`${BREVO_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'api-key': apiKey,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo API ${path} failed (${response.status}): ${body.slice(0, 250)}`);
  }

  if (response.status === 204) return {} as Record<string, unknown>;
  return (await response.json()) as Record<string, unknown>;
}

export function createBrevoAdapter() {
  const apiKey = serverEnv.BREVO_API_KEY;
  const enabled = Boolean(apiKey);
  const attemptCount = 0;

  async function doUpsertContact(input: BrevoContactInput): Promise<BrevoProviderResult> {
    const idempotencyKey = `brevo:${input.email}`;
    if (!enabled) {
      return { ok: true, dryRun: true, providerId: `dry-run:${idempotencyKey}`, retries: 0, idempotencyKey };
    }
    try {
      const payload = {
        email: input.email,
        attributes: input.attributes ?? {},
        listIds: input.listIds ?? [],
        updateEnabled: true,
      };
      const result = await brevoRequest('/contacts', { method: 'POST', body: JSON.stringify(payload) }, String(apiKey));
      const contactId = typeof result.id === 'number' || typeof result.id === 'string' ? String(result.id) : undefined;
      return { ok: true, dryRun: false, providerId: `brevo:${input.email}`, contactId, retries: attemptCount, idempotencyKey };
    } catch {
      return { ok: false, dryRun: false, providerId: `brevo:${input.email}`, retries: attemptCount + 1, idempotencyKey };
    }
  }

  return {
    async upsertContact(input: BrevoContactInput): Promise<BrevoProviderResult> {
      return doUpsertContact(input);
    },
    async setAttributes(input: BrevoContactInput & { attributes: Record<string, string | number | boolean | null | undefined> }): Promise<BrevoProviderResult> {
      return doUpsertContact(input);
    },
    async addToList(input: { email: string; listId: number }): Promise<BrevoProviderResult> {
      const idempotencyKey = `brevo:list:${input.listId}:${input.email}`;
      if (!enabled) {
        return { ok: true, dryRun: true, providerId: `dry-run:${idempotencyKey}`, retries: 0, idempotencyKey };
      }
      try {
        await brevoRequest(`/contacts/lists/${input.listId}/contacts/add`, {
          method: 'POST',
          body: JSON.stringify({ emails: [input.email] }),
        }, String(apiKey));
        return { ok: true, dryRun: false, providerId: `brevo:${input.email}`, retries: attemptCount, idempotencyKey };
      } catch {
        return { ok: false, dryRun: false, providerId: `brevo:${input.email}`, retries: attemptCount + 1, idempotencyKey };
      }
    },
    async removeFromList(input: { email: string; listId: number }): Promise<BrevoProviderResult> {
      const idempotencyKey = `brevo:remove:${input.listId}:${input.email}`;
      if (!enabled) {
        return { ok: true, dryRun: true, providerId: `dry-run:${idempotencyKey}`, retries: 0, idempotencyKey };
      }
      try {
        await brevoRequest(`/contacts/lists/${input.listId}/contacts/remove`, {
          method: 'POST',
          body: JSON.stringify({ emails: [input.email] }),
        }, String(apiKey));
        return { ok: true, dryRun: false, providerId: `brevo:${input.email}`, retries: attemptCount, idempotencyKey };
      } catch {
        return { ok: false, dryRun: false, providerId: `brevo:${input.email}`, retries: attemptCount + 1, idempotencyKey };
      }
    },
    async sendTransactionalEmail(input: { to: string; templateId: number; params?: Record<string, string> }): Promise<BrevoProviderResult> {
      const idempotencyKey = `brevo:email:${input.templateId}:${input.to}`;
      if (!enabled) {
        return { ok: true, dryRun: true, providerId: `dry-run:${idempotencyKey}`, retries: 0, idempotencyKey };
      }
      try {
        await brevoRequest('/smtp/email', {
          method: 'POST',
          body: JSON.stringify({
            to: [{ email: input.to }],
            templateId: input.templateId,
            params: input.params ?? {},
            ...(serverEnv.BREVO_SENDER_EMAIL
              ? {
                sender: {
                  email: serverEnv.BREVO_SENDER_EMAIL,
                  ...(serverEnv.BREVO_SENDER_NAME ? { name: serverEnv.BREVO_SENDER_NAME } : {}),
                },
              }
              : {}),
          }),
        }, String(apiKey));
        return { ok: true, dryRun: false, providerId: `brevo:${input.to}`, retries: attemptCount, idempotencyKey };
      } catch {
        return { ok: false, dryRun: false, providerId: `brevo:${input.to}`, retries: attemptCount + 1, idempotencyKey };
      }
    },
    async trackEvent(input: { email: string; eventName: string; properties?: Record<string, string | number | boolean> }): Promise<BrevoProviderResult> {
      const idempotencyKey = `brevo:event:${input.eventName}:${input.email}`;
      if (!enabled) {
        return { ok: true, dryRun: true, providerId: `dry-run:${idempotencyKey}`, retries: 0, idempotencyKey };
      }
      const result = await doUpsertContact({ email: input.email, attributes: input.properties ?? {} });
      return { ...result, idempotencyKey };
    },
  };
}
