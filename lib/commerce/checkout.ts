import crypto from 'node:crypto';
import { z } from 'zod';

const checkoutTokenSchema = z.object({
  leadId: z.string().min(1),
  assessmentId: z.string().min(1),
  packageKey: z.string().min(1),
  campaignSource: z.string().optional(),
  partnerReference: z.string().optional(),
  exp: z.number(),
  nonce: z.string().min(1),
  version: z.literal(1),
});

const CHECKOUT_TOKEN_SECRET = process.env.CHECKOUT_TOKEN_SECRET ?? 'dev-checkout-secret';

export function createCheckoutToken({ leadId, assessmentId, packageKey, campaignSource, partnerReference, expiresInSeconds = 60 * 15, nonce = crypto.randomBytes(8).toString('hex') }: { leadId: string; assessmentId: string; packageKey: string; campaignSource?: string; partnerReference?: string; expiresInSeconds?: number; nonce?: string; }) {
  const payload = { leadId, assessmentId, packageKey, campaignSource, partnerReference, exp: Math.floor(Date.now() / 1000) + expiresInSeconds, nonce, version: 1 as const };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', CHECKOUT_TOKEN_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export async function verifyCheckoutToken(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid checkout token');
  const [header, body, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', CHECKOUT_TOKEN_SECRET).update(`${header}.${body}`).digest('base64url');
  if (expectedSignature !== signature) throw new Error('Tampered checkout token');
  const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  const payload = checkoutTokenSchema.parse(parsed);
  if (payload.exp <= Math.floor(Date.now() / 1000)) throw new Error('Expired checkout token');
  return payload;
}

export function buildCheckoutMetadata({ leadId, assessmentId, packageKey, campaignSource, partnerReference, reportToken }: { leadId: string; assessmentId: string; packageKey: string; campaignSource?: string; partnerReference?: string; reportToken?: string; }) {
  return {
    lead_id: leadId,
    assessment_id: assessmentId,
    package_key: packageKey,
    campaign_source: campaignSource ?? '',
    partner_reference: partnerReference ?? '',
    report_token: reportToken ?? '',
  };
}
