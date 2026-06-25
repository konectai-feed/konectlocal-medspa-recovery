import { describe, expect, it } from 'vitest';
import { validatePromotionCode, applyPromotionToCheckout } from '@/lib/commerce/promotions';
import { getResultsPageCtaHierarchy } from '@/lib/commerce/results-cta';
import { prepareVendastaProvisioningPayload, createVendastaProvisioningAdapter } from '@/lib/integrations/vendasta';
import { createBrevoAdapter } from '@/lib/integrations/brevo';
import { createAISalesAdapter } from '@/lib/ai-sales/provider';

describe('promotion validation', () => {
  it('accepts known promotion codes and returns attributed discount metadata', () => {
    const result = validatePromotionCode('SAVE10', { packageKey: 'lead_revenue_recovery' });
    expect(result.valid).toBe(true);
    expect(result.discountPercent).toBe(10);
    expect(result.attributionCode).toBe('SAVE10');
  });

  it('rejects unknown codes and preserves zero-dollar pricing', () => {
    const result = validatePromotionCode('UNKNOWN', { packageKey: 'lead_revenue_recovery' });
    expect(result.valid).toBe(false);
    expect(result.discountPercent).toBe(0);
    expect(result.discountAmount).toBe(0);
  });

  it('applies promotion context to checkout metadata', () => {
    const applied = applyPromotionToCheckout('SAVE10', { packageKey: 'ai_revenue_command_center', packagePrice: 999 });
    expect(applied.metadata.promotionCode).toBe('SAVE10');
    expect(applied.metadata.discountPercent).toBe(10);
    expect(applied.metadata.finalAmount).toBe(899.1);
  });
});

describe('results page CTA hierarchy', () => {
  it('prioritizes manual review for ten-plus locations', () => {
    const hierarchy = getResultsPageCtaHierarchy({ locationCount: 12, packageKey: 'ai_revenue_command_center' });
    expect(hierarchy.primary).toBe('manual_review');
  });

  it('uses AI sales as secondary CTA for supported packages', () => {
    const hierarchy = getResultsPageCtaHierarchy({ locationCount: 3, packageKey: 'lead_revenue_recovery' });
    expect(hierarchy.primary).toBe('purchase');
    expect(hierarchy.secondary).toBe('ai_sales_chat');
    expect(hierarchy.tertiary).toBe('booking');
  });
});

describe('adapter integrations', () => {
  it('prepares Vendasta payloads in dry-run mode when provisioning is disabled', () => {
    const adapter = createVendastaProvisioningAdapter({ provisioningEnabled: false });
    const payload = prepareVendastaProvisioningPayload(adapter, { leadId: 'lead-1', assessmentId: 'assessment-1', packageKey: 'lead_revenue_recovery' });
    expect(payload.dryRun).toBe(true);
    expect(payload.packageKey).toBe('lead_revenue_recovery');
  });

  it('provides a typed Brevo adapter that does not require a live key', async () => {
    const adapter = createBrevoAdapter();
    const result = await adapter.upsertContact({ email: 'prospect@example.com', attributes: { firstName: 'Sam' } });
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
  });

  it('moderates AI sales input and returns a safe response', async () => {
    const adapter = createAISalesAdapter('mock');
    const result = await adapter.generateReply({ message: 'I want to buy the recovery package', leadContext: { leadId: 'lead-1', packageKey: 'lead_revenue_recovery' } });
    expect(result.safe).toBe(true);
    expect(result.action).toBe('open_checkout');
  });
});
