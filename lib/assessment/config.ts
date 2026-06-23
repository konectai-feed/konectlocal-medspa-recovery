import type { AssessmentQuestionOption } from './types';

export const assessmentQuestionOptions = {
  location_count_band: [
    { value: 'one', label: '1 location', score_points: 0, calculation_factor: 1, display_order: 1, active: true, routing_flags: [] },
    { value: 'two_three', label: '2–3 locations', score_points: 0, calculation_factor: 2, display_order: 2, active: true, routing_flags: ['command_center'] },
    { value: 'four_nine', label: '4–9 locations', score_points: 0, calculation_factor: 5, display_order: 3, active: true, routing_flags: ['strong_command_center'] },
    { value: 'ten_plus', label: '10+ locations', score_points: 0, calculation_factor: 10, display_order: 4, active: true, routing_flags: ['mandatory_sales_review'] },
  ] as const,
  monthly_inquiry_band: [
    { value: 'under_25', label: 'Fewer than 25', score_points: 0, calculation_factor: 18, display_order: 1, active: true },
    { value: '25_49', label: '25–49', score_points: 0, calculation_factor: 37, display_order: 2, active: true },
    { value: '50_99', label: '50–99', score_points: 0, calculation_factor: 75, display_order: 3, active: true },
    { value: '100_199', label: '100–199', score_points: 0, calculation_factor: 150, display_order: 4, active: true },
    { value: '200_399', label: '200–399', score_points: 0, calculation_factor: 300, display_order: 5, active: true },
    { value: '400_plus', label: '400+', score_points: 0, calculation_factor: 500, display_order: 6, active: true },
  ] as const,
  average_value_band: [
    { value: 'under_250', label: 'Under $250', score_points: 0, calculation_factor: 175, display_order: 1, active: true },
    { value: '250_499', label: '$250–$499', score_points: 0, calculation_factor: 375, display_order: 2, active: true },
    { value: '500_999', label: '$500–$999', score_points: 0, calculation_factor: 750, display_order: 3, active: true },
    { value: '1000_1999', label: '$1,000–$1,999', score_points: 0, calculation_factor: 1400, display_order: 4, active: true },
    { value: '2000_plus', label: '$2,000+', score_points: 0, calculation_factor: 2500, display_order: 5, active: true },
  ] as const,
  missed_call_handling: [
    { value: 'live_backup', label: 'Another person or service answers live', score_points: 0, calculation_factor: 0.03, display_order: 1, active: true },
    { value: 'instant_ai_or_text', label: 'Immediate automated response', score_points: 2, calculation_factor: 0.06, display_order: 2, active: true },
    { value: 'voicemail_fast_callback', label: 'Voicemail with callback within 15 minutes', score_points: 4, calculation_factor: 0.10, display_order: 3, active: true },
    { value: 'voicemail_same_day', label: 'Voicemail with callback later the same day', score_points: 8, calculation_factor: 0.18, display_order: 4, active: true },
    { value: 'voicemail_inconsistent', label: 'Voicemail with inconsistent follow-up', score_points: 10, calculation_factor: 0.25, display_order: 5, active: true },
    { value: 'often_lost', label: 'Calls are often missed or not tracked', score_points: 12, calculation_factor: 0.32, display_order: 6, active: true },
  ] as const,
  digital_response_time: [
    { value: 'under_5_min', label: 'Under 5 minutes', score_points: 0, calculation_factor: 0.03, display_order: 1, active: true },
    { value: '5_15_min', label: '5–15 minutes', score_points: 2, calculation_factor: 0.06, display_order: 2, active: true },
    { value: '16_60_min', label: '16–60 minutes', score_points: 5, calculation_factor: 0.12, display_order: 3, active: true },
    { value: '1_4_hours', label: '1–4 hours', score_points: 8, calculation_factor: 0.20, display_order: 4, active: true },
    { value: 'same_day', label: 'Later the same day', score_points: 10, calculation_factor: 0.28, display_order: 5, active: true },
    { value: 'next_day_or_inconsistent', label: 'Next day or inconsistent', score_points: 12, calculation_factor: 0.36, display_order: 6, active: true },
  ] as const,
  after_hours_coverage: [
    { value: 'full_coverage', label: 'Yes, calls and digital inquiries', score_points: 0, calculation_factor: 0.02, display_order: 1, active: true },
    { value: 'digital_only', label: 'Digital inquiries only', score_points: 2, calculation_factor: 0.06, display_order: 2, active: true },
    { value: 'basic_auto_reply', label: 'Basic auto-reply, no qualification', score_points: 4, calculation_factor: 0.10, display_order: 3, active: true },
    { value: 'next_business_day', label: 'Usually next business day', score_points: 7, calculation_factor: 0.18, display_order: 4, active: true },
    { value: 'no_process', label: 'No reliable after-hours process', score_points: 8, calculation_factor: 0.24, display_order: 5, active: true },
  ] as const,
  inquiry_booking_rate_band: [
    { value: '70_plus', label: '70% or more', score_points: 0, calculation_factor: 0.75, display_order: 1, active: true },
    { value: '55_69', label: '55–69%', score_points: 2, calculation_factor: 0.62, display_order: 2, active: true },
    { value: '40_54', label: '40–54%', score_points: 5, calculation_factor: 0.47, display_order: 3, active: true },
    { value: '25_39', label: '25–39%', score_points: 8, calculation_factor: 0.32, display_order: 4, active: true },
    { value: 'under_25', label: 'Under 25%', score_points: 10, calculation_factor: 0.20, display_order: 5, active: true },
    { value: 'unknown', label: 'We do not know', score_points: 8, calculation_factor: 0.32, display_order: 6, active: true },
  ] as const,
  unbooked_lead_followup: [
    { value: 'multichannel_sequence', label: 'Consistent multi-channel sequence', score_points: 0, calculation_factor: 0.04, display_order: 1, active: true },
    { value: 'several_manual_touches', label: 'Several manual follow-ups', score_points: 3, calculation_factor: 0.08, display_order: 2, active: true },
    { value: 'one_or_two_touches', label: 'One or two follow-ups', score_points: 6, calculation_factor: 0.14, display_order: 3, active: true },
    { value: 'inconsistent', label: 'Inconsistent follow-up', score_points: 8, calculation_factor: 0.20, display_order: 4, active: true },
    { value: 'none', label: 'No structured follow-up', score_points: 10, calculation_factor: 0.26, display_order: 5, active: true },
  ] as const,
  no_show_rate_band: [
    { value: 'under_5', label: 'Under 5%', score_points: 0, calculation_factor: 0.04, display_order: 1, active: true },
    { value: '5_9', label: '5–9%', score_points: 2, calculation_factor: 0.07, display_order: 2, active: true },
    { value: '10_14', label: '10–14%', score_points: 4, calculation_factor: 0.12, display_order: 3, active: true },
    { value: '15_24', label: '15–24%', score_points: 6, calculation_factor: 0.19, display_order: 4, active: true },
    { value: '25_plus', label: '25% or more', score_points: 8, calculation_factor: 0.28, display_order: 5, active: true },
    { value: 'unknown', label: 'We do not track it', score_points: 6, calculation_factor: 0.19, display_order: 6, active: true },
  ] as const,
  missed_appointment_recovery: [
    { value: 'automated_multichannel', label: 'Automated multi-channel rescheduling', score_points: 0, calculation_factor: 0.05, display_order: 1, active: true },
    { value: 'same_day_manual', label: 'Same-day manual follow-up', score_points: 2, calculation_factor: 0.09, display_order: 2, active: true },
    { value: 'one_followup', label: 'Usually one follow-up', score_points: 4, calculation_factor: 0.14, display_order: 3, active: true },
    { value: 'inconsistent', label: 'Inconsistent follow-up', score_points: 6, calculation_factor: 0.20, display_order: 4, active: true },
    { value: 'none', label: 'No defined recovery process', score_points: 8, calculation_factor: 0.26, display_order: 5, active: true },
  ] as const,
  treatment_recall_process: [
    { value: 'automated_personalized', label: 'Automated and treatment-specific', score_points: 0, calculation_factor: 0.03, display_order: 1, active: true },
    { value: 'automated_basic', label: 'Automated but mostly generic', score_points: 2, calculation_factor: 0.07, display_order: 2, active: true },
    { value: 'manual_consistent', label: 'Manual but consistent', score_points: 4, calculation_factor: 0.11, display_order: 3, active: true },
    { value: 'manual_inconsistent', label: 'Manual and inconsistent', score_points: 6, calculation_factor: 0.17, display_order: 4, active: true },
    { value: 'none', label: 'No structured recall process', score_points: 8, calculation_factor: 0.23, display_order: 5, active: true },
  ] as const,
  reactivation_process: [
    { value: 'monthly_or_always_on', label: 'Monthly or always-on', score_points: 0, calculation_factor: 0.02, display_order: 1, active: true },
    { value: 'quarterly', label: 'Quarterly', score_points: 2, calculation_factor: 0.05, display_order: 2, active: true },
    { value: 'few_times_year', label: 'A few times per year', score_points: 4, calculation_factor: 0.09, display_order: 3, active: true },
    { value: 'rarely', label: 'Rarely', score_points: 6, calculation_factor: 0.14, display_order: 4, active: true },
    { value: 'never', label: 'Never', score_points: 8, calculation_factor: 0.20, display_order: 5, active: true },
  ] as const,
  membership_package_maturity: [
    { value: 'yes_automated', label: 'Yes, with automated nurture and renewal', score_points: 0, calculation_factor: 0, display_order: 1, active: true, routing_flags: [] },
    { value: 'yes_manual', label: 'Yes, managed mostly manually', score_points: 2, calculation_factor: 0, display_order: 2, active: true, routing_flags: ['command_center'] },
    { value: 'yes_underperforming', label: 'Yes, but renewal is weak', score_points: 4, calculation_factor: 0, display_order: 3, active: true, routing_flags: ['strong_command_center'] },
    { value: 'no', label: 'No', score_points: 1, calculation_factor: 0, display_order: 4, active: true, routing_flags: [] },
    { value: 'planning', label: 'Planning to introduce them', score_points: 2, calculation_factor: 0, display_order: 5, active: true, routing_flags: ['command_center'] },
  ] as const,
  review_request_process: [
    { value: 'automated_multichannel', label: 'Automated by text and/or email', score_points: 0, calculation_factor: 0, display_order: 1, active: true },
    { value: 'automated_single_channel', label: 'Automated through one channel', score_points: 1, calculation_factor: 0, display_order: 2, active: true },
    { value: 'manual_consistent', label: 'Manual but consistent', score_points: 3, calculation_factor: 0, display_order: 3, active: true },
    { value: 'manual_inconsistent', label: 'Manual and inconsistent', score_points: 5, calculation_factor: 0, display_order: 4, active: true },
    { value: 'none', label: 'No defined review-request process', score_points: 6, calculation_factor: 0, display_order: 5, active: true },
  ] as const,
  reporting_visibility: [
    { value: 'full_visibility', label: 'Yes, in one connected view', score_points: 0, calculation_factor: 0, display_order: 1, active: true },
    { value: 'mostly_connected', label: 'Mostly, with minor gaps', score_points: 2, calculation_factor: 0, display_order: 2, active: true },
    { value: 'multiple_systems', label: 'Partially, across multiple systems', score_points: 4, calculation_factor: 0, display_order: 3, active: true },
    { value: 'limited', label: 'Very limited visibility', score_points: 5, calculation_factor: 0, display_order: 4, active: true },
    { value: 'none', label: 'No reliable attribution', score_points: 6, calculation_factor: 0, display_order: 5, active: true },
  ] as const,
};

