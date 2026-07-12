import { fetchAssessmentContextForAi } from '@/lib/assessment/service';
import { buildAssessmentReportPresentation, getLocationCountFromAnswers } from '@/lib/assessment/report';
import { getResultsPageCtaHierarchy } from '@/lib/commerce/results-cta';
import { type AISalesAssessmentSummary } from '@/lib/ai-sales/shared';

export async function buildAISalesAssessmentSummary({
  reportToken,
  leadId,
  assessmentId,
}: {
  reportToken?: string;
  leadId: string;
  assessmentId?: string | null;
}) {
  const report = await fetchAssessmentContextForAi({ reportToken, leadId, assessmentId });
  if (!report) {
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
    locationCount,
    assessmentAnswers: report.assessment.answers as Record<string, unknown>,
    score: presentation.score,
    recoveryLevel: presentation.recoveryLevel,
    opportunityLow: presentation.opportunityLow,
    opportunityHigh: presentation.opportunityHigh,
    annualImpactLow: presentation.annualImpactLow,
    annualImpactHigh: presentation.annualImpactHigh,
    confidenceLevel: presentation.confidenceLevel,
    positiveFindings: presentation.positiveFindings,
    assumptionsUsed: presentation.assumptionsUsed,
    topRevenueLeaks: presentation.topRevenueLeaks.map((leak) => ({
      label: leak.label,
      severityLabel: leak.severityLabel,
      severityPercent: leak.severityPercent,
    })),
    recommendedPlan: {
      slug: presentation.recommendedPackage.slug,
      name: presentation.recommendedPackage.name,
      justification: presentation.recommendedPackage.explanation,
      monthlyPrice: presentation.recommendedPackage.monthlyPrice,
      setupFee: presentation.recommendedPackage.setupFee,
      checkoutEnabled: presentation.recommendedPackage.checkoutEnabled,
      emphasizeReview: presentation.recommendedPackage.emphasizeReview,
      status: presentation.recommendedPackage.checkoutEnabled ? 'checkout_enabled' : 'manual_review_required',
    },
    bookingUrl: presentation.bookingUrl,
  } satisfies AISalesAssessmentSummary;
}