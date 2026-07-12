export const aiAssessmentContextLoadError = 'I could not load your assessment context. Please refresh the page or schedule a review.';

export type AISalesAssessmentSummary = {
  businessName: string;
  locationCount: number;
  assessmentAnswers: Record<string, unknown>;
  score: number;
  recoveryLevel: string;
  opportunityLow: number;
  opportunityHigh: number;
  annualImpactLow: number;
  annualImpactHigh: number;
  confidenceLevel: string;
  positiveFindings: string[];
  assumptionsUsed: {
    monthlyInquiries: number;
    averageClientValue: number;
    bookingRate: number;
    noShowRate: number;
    dormantPatientPool: number;
  };
  topRevenueLeaks: Array<{
    label: string;
    severityLabel: string;
    severityPercent: number;
  }>;
  recommendedPlan: {
    slug: string;
    name: string;
    justification: string;
    monthlyPrice: number | null;
    setupFee: number | null;
    checkoutEnabled: boolean;
    emphasizeReview: boolean;
    status: 'checkout_enabled' | 'manual_review_required';
  };
  bookingUrl: string;
};