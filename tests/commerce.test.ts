import { describe, expect, it } from 'vitest';
import { getPackageCatalog, getPackageConfig, normalizePackageKey } from '@/lib/commerce/catalog';
import { createCheckoutToken, verifyCheckoutToken, buildCheckoutMetadata } from '@/lib/commerce/checkout';

describe('commerce catalog', () => {
  it('returns the approved package catalog from server env', () => {
    const catalog = getPackageCatalog();
    expect(catalog.lead_revenue_recovery.displayName).toBe('Med Spa Lead & Revenue Recovery System');
    expect(catalog.ai_revenue_command_center.monthlyPrice).toBe(999);
  });

  it('normalizes package aliases and returns the approved config', () => {
    expect(normalizePackageKey('lead_revenue_recovery')).toBe('lead_revenue_recovery');
    expect(getPackageConfig('lead_revenue_recovery').stripePriceIdRecurring).toContain('price_');
  });
});

describe('checkout tokens', () => {
  it('signs and validates a checkout token', async () => {
    const token = createCheckoutToken({
      leadId: 'lead-123',
      assessmentId: 'assessment-456',
      packageKey: 'lead_revenue_recovery',
      campaignSource: 'email',
      partnerReference: 'partner-1',
      expiresInSeconds: 60,
    });

    const payload = await verifyCheckoutToken(token);
    expect(payload.leadId).toBe('lead-123');
    expect(payload.packageKey).toBe('lead_revenue_recovery');
  });

  it('builds metadata for checkout routing', () => {
    const metadata = buildCheckoutMetadata({
      leadId: 'lead-123',
      assessmentId: 'assessment-456',
      packageKey: 'ai_revenue_command_center',
      campaignSource: 'facebook',
      partnerReference: 'partner-2',
      reportToken: 'report-token',
    });

    expect(metadata.package_key).toBe('ai_revenue_command_center');
    expect(metadata.campaign_source).toBe('facebook');
  });
});
