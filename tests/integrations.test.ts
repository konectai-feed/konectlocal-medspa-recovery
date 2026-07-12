import { describe, expect, it } from 'vitest';
import { validatePromotionCode, applyPromotionToCheckout } from '@/lib/commerce/promotions';
import { getResultsPageCtaHierarchy } from '@/lib/commerce/results-cta';
import { prepareVendastaProvisioningPayload, createVendastaProvisioningAdapter } from '@/lib/integrations/vendasta';
import { createBrevoAdapter } from '@/lib/integrations/brevo';
import { createAISalesAdapter } from '@/lib/ai-sales/provider';
import { lifecycleActionForStatus } from '@/lib/onboarding/lifecycle';

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
    const result = await adapter.generateReply({
      message: 'I want to buy the recovery package',
      leadContext: {
        leadId: 'lead-1',
        assessmentSummary: {
          businessName: 'Glow Aesthetics',
          locationCount: 1,
          assessmentAnswers: { location_count_band: 'one' },
          score: 88,
          recoveryLevel: 'Critical recovery opportunity',
          opportunityLow: 1500,
          opportunityHigh: 2000,
          annualImpactLow: 18000,
          annualImpactHigh: 24000,
          confidenceLevel: 'Medium',
          positiveFindings: ['Review-request process is already well structured.'],
          assumptionsUsed: {
            monthlyInquiries: 75,
            averageClientValue: 375,
            bookingRate: 0.47,
            noShowRate: 0.12,
            dormantPatientPool: 450,
          },
          topRevenueLeaks: [
            { label: 'Missed inquiries', severityLabel: 'Critical', severityPercent: 92 },
          ],
          recommendedPlan: {
            slug: 'lead_revenue_recovery_599',
            name: 'Revenue Recovery System',
            justification: 'Revenue Recovery System was recommended because your largest recovery opportunities are in missed inquiries and unbooked lead follow-up.',
            monthlyPrice: 599,
            setupFee: 450,
            checkoutEnabled: true,
            emphasizeReview: false,
            status: 'checkout_enabled',
          },
          bookingUrl: 'https://booking.example.com/review',
        },
      },
    });
    expect(result.safe).toBe(true);
    expect(result.action).toBe('open_checkout');
  });

  it('explains assessment results using the recommended plan and revenue context', async () => {
    const adapter = createAISalesAdapter('mock');
    const result = await adapter.generateReply({
      message: 'Please explain my assessment results and recommended recovery plan.',
      messages: [{ role: 'user', content: 'Please explain my assessment results and recommended recovery plan.' }],
      leadContext: {
        leadId: 'lead-1',
        assessmentId: 'assessment-1',
        assessmentSummary: {
          businessName: 'Glow Aesthetics',
          locationCount: 1,
          assessmentAnswers: { location_count_band: 'one' },
          score: 88,
          recoveryLevel: 'Critical recovery opportunity',
          opportunityLow: 1500,
          opportunityHigh: 2000,
          annualImpactLow: 18000,
          annualImpactHigh: 24000,
          confidenceLevel: 'Medium',
          positiveFindings: ['Review-request process is already well structured.'],
          assumptionsUsed: {
            monthlyInquiries: 75,
            averageClientValue: 375,
            bookingRate: 0.47,
            noShowRate: 0.12,
            dormantPatientPool: 450,
          },
          topRevenueLeaks: [
            { label: 'Missed inquiries', severityLabel: 'Critical', severityPercent: 92 },
            { label: 'Unbooked lead follow-up', severityLabel: 'High', severityPercent: 80 },
            { label: 'Patient reactivation', severityLabel: 'High', severityPercent: 74 },
          ],
          recommendedPlan: {
            slug: 'lead_revenue_recovery_599',
            name: 'Revenue Recovery System',
            justification: 'Revenue Recovery System was recommended because your largest recovery opportunities are in missed inquiries and unbooked lead follow-up.',
            monthlyPrice: 599,
            setupFee: 450,
            checkoutEnabled: true,
            emphasizeReview: false,
            status: 'checkout_enabled',
          },
          bookingUrl: 'https://booking.example.com/review',
        },
      },
    });

    expect(result.safe).toBe(true);
    expect(result.reply).toContain('Revenue Leak Score of 88/100');
    expect(result.reply).toContain('Missed inquiries (critical), Unbooked lead follow-up (high), Patient reactivation (high)');
    expect(result.reply).toContain('Revenue Recovery System');
  });

  it('guides manual-review assessments toward scheduling instead of checkout', async () => {
    const adapter = createAISalesAdapter('mock');
    const result = await adapter.generateReply({
      message: 'What happens after I activate?',
      leadContext: {
        leadId: 'lead-1',
        assessmentSummary: {
          businessName: 'Glow Aesthetics',
          locationCount: 12,
          assessmentAnswers: { location_count_band: 'ten_plus' },
          score: 91,
          recoveryLevel: 'Critical recovery opportunity',
          opportunityLow: 4000,
          opportunityHigh: 5500,
          annualImpactLow: 48000,
          annualImpactHigh: 66000,
          confidenceLevel: 'High',
          positiveFindings: ['Strong review-request process already exists.'],
          assumptionsUsed: {
            monthlyInquiries: 140,
            averageClientValue: 420,
            bookingRate: 0.49,
            noShowRate: 0.1,
            dormantPatientPool: 800,
          },
          topRevenueLeaks: [
            { label: 'Missed inquiries', severityLabel: 'Critical', severityPercent: 95 },
            { label: 'No-show recovery', severityLabel: 'High', severityPercent: 82 },
          ],
          recommendedPlan: {
            slug: 'manual_sales_review',
            name: 'Custom Revenue Recovery Review',
            justification: 'A tailored review is recommended before activation.',
            monthlyPrice: null,
            setupFee: null,
            checkoutEnabled: false,
            emphasizeReview: true,
            status: 'manual_review_required',
          },
          bookingUrl: 'https://booking.example.com/review',
        },
      },
    });

    expect(result.safe).toBe(true);
    expect(result.action).toBe('manual_review');
    expect(result.reply).toContain('Direct checkout is disabled');
    expect(result.reply).toContain('schedule the review');
  });

  it('requires assessment context before answering a sales question', async () => {
    const adapter = createAISalesAdapter('mock');
    const result = await adapter.generateReply({ message: 'What should I fix first?', leadContext: { leadId: 'lead-1' } });

    expect(result.safe).toBe(false);
    expect(result.action).toBe('schedule_review');
    expect(result.reply).toBe('I could not load your assessment context. Please refresh the page or schedule a review.');
  });

  it('refuses medical and HIPAA guidance requests inside the sales chat', async () => {
    const adapter = createAISalesAdapter('mock');
    const result = await adapter.generateReply({ message: 'Can you give medical treatment advice and HIPAA guidance for this result?' });

    expect(result.safe).toBe(false);
    expect(result.reply).toContain('I can only help with your assessment result');
    expect(result.reply).toContain('I can’t provide medical advice');
  });

  it('maps onboarding lifecycle attributes for Brevo sync jobs', () => {
    const action = lifecycleActionForStatus({
      status: 'ready_for_launch',
      completionPercent: 100,
      packageKey: 'command_center',
      stripeCustomerId: 'cus_123',
      subscriptionStatus: 'active',
      locationCount: 12,
      manualReviewRequired: true,
      launchDate: '2026-01-01T00:00:00.000Z',
    });

    expect(action.addLists).toContain('BREVO_LIST_READY_FOR_LAUNCH');
    expect(action.removeLists).toContain('BREVO_LIST_CONFIGURATION');
    expect(action.attributes.ONBOARDING_COMPLETION_PERCENT).toBe(100);
  });
});
