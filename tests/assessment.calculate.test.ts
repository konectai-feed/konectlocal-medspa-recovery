import { describe, expect, it } from 'vitest';
import { calculateAssessmentResult } from '@/lib/assessment/calculate';
import type { AssessmentAnswers } from '@/lib/assessment/types';

function buildContact() {
  return {
    email: 'owner@example.com',
    phone: '5555551212',
    website: 'https://example.com',
  };
}

function calculate(answers: AssessmentAnswers) {
  return calculateAssessmentResult({
    answers,
    contact: buildContact(),
    formulaVersion: 'test',
    benchmarkVersion: 'test',
  });
}

describe('assessment revenue opportunity calibration', () => {
  const strongPerformer: AssessmentAnswers = {
    location_count_band: 'one',
    monthly_inquiry_band: '50_99',
    average_value_band: '250_499',
    missed_call_handling: 'live_backup',
    digital_response_time: 'under_5_min',
    after_hours_coverage: 'full_coverage',
    inquiry_booking_rate_band: '70_plus',
    unbooked_lead_followup: 'multichannel_sequence',
    no_show_rate_band: 'under_5',
    missed_appointment_recovery: 'automated_multichannel',
    treatment_recall_process: 'automated_personalized',
    reactivation_process: 'monthly_or_always_on',
    membership_package_maturity: 'yes_automated',
    review_request_process: 'automated_multichannel',
    reporting_visibility: 'full_visibility',
  };

  const moderateLeak: AssessmentAnswers = {
    location_count_band: 'two_three',
    monthly_inquiry_band: '100_199',
    average_value_band: '500_999',
    missed_call_handling: 'voicemail_same_day',
    digital_response_time: '1_4_hours',
    after_hours_coverage: 'next_business_day',
    inquiry_booking_rate_band: '55_69',
    unbooked_lead_followup: 'inconsistent',
    no_show_rate_band: '10_14',
    missed_appointment_recovery: 'inconsistent',
    treatment_recall_process: 'manual_inconsistent',
    reactivation_process: 'rarely',
    membership_package_maturity: 'yes_manual',
    review_request_process: 'manual_consistent',
    reporting_visibility: 'multiple_systems',
  };

  const severeLeak: AssessmentAnswers = {
    location_count_band: 'one',
    monthly_inquiry_band: '50_99',
    average_value_band: '250_499',
    missed_call_handling: 'often_lost',
    digital_response_time: 'next_day_or_inconsistent',
    after_hours_coverage: 'no_process',
    inquiry_booking_rate_band: '40_54',
    unbooked_lead_followup: 'none',
    no_show_rate_band: '15_24',
    missed_appointment_recovery: 'none',
    treatment_recall_process: 'none',
    reactivation_process: 'rarely',
    membership_package_maturity: 'yes_underperforming',
    review_request_process: 'manual_inconsistent',
    reporting_visibility: 'limited',
  };

  it('keeps a small low-volume med spa directional and conservative', () => {
    const result = calculate({
      location_count_band: 'one',
      monthly_inquiry_band: 'under_25',
      average_value_band: 'under_250',
      missed_call_handling: 'voicemail_fast_callback',
      digital_response_time: '16_60_min',
      after_hours_coverage: 'basic_auto_reply',
      inquiry_booking_rate_band: '55_69',
      unbooked_lead_followup: 'one_or_two_touches',
      no_show_rate_band: '5_9',
      missed_appointment_recovery: 'one_followup',
      treatment_recall_process: 'manual_consistent',
      reactivation_process: 'few_times_year',
      membership_package_maturity: 'no',
      review_request_process: 'manual_consistent',
      reporting_visibility: 'mostly_connected',
    });

    expect(result.opportunityLow).toBeGreaterThan(0);
    expect(result.opportunityHigh).toBeLessThanOrEqual(700);
  });

  it('produces a realistic monthly opportunity for a medium-volume med spa with moderate leakage', () => {
    const result = calculate(moderateLeak);

    expect(result.opportunityLow).toBeGreaterThanOrEqual(2500);
    expect(result.opportunityHigh).toBeGreaterThan(result.opportunityLow);
    expect(result.opportunityHigh).toBeLessThanOrEqual(9000);
    expect(result.recommendedPackage).toBe('ai_revenue_command_center_999');
  });

  it('lands a defensible range for a high-leak 50 to 99 inquiry scenario without forcing a score floor', () => {
    const result = calculate(severeLeak);

    expect(result.recoveryScore).toBeGreaterThanOrEqual(80);
    expect(result.recoveryScore).toBeLessThanOrEqual(90);
    expect(result.opportunityLow).toBeGreaterThanOrEqual(1500);
    expect(result.opportunityLow).toBeLessThanOrEqual(3000);
    expect(result.opportunityHigh).toBeGreaterThanOrEqual(2500);
    expect(result.opportunityHigh).toBeLessThanOrEqual(3500);
  });

  it('scales appropriately for a multi-location med spa', () => {
    const result = calculate({
      location_count_band: 'four_nine',
      monthly_inquiry_band: '100_199',
      average_value_band: '500_999',
      missed_call_handling: 'often_lost',
      digital_response_time: 'same_day',
      after_hours_coverage: 'next_business_day',
      inquiry_booking_rate_band: '40_54',
      unbooked_lead_followup: 'inconsistent',
      no_show_rate_band: '15_24',
      missed_appointment_recovery: 'inconsistent',
      treatment_recall_process: 'manual_inconsistent',
      reactivation_process: 'rarely',
      membership_package_maturity: 'yes_underperforming',
      review_request_process: 'manual_inconsistent',
      reporting_visibility: 'limited',
    });

    expect(result.opportunityLow).toBeGreaterThanOrEqual(4000);
    expect(result.recommendedPackage).toBe('ai_revenue_command_center_999');
  });

  it('returns zero opportunity for a zero-leak strong-performing scenario', () => {
    const result = calculate(strongPerformer);

    expect(result.recoveryScore).toBe(0);
    expect(result.opportunityLow).toBe(0);
    expect(result.opportunityHigh).toBe(0);
  });

  it('increases opportunity monotonically as the same business moves from strong to moderate to severe leakage', () => {
    const strongResult = calculate(strongPerformer);
    const moderateResult = calculate({
      ...strongPerformer,
      missed_call_handling: 'voicemail_same_day',
      digital_response_time: '16_60_min',
      after_hours_coverage: 'basic_auto_reply',
      inquiry_booking_rate_band: '55_69',
      unbooked_lead_followup: 'one_or_two_touches',
      no_show_rate_band: '5_9',
      missed_appointment_recovery: 'one_followup',
      treatment_recall_process: 'manual_consistent',
      reactivation_process: 'few_times_year',
    });
    const severeResult = calculate({
      ...strongPerformer,
      missed_call_handling: 'often_lost',
      digital_response_time: 'next_day_or_inconsistent',
      after_hours_coverage: 'no_process',
      inquiry_booking_rate_band: '40_54',
      unbooked_lead_followup: 'none',
      no_show_rate_band: '15_24',
      missed_appointment_recovery: 'none',
      treatment_recall_process: 'none',
      reactivation_process: 'rarely',
    });

    expect(strongResult.opportunityHigh).toBeLessThanOrEqual(moderateResult.opportunityLow);
    expect(moderateResult.opportunityHigh).toBeLessThanOrEqual(severeResult.opportunityHigh);
    expect(strongResult.opportunityLow).toBeLessThanOrEqual(moderateResult.opportunityLow);
    expect(moderateResult.opportunityLow).toBeLessThanOrEqual(severeResult.opportunityLow);
  });
});