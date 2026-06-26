import type { ActivationTaskDefinition, PackageKey } from '@/lib/onboarding/types';

const COMMON_TASKS: ActivationTaskDefinition[] = [
  { taskKey: 'verify_payment_subscription', category: 'verification', title: 'Verify payment and subscription', description: 'Confirm Stripe payment and active subscription state.', required: true },
  { taskKey: 'verify_business_information', category: 'verification', title: 'Verify business information', description: 'Validate legal/public business profile and location data.', required: true },
  { taskKey: 'verify_primary_contact', category: 'verification', title: 'Verify primary contact', description: 'Confirm contact identity and escalation path.', required: true },
  { taskKey: 'review_assessment', category: 'review', title: 'Review assessment', description: 'Review assessment score bands and opportunity range.', required: true },
  { taskKey: 'review_onboarding_responses', category: 'review', title: 'Review onboarding responses', description: 'Check completeness and quality of onboarding answers.', required: true },
  { taskKey: 'validate_connected_systems', category: 'configuration', title: 'Validate connected systems', description: 'Validate CRM, booking, and communication systems.', required: true },
  { taskKey: 'confirm_business_hours', category: 'configuration', title: 'Confirm business hours', description: 'Confirm business operating schedule and after-hours expectations.', required: true },
  { taskKey: 'confirm_lead_routing_contacts', category: 'configuration', title: 'Confirm lead-routing contacts', description: 'Confirm owner and escalation contacts for lead routing.', required: true },
  { taskKey: 'confirm_booking_flow', category: 'configuration', title: 'Confirm booking flow', description: 'Confirm intake to booking conversion path.', required: true },
  { taskKey: 'confirm_messaging_tone', category: 'configuration', title: 'Confirm messaging tone', description: 'Validate approved communication tone and constraints.', required: true },
  { taskKey: 'confirm_review_workflow', category: 'configuration', title: 'Confirm review workflow', description: 'Confirm review request and follow-up process.', required: true },
  { taskKey: 'confirm_reporting_recipients', category: 'configuration', title: 'Confirm reporting recipients', description: 'Confirm who receives launch and performance reporting.', required: true },
  { taskKey: 'prepare_vendasta_account_payload', category: 'provisioning', title: 'Prepare Vendasta account payload', description: 'Build dry-run account payload for provisioning.', required: true },
  { taskKey: 'prepare_vendasta_product_payload', category: 'provisioning', title: 'Prepare product activation payload', description: 'Build dry-run package activation payload.', required: true },
  { taskKey: 'perform_quality_assurance', category: 'qa', title: 'Perform quality assurance', description: 'Execute launch-readiness QA checklist.', required: true },
  { taskKey: 'obtain_launch_approval', category: 'approval', title: 'Obtain launch approval', description: 'Capture explicit authorized launch approval.', required: true },
];

const RECOVERY_TASKS: ActivationTaskDefinition[] = [
  { taskKey: 'recovery_web_chat_preparation', category: 'package', title: 'Web chat preparation', description: 'Prepare web chat workflows and fallback handling.', required: true },
  { taskKey: 'recovery_inquiry_routing', category: 'package', title: 'Digital inquiry routing', description: 'Configure inbound digital inquiry routing.', required: true },
  { taskKey: 'recovery_consultation_nurture', category: 'package', title: 'Consultation nurture', description: 'Prepare consultation follow-up and nurture sequence.', required: true },
  { taskKey: 'recovery_recall_workflow', category: 'package', title: 'Recall workflow', description: 'Prepare patient recall workflow settings.', required: true },
  { taskKey: 'recovery_reputation_workflow', category: 'package', title: 'Reputation workflow', description: 'Prepare review and reputation automation.', required: true },
  { taskKey: 'recovery_local_visibility_setup', category: 'package', title: 'Local visibility setup', description: 'Prepare local visibility implementation checklist.', required: true },
];

const COMMAND_CENTER_TASKS: ActivationTaskDefinition[] = [
  { taskKey: 'command_center_voice_configuration', category: 'package', title: 'Voice configuration', description: 'Prepare AI voice and call handling settings.', required: true },
  { taskKey: 'command_center_call_routing', category: 'package', title: 'Call routing', description: 'Prepare command center call routing topology.', required: true },
  { taskKey: 'command_center_after_hours', category: 'package', title: 'After-hours handling', description: 'Prepare after-hours routing and handoff rules.', required: true },
  { taskKey: 'command_center_no_show', category: 'package', title: 'No-show workflow', description: 'Prepare no-show recovery workflow settings.', required: true },
  { taskKey: 'command_center_cancellation', category: 'package', title: 'Cancellation workflow', description: 'Prepare cancellation recovery workflow settings.', required: true },
  { taskKey: 'command_center_dormant_patient', category: 'package', title: 'Dormant-patient workflow', description: 'Prepare dormant patient reactivation settings.', required: true },
  { taskKey: 'command_center_membership_nurture', category: 'package', title: 'Membership nurture', description: 'Prepare membership lifecycle nurture settings.', required: true },
  { taskKey: 'command_center_advanced_escalation', category: 'package', title: 'Advanced escalation', description: 'Prepare advanced escalation and exception routing.', required: true },
  { taskKey: 'command_center_multi_location_routing', category: 'package', title: 'Multi-location routing', description: 'Prepare enterprise routing for multi-location accounts.', required: true },
];

export function getActivationTaskDefinitions(packageKey: PackageKey, locationCount: number) {
  const packageTasks = packageKey === 'command_center'
    ? [...RECOVERY_TASKS, ...COMMAND_CENTER_TASKS]
    : [...RECOVERY_TASKS];

  if (packageKey === 'command_center' && locationCount < 10) {
    return [...COMMON_TASKS, ...packageTasks.filter((task) => task.taskKey !== 'command_center_multi_location_routing')];
  }

  return [...COMMON_TASKS, ...packageTasks];
}
