import { calculateAssessmentResult } from './calculate';
import { assessmentQuestionOptions } from './config';
import type { AssessmentAnswers, EditedAssumptions } from './types';
import type { ResultsCtaHierarchy } from '@/lib/commerce/results-cta';

type PackagePresentation = {
  slug: string;
  name: string;
  monthlyPrice: number | null;
  setupFee: number | null;
  explanation: string;
  checkoutEnabled: boolean;
  emphasizeReview: boolean;
};

const packagePresentationMap: Record<string, Omit<PackagePresentation, 'checkoutEnabled' | 'emphasizeReview'>> = {
  ai_lead_response_starter_249: {
    slug: 'ai_lead_response_starter_249',
    name: 'AI Lead Response Starter',
    monthlyPrice: 249,
    setupFee: 199,
    explanation: 'Recommended for med spas that primarily need faster lead response, missed-inquiry coverage, and stronger after-hours responsiveness.',
  },
  ai_lead_revenue_recovery_499: {
    slug: 'ai_lead_revenue_recovery_499',
    name: 'AI Lead & Revenue Recovery System',
    monthlyPrice: 499,
    setupFee: 199,
    explanation: 'Recommended for med spas with meaningful revenue leakage across response, follow-up, booking, no-shows, reputation, or reactivation.',
  },
  ai_revenue_command_center_899: {
    slug: 'ai_revenue_command_center_899',
    name: 'AI Revenue Command Center',
    monthlyPrice: 899,
    setupFee: 199,
    explanation: 'Recommended for higher-volume or multi-location med spas with multiple severe leakage points and broader automation, retention, and reporting needs.',
  },
  manual_sales_review: {
    slug: 'manual_sales_review',
    name: 'Custom Revenue Growth Review',
    monthlyPrice: null,
    setupFee: null,
    explanation: 'Recommended for enterprise or 10+ location operations that need a tailored deployment.',
  },
};

function getCalculationFactor(questionKey: string, value: string) {
  const options = assessmentQuestionOptions[questionKey as keyof typeof assessmentQuestionOptions] as readonly { value: string; calculation_factor: number }[] | undefined;
  return options?.find((option) => option.value === value)?.calculation_factor ?? 0;
}

export function getLocationCountFromAnswers(answers: AssessmentAnswers) {
  return Math.max(1, Number(getCalculationFactor('location_count_band', answers.location_count_band ?? 'one')) || 1);
}

export function getConfidenceExplanation(level: string) {
  switch (level) {
    case 'High': return 'High: estimate is based on complete and relatively specific inputs.';
    case 'Medium': return 'Medium: some values were estimated from ranges or unknown answers.';
    default: return 'Low: several important inputs were missing or broadly estimated.';
  }
}

function normalizeEditedAssumptions(value: unknown): EditedAssumptions | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const normalized: EditedAssumptions = {
    monthlyInquiries: typeof source.monthlyInquiries === 'number' ? source.monthlyInquiries : undefined,
    averageValue: typeof source.averageValue === 'number' ? source.averageValue : undefined,
    bookingRate: typeof source.bookingRate === 'number' ? source.bookingRate : undefined,
    noShowRate: typeof source.noShowRate === 'number' ? source.noShowRate : undefined,
    dormantPool: typeof source.dormantPool === 'number' ? source.dormantPool : undefined,
  };
  return Object.values(normalized).some((entry) => typeof entry === 'number') ? normalized : undefined;
}

function buildRecommendationReason(topLeaks: string[], packageName: string, locationCount: number) {
  if (locationCount >= 10) return 'Your results suggest a tailored growth deployment is the right fit for a 10+ location operation.';
  if (!topLeaks.length) return `${packageName} matches the level of opportunity shown in your assessment.`;
  const leadText = topLeaks.slice(0, 2).join(' and ').toLowerCase();
  return `${packageName} was recommended because your largest growth opportunities are in ${leadText}.`;
}

export function getPackagePresentation(slug: string, topLeaks: string[], locationCount: number): PackagePresentation {
  const base = packagePresentationMap[slug] ?? packagePresentationMap.ai_lead_revenue_recovery_499;
  const emphasizeReview = slug === 'manual_sales_review' || locationCount >= 10;
  return { ...base, checkoutEnabled: !emphasizeReview, emphasizeReview, explanation: buildRecommendationReason(topLeaks, base.name, locationCount) };
}

export function buildAssessmentReportPresentation({ assessment, lead, cta, bookingUrl }: { assessment: Record<string, unknown>; lead: Record<string, unknown>; cta: ResultsCtaHierarchy; bookingUrl?: string; }) {
  const answers = (assessment.answers ?? {}) as AssessmentAnswers;
  const editedAssumptions = normalizeEditedAssumptions(assessment.edited_assumptions);
  const calculated = calculateAssessmentResult({
    answers,
    contact: { email: String(lead.email ?? ''), phone: String(lead.phone ?? ''), website: String(lead.website ?? ''), priorCampaignOpener: Boolean(lead.prior_campaign_opener) },
    editedAssumptions,
    formulaVersion: String(assessment.formula_version ?? 'unknown'),
    benchmarkVersion: String(assessment.benchmark_version ?? 'unknown'),
  });
  const locationCount = getLocationCountFromAnswers(answers);
  const assumptions = calculated.calculationSnapshot.assumptions;
  const recommendedPackage = getPackagePresentation(calculated.recommendedPackage, calculated.topLeaks.map((leak) => leak.label), locationCount);
  return {
    score: calculated.recoveryScore,
    recoveryLevel: calculated.recoveryLevel,
    opportunityLow: calculated.opportunityLow,
    opportunityHigh: calculated.opportunityHigh,
    annualImpactLow: calculated.opportunityLow * 12,
    annualImpactHigh: calculated.opportunityHigh * 12,
    confidenceLevel: calculated.confidenceLevel,
    confidenceExplanation: getConfidenceExplanation(calculated.confidenceLevel),
    confidenceDisclaimer: 'Estimate confidence reflects how specific the inputs were. It is not a promise that KonectLocal will recover the revenue.',
    assumptionsUsed: { monthlyInquiries: assumptions.inquiries, averageClientValue: assumptions.value, bookingRate: assumptions.bookingRate, noShowRate: assumptions.noShowRate, dormantPatientPool: assumptions.dormantPool },
    topRevenueLeaks: calculated.topLeaks.map((leak) => ({ key: leak.key, label: leak.label, severityLabel: leak.severityLabel, severityPercent: Math.round(leak.ratio * 100) })),
    positiveFindings: calculated.positiveFindings,
    recommendedPackage,
    cta,
    bookingUrl: bookingUrl ?? 'mailto:support@konectlocal.com?subject=Med%20Spa%20Growth%20Review',
    leadId: String(lead.id ?? ''),
    assessmentId: String(assessment.id ?? ''),
  };
}
