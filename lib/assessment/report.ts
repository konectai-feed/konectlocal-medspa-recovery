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
  lead_revenue_recovery_599: {
    slug: 'lead_revenue_recovery_599',
    name: 'Revenue Recovery System',
    monthlyPrice: 599,
    setupFee: 450,
    explanation: 'Recommended for med spas that need a focused system to recover missed inquiries, follow-up gaps, and no-shows.',
  },
  ai_revenue_command_center_999: {
    slug: 'ai_revenue_command_center_999',
    name: 'AI Revenue Command Center',
    monthlyPrice: 999,
    setupFee: 750,
    explanation: 'Recommended for med spas with broader operational leakage across locations, lead handling, and retention workflows.',
  },
  manual_sales_review: {
    slug: 'manual_sales_review',
    name: 'Custom Revenue Recovery Review',
    monthlyPrice: null,
    setupFee: null,
    explanation: 'Recommended when the opportunity spans complex operations, enterprise workflows, or 10+ locations.',
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
    case 'High':
      return 'High: estimate is based on complete and relatively specific inputs.';
    case 'Medium':
      return 'Medium: some values were estimated from ranges or unknown answers.';
    default:
      return 'Low: several important inputs were missing or broadly estimated.';
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
  if (locationCount >= 10) {
    return 'Your results suggest a more tailored recovery plan is the right fit for a multi-location operation.';
  }

  if (!topLeaks.length) {
    return `${packageName} matches the level of recovery opportunity shown in your assessment.`;
  }

  const leadText = topLeaks.slice(0, 2).join(' and ').toLowerCase();
  return `${packageName} was recommended because your largest recovery opportunities are in ${leadText}.`;
}

export function getPackagePresentation(slug: string, topLeaks: string[], locationCount: number): PackagePresentation {
  const base = packagePresentationMap[slug] ?? packagePresentationMap.manual_sales_review;
  const emphasizeReview = slug === 'manual_sales_review' || locationCount >= 10;
  return {
    ...base,
    checkoutEnabled: !emphasizeReview,
    emphasizeReview,
    explanation: buildRecommendationReason(topLeaks, base.name, locationCount),
  };
}

export function buildAssessmentReportPresentation({
  assessment,
  lead,
  cta,
  bookingUrl,
}: {
  assessment: Record<string, unknown>;
  lead: Record<string, unknown>;
  cta: ResultsCtaHierarchy;
  bookingUrl?: string;
}) {
  const answers = (assessment.answers ?? {}) as AssessmentAnswers;
  const editedAssumptions = normalizeEditedAssumptions(assessment.edited_assumptions);
  const calculated = calculateAssessmentResult({
    answers,
    contact: {
      email: String(lead.email ?? ''),
      phone: String(lead.phone ?? ''),
      website: String(lead.website ?? ''),
      priorCampaignOpener: Boolean(lead.prior_campaign_opener),
    },
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
    assumptionsUsed: {
      monthlyInquiries: assumptions.inquiries,
      averageClientValue: assumptions.value,
      bookingRate: assumptions.bookingRate,
      noShowRate: assumptions.noShowRate,
      dormantPatientPool: assumptions.dormantPool,
    },
    topRevenueLeaks: calculated.topLeaks.map((leak) => ({
      key: leak.key,
      label: leak.label,
      severityLabel: leak.severityLabel,
      severityPercent: Math.round(leak.ratio * 100),
    })),
    positiveFindings: calculated.positiveFindings,
    recommendedPackage,
    cta,
    bookingUrl: bookingUrl ?? 'mailto:support@konectlocal.com?subject=Revenue%20Recovery%20Review',
    leadId: String(lead.id ?? ''),
    assessmentId: String(assessment.id ?? ''),
  };
}