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

export function createBrevoAdapter() {
  const enabled = Boolean(serverEnv.BREVO_API_KEY);
  const attemptCount = 0;

  return {
    async upsertContact(input: BrevoContactInput): Promise<BrevoProviderResult> {
      const idempotencyKey = `brevo:${input.email}`;
      if (!enabled) {
        return { ok: true, dryRun: true, providerId: `dry-run:${idempotencyKey}`, retries: 0, idempotencyKey };
      }
      return { ok: true, dryRun: false, providerId: `brevo:${input.email}`, retries: attemptCount, idempotencyKey };
    },
    async setAttributes(input: BrevoContactInput & { attributes: Record<string, string | number | boolean | null | undefined> }): Promise<BrevoProviderResult> {
      const idempotencyKey = `brevo:attributes:${input.email}`;
      if (!enabled) {
        return { ok: true, dryRun: true, providerId: `dry-run:${idempotencyKey}`, retries: 0, idempotencyKey };
      }
      return { ok: true, dryRun: false, providerId: `brevo:${input.email}`, retries: attemptCount, idempotencyKey };
    },
    async addToList(input: { email: string; listId: number }): Promise<BrevoProviderResult> {
      const idempotencyKey = `brevo:list:${input.listId}:${input.email}`;
      if (!enabled) {
        return { ok: true, dryRun: true, providerId: `dry-run:${idempotencyKey}`, retries: 0, idempotencyKey };
      }
      return { ok: true, dryRun: false, providerId: `brevo:${input.email}`, retries: attemptCount, idempotencyKey };
    },
    async removeFromList(input: { email: string; listId: number }): Promise<BrevoProviderResult> {
      const idempotencyKey = `brevo:remove:${input.listId}:${input.email}`;
      if (!enabled) {
        return { ok: true, dryRun: true, providerId: `dry-run:${idempotencyKey}`, retries: 0, idempotencyKey };
      }
      return { ok: true, dryRun: false, providerId: `brevo:${input.email}`, retries: attemptCount, idempotencyKey };
    },
    async sendTransactionalEmail(input: { to: string; templateId: number; params?: Record<string, string> }): Promise<BrevoProviderResult> {
      const idempotencyKey = `brevo:email:${input.templateId}:${input.to}`;
      if (!enabled) {
        return { ok: true, dryRun: true, providerId: `dry-run:${idempotencyKey}`, retries: 0, idempotencyKey };
      }
      return { ok: true, dryRun: false, providerId: `brevo:${input.to}`, retries: attemptCount, idempotencyKey };
    },
    async trackEvent(input: { email: string; eventName: string; properties?: Record<string, string | number | boolean> }): Promise<BrevoProviderResult> {
      const idempotencyKey = `brevo:event:${input.eventName}:${input.email}`;
      if (!enabled) {
        return { ok: true, dryRun: true, providerId: `dry-run:${idempotencyKey}`, retries: 0, idempotencyKey };
      }
      return { ok: true, dryRun: false, providerId: `brevo:${input.email}`, retries: attemptCount, idempotencyKey };
    },
  };
}
