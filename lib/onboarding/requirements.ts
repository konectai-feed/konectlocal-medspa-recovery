import type { CompletionResult, OnboardingDraftInput, OnboardingSectionKey, PackageKey } from '@/lib/onboarding/types';

const COMMON_REQUIRED: Record<OnboardingSectionKey, string[]> = {
  business_information: [
    'legal_business_name',
    'public_business_name',
    'website',
    'primary_location_address',
    'city',
    'state',
    'zip_code',
    'timezone',
    'number_of_locations',
    'primary_contact_name',
    'primary_contact_email',
    'primary_contact_phone',
  ],
  practice_profile: [
    'treatments_services',
    'highest_value_services',
    'providers',
    'provider_count',
    'average_monthly_inquiries',
    'approx_consultation_volume',
    'approx_monthly_appointments',
    'average_transaction_value',
    'memberships_offered',
    'packages_offered',
    'financing_offered',
    'current_booking_process',
  ],
  lead_communications: [
    'primary_business_phone',
    'missed_call_process',
    'after_hours_process',
    'current_crm',
    'current_booking_software',
    'current_website_chat',
    'sms_provider',
    'email_platform',
    'call_tracking_provider',
    'current_lead_sources',
    'current_lead_response_owner',
    'normal_response_time',
    'preferred_escalation_contacts',
  ],
  patient_recovery_workflows: [
    'consultation_follow_up_process',
    'no_show_process',
    'cancellation_process',
    'overdue_patient_process',
    'dormant_patient_process',
    'treatment_series_completion_process',
    'membership_renewal_process',
    'review_request_process',
    'recall_intervals',
    'desired_reactivation_segments',
  ],
  accounts_access: [
    'google_business_profile_access_status',
    'facebook_access_status',
    'instagram_access_status',
    'website_cms_access_status',
    'domain_dns_access_status',
    'booking_platform_access_status',
    'crm_access_status',
    'phone_system_access_status',
    'patient_list_import_status',
    'secure_credential_exchange_method',
  ],
  compliance_approvals: [
    'consent_onboarding_communications',
    'authorization_configure_systems',
    'business_hours_confirmation',
    'escalation_approval',
    'messaging_tone_approval',
    'patient_data_handling_acknowledgment',
    'hipaa_sensitive_data_warning_acknowledged',
    'launch_approval_contact',
    'digital_signature_name',
    'submitted_timestamp',
  ],
};

const RECOVERY_REQUIRED = [
  'module_digital_inquiry_capture',
  'module_web_chat',
  'module_lead_routing',
  'module_consultation_follow_up',
  'module_patient_recall',
  'module_review_workflow',
  'module_local_visibility_setup',
  'module_crm_inbox_preparation',
  'module_executive_reporting_preparation',
];

const COMMAND_CENTER_REQUIRED = [
  ...RECOVERY_REQUIRED,
  'module_ai_voice_preparation',
  'module_call_routing',
  'module_after_hours_handling',
  'module_no_show_recovery',
  'module_cancellation_recovery',
  'module_dormant_patient_reactivation',
  'module_treatment_series_completion',
  'module_membership_nurture',
  'module_advanced_routing',
  'module_deeper_reporting_configuration',
];

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function normalizePackageKey(input: string): PackageKey {
  const normalized = input.trim().toLowerCase();
  if (normalized === 'recovery' || normalized === 'lead_revenue_recovery') return 'recovery';
  if (normalized === 'command_center' || normalized === 'ai_revenue_command_center') return 'command_center';
  throw new Error(`Unsupported onboarding package: ${input}`);
}

export function getRequiredFields(packageKey: PackageKey, locationCount: number) {
  const fields: Record<OnboardingSectionKey, string[]> = {
    business_information: [...COMMON_REQUIRED.business_information],
    practice_profile: [...COMMON_REQUIRED.practice_profile],
    lead_communications: [...COMMON_REQUIRED.lead_communications],
    patient_recovery_workflows: [...COMMON_REQUIRED.patient_recovery_workflows],
    accounts_access: [...COMMON_REQUIRED.accounts_access],
    compliance_approvals: [...COMMON_REQUIRED.compliance_approvals],
  };

  const packageFields = packageKey === 'command_center' ? COMMAND_CENTER_REQUIRED : RECOVERY_REQUIRED;
  fields.practice_profile.push(...packageFields);

  if (packageKey === 'command_center' && locationCount >= 10) {
    fields.compliance_approvals.push('enterprise_activation_review_acknowledged');
  }

  return fields;
}

export function calculateCompletion(input: {
  packageKey: PackageKey;
  locationCount: number;
  responses: OnboardingDraftInput;
}): CompletionResult {
  const requiredFields = getRequiredFields(input.packageKey, input.locationCount);
  const missingBySection: Record<OnboardingSectionKey, string[]> = {
    business_information: [],
    practice_profile: [],
    lead_communications: [],
    patient_recovery_workflows: [],
    accounts_access: [],
    compliance_approvals: [],
  };

  let totalRequired = 0;
  let completed = 0;

  for (const [section, fields] of Object.entries(requiredFields) as [OnboardingSectionKey, string[]][]) {
    for (const field of fields) {
      totalRequired += 1;
      const value = input.responses[section]?.[field];
      if (hasValue(value)) {
        completed += 1;
      } else {
        missingBySection[section].push(field);
      }
    }
  }

  const completionPercent = totalRequired === 0 ? 0 : Math.min(100, Math.round((completed / totalRequired) * 100));

  return {
    completionPercent,
    missingBySection,
    isComplete: Object.values(missingBySection).every((missing) => missing.length === 0),
  };
}
