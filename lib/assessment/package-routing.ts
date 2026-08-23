import type { AssessmentAnswers } from './types';

export type MedSpaPackageSlug =
  | 'ai_lead_response_starter_249'
  | 'ai_lead_revenue_recovery_499'
  | 'ai_revenue_command_center_899'
  | 'manual_sales_review';

export const launchPackageOptions: Record<MedSpaPackageSlug, { id: MedSpaPackageSlug; name: string; price: number; description: string }> = {
  ai_lead_response_starter_249: {
    id: 'ai_lead_response_starter_249',
    name: 'AI Lead Response Starter',
    price: 249,
    description: 'Fast lead response and missed-inquiry coverage for med spas whose primary gap is speed-to-lead or after-hours responsiveness.',
  },
  ai_lead_revenue_recovery_499: {
    id: 'ai_lead_revenue_recovery_499',
    name: 'AI Lead & Revenue Recovery System',
    price: 499,
    description: 'The flagship system for meaningful leakage across lead response, follow-up, booking, no-shows, reputation, reactivation, or automation.',
  },
  ai_revenue_command_center_899: {
    id: 'ai_revenue_command_center_899',
    name: 'AI Revenue Command Center',
    price: 899,
    description: 'Full-funnel revenue infrastructure for higher-volume or multi-location med spas with multiple severe leakage and automation needs.',
  },
  manual_sales_review: {
    id: 'manual_sales_review',
    name: 'Custom Revenue Growth Review',
    price: 0,
    description: 'A tailored deployment review for enterprise or 10+ location operations.',
  },
};

export function routeMedSpaPackage({
  answers,
  locationCount,
  monthlyInquiries,
  recoveryScore,
  routingPoints,
}: {
  answers: AssessmentAnswers;
  locationCount: number;
  monthlyInquiries: number;
  recoveryScore: number;
  routingPoints: number;
}): MedSpaPackageSlug {
  if (locationCount >= 10) return 'manual_sales_review';

  const severeDownstreamGaps = [
    answers.unbooked_lead_followup === 'none' || answers.unbooked_lead_followup === 'inconsistent',
    answers.missed_appointment_recovery === 'none' || answers.missed_appointment_recovery === 'inconsistent',
    answers.reactivation_process === 'never' || answers.reactivation_process === 'rarely',
    answers.reporting_visibility === 'none' || answers.reporting_visibility === 'limited',
    answers.membership_package_maturity === 'yes_underperforming',
  ].filter(Boolean).length;

  if (
    locationCount >= 4 ||
    monthlyInquiries >= 400 ||
    routingPoints >= 14 ||
    (locationCount >= 2 && routingPoints >= 10) ||
    (monthlyInquiries >= 200 && severeDownstreamGaps >= 2) ||
    severeDownstreamGaps >= 4
  ) return 'ai_revenue_command_center_899';

  const responseOnlyGap =
    recoveryScore < 35 &&
    severeDownstreamGaps === 0 &&
    locationCount === 1 &&
    monthlyInquiries < 100 &&
    (answers.missed_call_handling === 'voicemail_same_day' ||
      answers.missed_call_handling === 'voicemail_inconsistent' ||
      answers.missed_call_handling === 'often_lost' ||
      answers.digital_response_time === '1_4_hours' ||
      answers.digital_response_time === 'same_day' ||
      answers.digital_response_time === 'next_day_or_inconsistent' ||
      answers.after_hours_coverage === 'next_business_day' ||
      answers.after_hours_coverage === 'no_process');

  if (responseOnlyGap) return 'ai_lead_response_starter_249';

  return 'ai_lead_revenue_recovery_499';
}
