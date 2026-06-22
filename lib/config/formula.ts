export const approvedFormulaConfig = {
  version: 'medspa-v1.0.0',
  questions: [
    { key: 'missed_call_handling', weight: 12 },
    { key: 'digital_response_time', weight: 12 },
    { key: 'after_hours_coverage', weight: 8 },
    { key: 'inquiry_booking_rate_band', weight: 10 },
    { key: 'unbooked_lead_followup', weight: 10 },
    { key: 'no_show_rate_band', weight: 8 },
    { key: 'missed_appointment_recovery', weight: 8 },
    { key: 'treatment_recall_process', weight: 8 },
    { key: 'reactivation_process', weight: 8 },
    { key: 'membership_package_maturity', weight: 4 },
    { key: 'review_request_process', weight: 6 },
    { key: 'reporting_visibility', weight: 6 },
  ],
} as const;
