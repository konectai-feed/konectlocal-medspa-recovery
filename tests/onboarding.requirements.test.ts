import { describe, expect, it } from 'vitest';
import { calculateCompletion, getRequiredFields, normalizePackageKey } from '@/lib/onboarding/requirements';

describe('onboarding requirements and completion', () => {
  it('normalizes supported package keys', () => {
    expect(normalizePackageKey('recovery')).toBe('recovery');
    expect(normalizePackageKey('lead_revenue_recovery')).toBe('recovery');
    expect(normalizePackageKey('command_center')).toBe('command_center');
    expect(normalizePackageKey('ai_revenue_command_center')).toBe('command_center');
  });

  it('requires enterprise acknowledgment for 10+ command center locations', () => {
    const low = getRequiredFields('command_center', 3);
    const high = getRequiredFields('command_center', 12);
    expect(low.compliance_approvals.includes('enterprise_activation_review_acknowledged')).toBe(false);
    expect(high.compliance_approvals.includes('enterprise_activation_review_acknowledged')).toBe(true);
  });

  it('calculates missing required fields and completion percentage server-side', () => {
    const result = calculateCompletion({
      packageKey: 'recovery',
      locationCount: 1,
      responses: {
        business_information: {
          legal_business_name: 'Spa LLC',
          public_business_name: 'Glow Spa',
        },
      },
    });

    expect(result.isComplete).toBe(false);
    expect(result.completionPercent).toBeGreaterThan(0);
    expect(result.completionPercent).toBeLessThan(100);
    expect(result.missingBySection.business_information.length).toBeGreaterThan(0);
  });

  it('marks completion only when all required fields are present', () => {
    const allFilled = {
      business_information: {
        legal_business_name: 'A', public_business_name: 'B', website: 'C', primary_location_address: 'D', city: 'E', state: 'F', zip_code: 'G', timezone: 'H', number_of_locations: 1, primary_contact_name: 'I', primary_contact_email: 'J', primary_contact_phone: 'K',
      },
      practice_profile: {
        treatments_services: 'A', highest_value_services: 'B', providers: 'C', provider_count: 2, average_monthly_inquiries: 100, approx_consultation_volume: 50, approx_monthly_appointments: 30, average_transaction_value: 300, memberships_offered: 'yes', packages_offered: 'yes', financing_offered: 'yes', current_booking_process: 'manual',
        module_digital_inquiry_capture: 'yes', module_web_chat: 'yes', module_lead_routing: 'yes', module_consultation_follow_up: 'yes', module_patient_recall: 'yes', module_review_workflow: 'yes', module_local_visibility_setup: 'yes', module_crm_inbox_preparation: 'yes', module_executive_reporting_preparation: 'yes',
      },
      lead_communications: {
        primary_business_phone: '1', missed_call_process: '2', after_hours_process: '3', current_crm: '4', current_booking_software: '5', current_website_chat: '6', sms_provider: '7', email_platform: '8', call_tracking_provider: '9', current_lead_sources: '10', current_lead_response_owner: '11', normal_response_time: '12', preferred_escalation_contacts: '13',
      },
      patient_recovery_workflows: {
        consultation_follow_up_process: '1', no_show_process: '2', cancellation_process: '3', overdue_patient_process: '4', dormant_patient_process: '5', treatment_series_completion_process: '6', membership_renewal_process: '7', review_request_process: '8', recall_intervals: '9', desired_reactivation_segments: '10',
      },
      accounts_access: {
        google_business_profile_access_status: '1', facebook_access_status: '2', instagram_access_status: '3', website_cms_access_status: '4', domain_dns_access_status: '5', booking_platform_access_status: '6', crm_access_status: '7', phone_system_access_status: '8', patient_list_import_status: '9', secure_credential_exchange_method: '10',
      },
      compliance_approvals: {
        consent_onboarding_communications: '1', authorization_configure_systems: '2', business_hours_confirmation: '3', escalation_approval: '4', messaging_tone_approval: '5', patient_data_handling_acknowledgment: '6', hipaa_sensitive_data_warning_acknowledged: '7', launch_approval_contact: '8', digital_signature_name: '9', submitted_timestamp: '10',
      },
    };

    const result = calculateCompletion({ packageKey: 'recovery', locationCount: 1, responses: allFilled });
    expect(result.isComplete).toBe(true);
    expect(result.completionPercent).toBe(100);
  });
});
