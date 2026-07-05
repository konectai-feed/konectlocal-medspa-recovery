import { assessmentQuestionOptions, assessmentQuestionLabels, categoryDefinitions, confidenceBands, recoveryBands, packageOptions } from './config';
import type { AssessmentAnswers, AssessmentResult, EditedAssumptions, LeakCategory } from './types';

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function findOption(questionKey: string, value: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options = (assessmentQuestionOptions as Record<string, readonly any[]>)[questionKey];
  return options?.find((option) => option.value === value);
}

function getScorePoints(questionKey: string, value: string) {
  const option = findOption(questionKey, value);
  return option?.score_points ?? 0;
}

function getCalculationFactor(questionKey: string, value: string) {
  const option = findOption(questionKey, value);
  return option?.calculation_factor ?? 0;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getOptionLabel(questionKey: string, value: string) {
  const option = findOption(questionKey, value);
  return option?.label ?? value;
}

function formatMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundOpportunity(value: number) {
  if (value >= 50000) return Math.round(value / 1000) * 1000;
  if (value >= 10000) return Math.round(value / 500) * 500;
  return Math.round(value / 100) * 100;
}

function getRecoveryLevel(score: number) {
  const band = recoveryBands.find((entry) => score >= entry.min && score <= entry.max);
  return band?.label ?? 'Strong foundation';
}

function getConfidenceLevel(score: number) {
  const band = confidenceBands.find((entry) => score >= entry.min);
  return band?.label ?? 'Directional';
}

function getCategorySeverityLabel(ratio: number) {
  if (ratio >= 0.75) return 'Critical';
  if (ratio >= 0.5) return 'High';
  if (ratio >= 0.25) return 'Moderate';
  return 'Low';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function categoryKeyForQuestion(questionKey: string) {
  return categoryDefinitions.find((category) => (category.questions as readonly string[]).includes(questionKey))?.key;
}

function getCategoryEstimate(categoryKey: string, answers: AssessmentAnswers, assumptions: { I:number; V:number; B:number; N:number; dormantPool:number }) {
  const { I, V, B, N, dormantPool } = assumptions;
  switch (categoryKey) {
    case 'missed_inquiries': {
      const missedContact = getCalculationFactor('missed_call_handling', answers.missed_call_handling ?? 'live_backup');
      const responseFactor = getCalculationFactor('digital_response_time', answers.digital_response_time ?? 'under_5_min');
      const afterHours = getCalculationFactor('after_hours_coverage', answers.after_hours_coverage ?? 'full_coverage');
      const responseLossFactor = clamp(missedContact * 0.55 + responseFactor * 0.75 + afterHours * 0.45, 0, 0.38);
      const additionalBookedConsultationsLow = I * responseLossFactor * 0.17;
      const additionalBookedConsultationsHigh = I * responseLossFactor * 0.27;
      const low = additionalBookedConsultationsLow * V;
      const high = additionalBookedConsultationsHigh * V;
      return { low, high };
    }
    case 'unbooked_followup': {
      const recoverable = getCalculationFactor('unbooked_lead_followup', answers.unbooked_lead_followup ?? 'multichannel_sequence');
      const unbookedInquiries = I * (1 - B);
      const additionalBookedConsultationsLow = unbookedInquiries * recoverable * 0.16;
      const additionalBookedConsultationsHigh = unbookedInquiries * recoverable * 0.26;
      const low = additionalBookedConsultationsLow * V;
      const high = additionalBookedConsultationsHigh * V;
      return { low, high };
    }
    case 'no_show_recovery': {
      const noShowGap = getCalculationFactor('no_show_rate_band', answers.no_show_rate_band ?? 'under_5');
      const recoverable = getCalculationFactor('missed_appointment_recovery', answers.missed_appointment_recovery ?? 'automated_multichannel');
      const missedAppointments = I * B * N;
      const recoveryRate = clamp(noShowGap * 0.6 + recoverable * 0.8, 0, 0.4);
      const recoveredNoShowsLow = missedAppointments * recoveryRate * 0.35;
      const recoveredNoShowsHigh = missedAppointments * recoveryRate * 0.55;
      const low = recoveredNoShowsLow * V;
      const high = recoveredNoShowsHigh * V;
      return { low, high };
    }
    case 'treatment_recall': {
      const recallGap = getCalculationFactor('treatment_recall_process', answers.treatment_recall_process ?? 'automated_personalized');
      const estimatedTreatedPatients = I * B * (1 - N) * 0.9;
      const recalledPatientsLow = estimatedTreatedPatients * recallGap * 0.1;
      const recalledPatientsHigh = estimatedTreatedPatients * recallGap * 0.18;
      const low = recalledPatientsLow * V;
      const high = recalledPatientsHigh * V;
      return { low, high };
    }
    case 'patient_reactivation': {
      const reactivateGap = getCalculationFactor('reactivation_process', answers.reactivation_process ?? 'monthly_or_always_on');
      const reactivatedPatientsLow = dormantPool * reactivateGap * 0.008;
      const reactivatedPatientsHigh = dormantPool * reactivateGap * 0.014;
      const low = reactivatedPatientsLow * V;
      const high = reactivatedPatientsHigh * V;
      return { low, high };
    }
    default:
      return { low: 0, high: 0 };
  }
}

function scoreFromQuestion(questionKey: string, answers: AssessmentAnswers) {
  if (questionKey === 'location_count_band' || questionKey === 'monthly_inquiry_band' || questionKey === 'average_value_band') return 0;
  const value = answers[questionKey as keyof AssessmentAnswers];
  if (!value || typeof value !== 'string') return 0;
  return getScorePoints(questionKey, value);
}

function getQuestionMaxScore(questionKey: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options = (assessmentQuestionOptions as Record<string, readonly any[]>)[questionKey];
  return Math.max(...options.map((option) => option.score_points));
}

function getPositiveFinding(questionKey: string, answerValue: string) {
  const option = findOption(questionKey, answerValue);
  if (!option) return null;
  const max = getQuestionMaxScore(questionKey);
  if (max === 0 || option.score_points <= max * 0.25) {
    return `Strong response on ${assessmentQuestionLabels[questionKey] ?? questionKey}.`;
  }
  return null;
}

function computeRoutingSignals(answers: AssessmentAnswers, locationCount: number, monthlyInquiries: number, recoveryScore: number) {
  let routingPoints = 0;
  if (locationCount >= 2) routingPoints += 2;
  if (locationCount >= 4) routingPoints += 4;
  if (locationCount >= 10) routingPoints += 6;
  if (monthlyInquiries >= 100 && monthlyInquiries <= 199) routingPoints += 2;
  if (monthlyInquiries >= 200 && monthlyInquiries <= 399) routingPoints += 4;
  if (monthlyInquiries >= 400) routingPoints += 6;
  const q4Score = scoreFromQuestion('missed_call_handling', answers);
  if (q4Score >= 10) routingPoints += 3;
  const q6Score = scoreFromQuestion('after_hours_coverage', answers);
  if (q6Score >= 7) routingPoints += 3;
  if (recoveryScore >= 75) routingPoints += 4;
  else if (recoveryScore >= 50) routingPoints += 2;
  const q12Score = scoreFromQuestion('reactivation_process', answers);
  if (q12Score >= 6) routingPoints += 2;
  const q15Score = scoreFromQuestion('reporting_visibility', answers);
  if (q15Score >= 5) routingPoints += 2;
  const membershipValue = answers.membership_package_maturity;
  if (membershipValue === 'yes_manual' || membershipValue === 'planning') routingPoints += 2;
  if (membershipValue === 'yes_underperforming') routingPoints += 3;
  return routingPoints;
}

function pickPackage(answers: AssessmentAnswers, locationCount: number, monthlyInquiries: number, recoveryScore: number, routingPoints: number) {
  if (locationCount >= 10) return 'manual_sales_review';
  if (routingPoints >= 8) return 'ai_revenue_command_center_999';
  if (locationCount >= 2 && routingPoints >= 5) return 'ai_revenue_command_center_999';
  return 'lead_revenue_recovery_599';
}

function isHotLead(recoveryScore: number, opportunityLow: number, recommendedPackage: string, locationCount: number, priorCampaignOpener = false) {
  if (recoveryScore >= 75) return true;
  if (opportunityLow >= 10000) return true;
  if (recommendedPackage === 'ai_revenue_command_center_999' && opportunityLow >= 7500) return true;
  if (locationCount >= 4) return true;
  if (priorCampaignOpener && recoveryScore >= 60) return true;
  return false;
}

export function calculateAssessmentResult({
  answers,
  contact,
  editedAssumptions,
  formulaVersion,
  benchmarkVersion,
}: {
  answers: AssessmentAnswers;
  contact: { email: string; phone: string; website: string; priorCampaignOpener?: boolean };
  editedAssumptions?: EditedAssumptions;
  formulaVersion: string;
  benchmarkVersion: string;
}): AssessmentResult {
  const locationOption = findOption('location_count_band', answers.location_count_band ?? 'one');
  const inquiryOption = findOption('monthly_inquiry_band', answers.monthly_inquiry_band ?? 'under_25');
  const valueOption = findOption('average_value_band', answers.average_value_band ?? 'under_250');
  const locationCount = locationOption ? Number(locationOption.calculation_factor) : 1;
  const monthlyInquiries = editedAssumptions?.monthlyInquiries ?? (inquiryOption ? Number(inquiryOption.calculation_factor) : 18);
  const averageValue = editedAssumptions?.averageValue ?? (valueOption ? Number(valueOption.calculation_factor) : 175);
  const bookingRate = editedAssumptions?.bookingRate ?? getCalculationFactor('inquiry_booking_rate_band', answers.inquiry_booking_rate_band ?? '70_plus');
  const noShowRate = editedAssumptions?.noShowRate ?? getCalculationFactor('no_show_rate_band', answers.no_show_rate_band ?? 'under_5');
  const dormantPool = editedAssumptions?.dormantPool ?? Math.min(1500, Math.max(50, monthlyInquiries * 12 * 1.5));

  const answerKeys = [
    'missed_call_handling',
    'digital_response_time',
    'after_hours_coverage',
    'inquiry_booking_rate_band',
    'unbooked_lead_followup',
    'no_show_rate_band',
    'missed_appointment_recovery',
    'treatment_recall_process',
    'reactivation_process',
    'membership_package_maturity',
    'review_request_process',
    'reporting_visibility',
  ] as const;

  const recoveryScore = answerKeys.reduce((sum, key) => sum + scoreFromQuestion(key, answers), 0);
  const recoveryLevel = getRecoveryLevel(recoveryScore);

  const categorySeverities: Record<string, number> = {};
  const categorySeverityLabels: Record<string, string> = {};
  const categories: LeakCategory[] = categoryDefinitions.map((category) => {
    const points = category.questions.reduce((sum, questionKey) => sum + scoreFromQuestion(questionKey, answers), 0);
    const maxPoints = category.questions.reduce((sum, questionKey) => sum + getQuestionMaxScore(questionKey), 0);
    const ratio = maxPoints > 0 ? points / maxPoints : 0;
    const { low, high } = getCategoryEstimate(category.key, answers, { I: monthlyInquiries, V: averageValue, B: bookingRate, N: noShowRate, dormantPool });
    const severityWeightedLow = low * ratio;
    const severityWeightedHigh = high * ratio;
    categorySeverities[category.key] = ratio;
    categorySeverityLabels[category.key] = getCategorySeverityLabel(ratio);
    return {
      key: category.key,
      label: category.label,
      score: points,
      maxScore: maxPoints,
      ratio,
      severityLabel: getCategorySeverityLabel(ratio),
      estimatedLow: severityWeightedLow,
      estimatedHigh: severityWeightedHigh,
    };
  });

  const rawLow = categories.reduce((sum, category) => sum + category.estimatedLow, 0);
  const rawHigh = categories.reduce((sum, category) => sum + category.estimatedHigh, 0);
  const adjustedLow = rawLow * 0.62;
  const adjustedHigh = rawHigh * 0.68;
  const monthlyRevenueProxy = monthlyInquiries * Math.max(bookingRate, 0.25) * averageValue;
  const maxLow = monthlyRevenueProxy * 0.2;
  const maxHigh = monthlyRevenueProxy * 0.3;
  const opportunityLow = Math.max(0, Math.min(adjustedLow, maxLow));
  const opportunityHigh = Math.max(opportunityLow, Math.min(adjustedHigh, maxHigh));
  const roundedLow = roundOpportunity(opportunityLow);
  const roundedHigh = roundOpportunity(opportunityHigh);

  const sortedLeaks = [...categories].sort((a, b) => {
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    const impactA = a.estimatedLow + a.estimatedHigh;
    const impactB = b.estimatedLow + b.estimatedHigh;
    if (impactB !== impactA) return impactB - impactA;
    return a.label.localeCompare(b.label);
  });

  const topLeaks = sortedLeaks.slice(0, 3);
  const positiveFindings = [] as string[];
  for (const questionKey of ['location_count_band','monthly_inquiry_band','average_value_band',...answerKeys]) {
    const answer = answers[questionKey as keyof AssessmentAnswers];
    if (typeof answer === 'string') {
      const finding = getPositiveFinding(questionKey as keyof AssessmentAnswers, answer);
      if (finding) positiveFindings.push(finding);
    }
    if (positiveFindings.length >= 3) break;
  }
  for (const leak of categories) {
    if (positiveFindings.length >= 3) break;
    if (leak.ratio < 0.25) positiveFindings.push(`Strong performance in ${leak.label}.`);
  }
  if (positiveFindings.length < 3) {
    if ((answers.review_request_process ?? 'automated_multichannel') === 'automated_multichannel') {
      positiveFindings.push('Your review-request process is already well structured.');
    }
    if ((answers.reporting_visibility ?? 'full_visibility') === 'full_visibility') {
      positiveFindings.push('Your team has strong visibility into the patient journey.');
    }
    if ((answers.membership_package_maturity ?? 'yes_automated') === 'yes_automated') {
      positiveFindings.push('Your membership and package nurture process is already a strength.');
    }
  }

  const routingScore = computeRoutingSignals(answers, locationCount, monthlyInquiries, recoveryScore);
  const recommendedPackage = pickPackage(answers, locationCount, monthlyInquiries, recoveryScore, routingScore);
  const packageJustification = packageOptions[recommendedPackage].description;
  const accountValueScore = Math.min(100, Math.round((locationCount >= 10 ? 6 : locationCount >= 4 ? 4 : locationCount >= 2 ? 2 : 0) + (monthlyInquiries >= 400 ? 6 : monthlyInquiries >= 200 ? 4 : monthlyInquiries >= 100 ? 2 : 0)));
  const salesReadinessScore = Math.min(100, recoveryScore);

  let confidenceScore = 100;
  if (answers.inquiry_booking_rate_band === 'unknown') confidenceScore -= 10;
  if (answers.no_show_rate_band === 'unknown') confidenceScore -= 10;
  if (inquiryOption?.value === '400_plus') confidenceScore -= 10;
  if (valueOption?.value === '2000_plus') confidenceScore -= 10;
  if (!contact.website) confidenceScore -= 10;
  if (!contact.email || !contact.phone) confidenceScore -= 10;
  if (editedAssumptions) {
    const editedCount = Object.values(editedAssumptions).filter((value) => typeof value === 'number').length;
    if (editedCount > 3) confidenceScore -= 10;
  }
  confidenceScore = Math.max(0, Math.min(100, confidenceScore));
  const confidenceLevel = getConfidenceLevel(confidenceScore);

  const primaryLeak = topLeaks[0]?.label ?? '';
  const secondaryLeak = topLeaks[1]?.label;
  const thirdLeak = topLeaks[2]?.label;

  return {
    recoveryScore,
    recoveryLevel,
    opportunityLow: roundedLow,
    opportunityHigh: roundedHigh,
    confidenceScore,
    confidenceLevel,
    categorySeverityLabels,
    topLeaks,
    positiveFindings: Array.from(new Set(positiveFindings)).slice(0, 3),
    recommendedPackage,
    packageJustification,
    routingScore,
    accountValueScore,
    salesReadinessScore,
    isHotLead: isHotLead(recoveryScore, roundedLow, recommendedPackage, locationCount, Boolean(contact.priorCampaignOpener)),
    formulaVersion,
    benchmarkVersion,
    primaryLeak,
    secondaryLeak,
    thirdLeak,
    calculationSnapshot: {
      scoreBreakdown: answerKeys.reduce((memo, key) => ({ ...memo, [key]: scoreFromQuestion(key, answers) }), {} as Record<string, number>),
      categorySeverity: Object.fromEntries(Object.entries(categorySeverities)) as Record<string, number>,
      opportunity: {
        rawLow: formatMoney(rawLow),
        rawHigh: formatMoney(rawHigh),
        adjustedLow: formatMoney(adjustedLow),
        adjustedHigh: formatMoney(adjustedHigh),
        capLow: formatMoney(maxLow),
        capHigh: formatMoney(maxHigh),
        finalLow: formatMoney(roundedLow),
        finalHigh: formatMoney(roundedHigh),
      },
      assumptions: {
        inquiries: monthlyInquiries,
        value: averageValue,
        bookingRate,
        noShowRate,
        dormantPool,
      },
    },
  };
}
