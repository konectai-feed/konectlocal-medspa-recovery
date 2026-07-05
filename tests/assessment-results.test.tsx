import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AssessmentResultsPage from '@/app/(public)/assessment/results/[token]/page';

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildReport(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    assessment: {
      id: 'assessment-1',
      recommended_package: 'lead_revenue_recovery_599',
      calculation_snapshot: {
        assumptions: {
          inquiries: 75,
          value: 375,
          bookingRate: 0.47,
          noShowRate: 0.12,
          dormantPool: 450,
        },
      },
    },
    lead: {
      id: 'lead-1',
      business_name: 'Glow Aesthetics',
    },
    cta: {
      primary: 'purchase',
      secondary: 'ai_sales_chat',
      tertiary: 'booking',
    },
    presentation: {
      score: 88,
      recoveryLevel: 'Critical recovery opportunity',
      opportunityLow: 1500,
      opportunityHigh: 2000,
      annualImpactLow: 18000,
      annualImpactHigh: 24000,
      confidenceLevel: 'Medium',
      confidenceExplanation: 'Medium: some values were estimated from ranges or unknown answers.',
      confidenceDisclaimer: 'Estimate confidence reflects how specific the inputs were. It is not a promise that KonectLocal will recover the revenue.',
      assumptionsUsed: {
        monthlyInquiries: 75,
        averageClientValue: 375,
        bookingRate: 0.47,
        noShowRate: 0.12,
        dormantPatientPool: 450,
      },
      topRevenueLeaks: [
        { key: 'missed_inquiries', label: 'Missed inquiries', severityLabel: 'Critical', severityPercent: 92 },
        { key: 'unbooked_followup', label: 'Unbooked lead follow-up', severityLabel: 'High', severityPercent: 80 },
        { key: 'patient_reactivation', label: 'Patient reactivation', severityLabel: 'High', severityPercent: 74 },
      ],
      positiveFindings: ['Your review-request process is already well structured.'],
      recommendedPackage: {
        slug: 'lead_revenue_recovery_599',
        name: 'Revenue Recovery System',
        monthlyPrice: 599,
        setupFee: 450,
        explanation: 'Revenue Recovery System was recommended because your largest recovery opportunities are in missed inquiries and unbooked lead follow-up.',
        checkoutEnabled: true,
        emphasizeReview: false,
      },
      bookingUrl: 'https://booking.example.com/review',
      leadId: 'lead-1',
      assessmentId: 'assessment-1',
    },
    ...overrides,
  };
}

describe('assessment results page', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${String(input)}`;
      if (key === 'GET /api/report/report-token') {
        return jsonResponse(buildReport());
      }
      if (key === 'POST /api/assessment/recalculate') {
        return jsonResponse({ ok: true });
      }
      return jsonResponse({ error: 'Unexpected request' }, 500);
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders customer-facing labels, annual impact, and confidence explanation', async () => {
    render(<AssessmentResultsPage params={{ token: 'report-token' }} />);

    await waitFor(() => {
      expect(screen.getByText('Revenue Leak Score')).toBeTruthy();
    });

    expect(screen.getByText('88/100')).toBeTruthy();
    expect(screen.getByText('Estimated Monthly Recovery Opportunity')).toBeTruthy();
    expect(screen.getByText('Estimated Annual Impact')).toBeTruthy();
    expect(screen.getByText('$18,000 - $24,000')).toBeTruthy();
    expect(screen.getAllByText('Estimate Confidence').length).toBeGreaterThan(0);
    expect(screen.getByText(/some values were estimated from ranges or unknown answers/i)).toBeTruthy();
    expect(screen.getByText(/not a promise that KonectLocal will recover the revenue/i)).toBeTruthy();
  });

  it('prepopulates assumptions and maps the package slug to customer-facing copy', async () => {
    render(<AssessmentResultsPage params={{ token: 'report-token' }} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('75')).toBeTruthy();
    });

    expect(screen.getByDisplayValue('375')).toBeTruthy();
    expect(screen.getByDisplayValue('47')).toBeTruthy();
    expect(screen.getByDisplayValue('12')).toBeTruthy();
    expect(screen.getByDisplayValue('450')).toBeTruthy();
    expect(screen.getByText('Revenue Recovery System')).toBeTruthy();
    expect(screen.queryByText('lead_revenue_recovery_599')).toBeNull();
    expect(screen.getByRole('button', { name: 'Activate My Recommended Plan' })).toBeTruthy();
  });

  it('hides direct checkout when manual review is required', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(buildReport({
      cta: {
        primary: 'manual_review',
        secondary: 'ai_sales_chat',
        tertiary: 'booking',
      },
      presentation: {
        ...buildReport().presentation,
        recommendedPackage: {
          slug: 'manual_sales_review',
          name: 'Custom Revenue Recovery Review',
          monthlyPrice: null,
          setupFee: null,
          explanation: 'Your results suggest a more tailored recovery plan is the right fit for a multi-location operation.',
          checkoutEnabled: false,
          emphasizeReview: true,
        },
      },
    }))));

    render(<AssessmentResultsPage params={{ token: 'report-token' }} />);

    await waitFor(() => {
      expect(screen.getByText('Custom Revenue Recovery Review')).toBeTruthy();
    });

    expect(screen.queryByRole('button', { name: 'Activate My Recommended Plan' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Discuss My Results With AI' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Schedule Revenue Recovery Review' })).toBeTruthy();
  });

  it('refreshes the displayed opportunities after recalculation', async () => {
    const first = buildReport();
    const second = buildReport({
      presentation: {
        ...buildReport().presentation,
        opportunityLow: 2200,
        opportunityHigh: 2900,
        annualImpactLow: 26400,
        annualImpactHigh: 34800,
        confidenceLevel: 'High',
        confidenceExplanation: 'High: estimate is based on complete and relatively specific inputs.',
        assumptionsUsed: {
          monthlyInquiries: 90,
          averageClientValue: 425,
          bookingRate: 0.52,
          noShowRate: 0.1,
          dormantPatientPool: 600,
        },
      },
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${String(input)}`;
      if (key === 'GET /api/report/report-token') {
        return jsonResponse(fetchMock.mock.calls.length > 1 ? second : first);
      }
      if (key === 'POST /api/assessment/recalculate') {
        return jsonResponse({ ok: true });
      }
      return jsonResponse({ error: 'Unexpected request' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<AssessmentResultsPage params={{ token: 'report-token' }} />);

    await waitFor(() => {
      expect(screen.getByText('$1,500 - $2,000')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Monthly inquiries'), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recalculate Opportunity' }));

    await waitFor(() => {
      expect(screen.getByText('$2,200 - $2,900')).toBeTruthy();
    });

    expect(screen.getByText('$26,400 - $34,800')).toBeTruthy();
    expect(screen.getByDisplayValue('90')).toBeTruthy();
    expect(screen.getByText(/complete and relatively specific inputs/i)).toBeTruthy();
  });
});