export const assessmentQuestionKeys = [
  'location_count_band',
  'monthly_inquiry_band',
  'average_value_band',
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

export const assessmentQuestionGroups = [
  {
    title: 'Practice profile',
    steps: ['location_count_band', 'monthly_inquiry_band', 'average_value_band'] as const,
  },
  { title: 'Inquiry response', steps: ['missed_call_handling', 'digital_response_time', 'after_hours_coverage'] as const },
  { title: 'Consultation conversion', steps: ['inquiry_booking_rate_band', 'unbooked_lead_followup', 'no_show_rate_band', 'missed_appointment_recovery'] as const },
  { title: 'Patient retention', steps: ['treatment_recall_process', 'reactivation_process', 'membership_package_maturity'] as const },
  { title: 'Trust and reporting', steps: ['review_request_process', 'reporting_visibility'] as const },
] as const;

export const assessmentQuestionLabels: Record<string, string> = {
  location_count_band: 'Number of locations',
  monthly_inquiry_band: 'Monthly treatment inquiries',
  average_value_band: 'Average first treatment or package value',
  missed_call_handling: 'What happens when your team cannot answer a call?',
  digital_response_time: 'How quickly do website, social, and text inquiries receive a first response?',
  after_hours_coverage: 'Do after-hours inquiries receive an immediate response?',
  inquiry_booking_rate_band: 'Approximately what percentage of treatment inquiries book a consultation or appointment?',
  unbooked_lead_followup: 'What follow-up occurs when an inquiry does not book?',
  no_show_rate_band: 'What is your consultation no-show or late-cancellation rate?',
  missed_appointment_recovery: 'What happens after a consultation no-show or cancellation?',
  treatment_recall_process: 'How are patients reminded when they are due for another treatment?',
  reactivation_process: 'How often do you run dormant-patient reactivation campaigns?',
  membership_package_maturity: 'Does the practice sell memberships, treatment packages, or recurring plans?',
  review_request_process: 'How are review requests sent after a successful visit?',
  reporting_visibility: 'Can you see the journey from inquiry to consultation, treatment, and return visit?',
};

export const questionOptionMap = Object.fromEntries(
  Object.entries(assessmentQuestionOptions).map(([key, options]) => [key, options.map((option) => [option.value, option] as const)]),
) as Record<string, readonly [string, AssessmentQuestionOption][]>
;

export const categoryDefinitions = [
  { key: 'missed_inquiries', label: 'Missed inquiries', questions: ['missed_call_handling'] as const },
  { key: 'slow_response', label: 'Slow response', questions: ['digital_response_time'] as const },
  { key: 'after_hours', label: 'After-hours', questions: ['after_hours_coverage'] as const },
  { key: 'consultation_conversion', label: 'Consultation conversion', questions: ['inquiry_booking_rate_band'] as const },
  { key: 'unbooked_followup', label: 'Unbooked follow-up', questions: ['unbooked_lead_followup'] as const },
  { key: 'no_show_recovery', label: 'No-show recovery', questions: ['no_show_rate_band', 'missed_appointment_recovery'] as const },
  { key: 'treatment_recall', label: 'Treatment recall', questions: ['treatment_recall_process'] as const },
  { key: 'patient_reactivation', label: 'Patient reactivation', questions: ['reactivation_process'] as const },
  { key: 'membership_nurture', label: 'Membership nurture', questions: ['membership_package_maturity'] as const },
  { key: 'review_generation', label: 'Review generation', questions: ['review_request_process'] as const },
  { key: 'reporting_attribution', label: 'Reporting attribution', questions: ['reporting_visibility'] as const },
] as const;

export const confidenceBands = [
  { min: 80, label: 'High' },
  { min: 60, label: 'Medium' },
  { min: 0, label: 'Directional' },
] as const;

export const recoveryBands = [
  { min: 75, max: 100, label: 'Critical recovery opportunity' },
  { min: 50, max: 74, label: 'Significant revenue leakage' },
  { min: 25, max: 49, label: 'Moderate revenue leakage' },
  { min: 0, max: 24, label: 'Strong foundation' },
] as const;

export const packageOptions = {
  lead_revenue_recovery_599: { id: 'lead_revenue_recovery_599', name: 'Lead Revenue Recovery', price: 599, primary: true, description: 'A focused recovery system for inquiry and booking gaps.' },
  ai_revenue_command_center_999: { id: 'ai_revenue_command_center_999', name: 'AI Revenue Command Center', price: 999, primary: true, description: 'A premium command center for fast-growing med spas.' },
  manual_sales_review: { id: 'manual_sales_review', name: 'Manual Sales Review', price: 0, primary: false, description: 'Sales review for enterprise or multi-location practices.' },
} as const;

export const contactCaptureFields = [
  { name: 'firstName', label: 'First name', required: true },
  { name: 'lastName', label: 'Last name', required: true },
  { name: 'businessName', label: 'Business name', required: true },
  { name: 'email', label: 'Work email', required: true, type: 'email' },
  { name: 'phone', label: 'Phone', required: true, type: 'tel' },
  { name: 'website', label: 'Website', required: true, type: 'url' },
  { name: 'city', label: 'City', required: true },
  { name: 'state', label: 'State', required: true },
] as const;

export const consentText = 'I agree to receive email updates and future contact from KonectLocal about revenue recovery services.';
export const consentVersion = 'v1';

export const assessmentStepLabels = [
  'Practice profile',
  'Inquiry response',
  'Consultation conversion',
  'Contact information',
  'Patient retention',
  'Trust and reporting',
] as const;
