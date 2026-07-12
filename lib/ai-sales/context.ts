import { fetchReportByToken } from '@/lib/assessment/service';
import { buildAssessmentReportPresentation, getLocationCountFromAnswers } from '@/lib/assessment/report';
import { getResultsPageCtaHierarchy } from '@/lib/commerce/results-cta';

export type AISalesAssessmentSummary = {
  businessName: string;
  score: number;
  recoveryLevel: string;
  opportunityLow: number;
  opportunityHigh: number;
  annualImpactLow: number;
  annualImpactHigh: number;
  confidenceLevel: string;
  topRevenueLeaks: string[];
  recommendedPlan: {
    name: string;
    explanation: string;
    monthlyPrice: number | null;
    setupFee: number | null;
    checkoutEnabled: boolean;
    emphasizeReview: boolean;
  };
  bookingUrl: string;
};

export async function buildAISalesAssessmentSummary({
  reportToken,
  leadId,
  assessmentId,
}: {
  reportToken?: string;
  leadId: string;
  assessmentId?: string | null;
}) {
  if (!reportToken) {
    return null;
  }

  const report = await fetchReportByToken(reportToken);
  if (!report) {
    return null;
  }

  if (String(report.lead.id) !== leadId) {
    return null;
  }

  if (assessmentId && String(report.assessment.id) !== assessmentId) {
    return null;
  }

  const answers = (report.assessment.answers ?? {}) as Record<string, string>;
  const locationCount = getLocationCountFromAnswers(answers);
  const cta = getResultsPageCtaHierarchy({
    locationCount,
    packageKey: String(report.assessment.recommended_package ?? ''),
  });
  const presentation = buildAssessmentReportPresentation({
    assessment: report.assessment as Record<string, unknown>,
    lead: report.lead as Record<string, unknown>,
    cta,
    bookingUrl: process.env.BOOKING_URL,
  });

  return {
    businessName: String(report.lead.business_name ?? 'Your med spa'),
    score: presentation.score,
    recoveryLevel: presentation.recoveryLevel,
    opportunityLow: presentation.opportunityLow,
    opportunityHigh: presentation.opportunityHigh,
    annualImpactLow: presentation.annualImpactLow,
    annualImpactHigh: presentation.annualImpactHigh,
    confidenceLevel: presentation.confidenceLevel,
    topRevenueLeaks: presentation.topRevenueLeaks.map((leak) => leak.label),
    recommendedPlan: {
      name: presentation.recommendedPackage.name,
      explanation: presentation.recommendedPackage.explanation,
      monthlyPrice: presentation.recommendedPackage.monthlyPrice,
      setupFee: presentation.recommendedPackage.setupFee,
      checkoutEnabled: presentation.recommendedPackage.checkoutEnabled,
      emphasizeReview: presentation.recommendedPackage.emphasizeReview,
    },
    bookingUrl: presentation.bookingUrl,
  } satisfies AISalesAssessmentSummary;
}