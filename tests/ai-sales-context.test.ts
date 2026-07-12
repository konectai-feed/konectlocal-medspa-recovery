import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAISalesAssessmentSummary } from '@/lib/ai-sales/context';
import { fetchAssessmentContextForAi } from '@/lib/assessment/service';

vi.mock('@/lib/assessment/service', () => ({
  fetchAssessmentContextForAi: vi.fn(),
}));

describe('AI sales assessment context', () => {
  beforeEach(() => {
    vi.mocked(fetchAssessmentContextForAi).mockReset();
  });

  it('maps the full report context needed for AI answers', async () => {
    vi.mocked(fetchAssessmentContextForAi).mockResolvedValue({
      reportLink: null,
      lead: {
        id: 'lead-1',
        business_name: 'Glow Aesthetics',
        email: 'owner@example.com',
        phone: '555-0100',
        website: 'https://glow.example.com',
        prior_campaign_opener: false,
      },
      assessment: {
        id: 'assessment-1',
        lead_id: 'lead-1',
        answers: {
          location_count_band: 'one',
          monthly_inquiry_band: 'fifty_to_seventy_five',
        },
        edited_assumptions: {},
        formula_version: 'v1',
        benchmark_version: 'v1',
      },
    } as never);

    const summary = await buildAISalesAssessmentSummary({
      leadId: 'lead-1',
      assessmentId: 'assessment-1',
      reportToken: 'report-token',
    });

    expect(summary).toMatchObject({
      businessName: 'Glow Aesthetics',
      locationCount: 1,
      assessmentAnswers: {
        location_count_band: 'one',
        monthly_inquiry_band: 'fifty_to_seventy_five',
      },
      score: expect.any(Number),
      recoveryLevel: expect.any(String),
      opportunityLow: expect.any(Number),
      opportunityHigh: expect.any(Number),
      annualImpactLow: expect.any(Number),
      annualImpactHigh: expect.any(Number),
      confidenceLevel: expect.any(String),
      positiveFindings: expect.any(Array),
      assumptionsUsed: {
        monthlyInquiries: expect.any(Number),
        averageClientValue: expect.any(Number),
        bookingRate: expect.any(Number),
        noShowRate: expect.any(Number),
        dormantPatientPool: expect.any(Number),
      },
      recommendedPlan: {
        slug: expect.any(String),
        name: expect.any(String),
        justification: expect.any(String),
        monthlyPrice: expect.anything(),
        setupFee: expect.anything(),
        checkoutEnabled: expect.any(Boolean),
        emphasizeReview: expect.any(Boolean),
        status: expect.stringMatching(/checkout_enabled|manual_review_required/),
      },
      bookingUrl: expect.any(String),
    });

    expect(summary?.topRevenueLeaks[0]).toMatchObject({
      label: expect.any(String),
      severityLabel: expect.any(String),
      severityPercent: expect.any(Number),
    });
  });

  it('returns null when no assessment context can be loaded', async () => {
    vi.mocked(fetchAssessmentContextForAi).mockResolvedValue(null);

    await expect(buildAISalesAssessmentSummary({ leadId: 'lead-1', assessmentId: 'assessment-1' })).resolves.toBeNull();
  });
});