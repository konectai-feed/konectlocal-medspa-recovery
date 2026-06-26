import type { LifecycleSyncAction, OnboardingStatus } from '@/lib/onboarding/types';

export function lifecycleActionForStatus(input: {
  status: OnboardingStatus;
  completionPercent: number;
  packageKey: string;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  locationCount: number;
  manualReviewRequired: boolean;
  launchDate: string | null;
}): LifecycleSyncAction {
  const baseAttributes = {
    CUSTOMER_STATUS: input.status,
    ACTIVATION_STATUS: input.status,
    ONBOARDING_STATUS: input.status,
    ONBOARDING_COMPLETION_PERCENT: input.completionPercent,
    PURCHASED_PACKAGE: input.packageKey,
    SUBSCRIPTION_STATUS: input.subscriptionStatus,
    STRIPE_CUSTOMER_ID: input.stripeCustomerId,
    LOCATION_COUNT: input.locationCount,
    MANUAL_REVIEW_REQUIRED: input.manualReviewRequired,
    LAUNCH_DATE: input.launchDate,
  };

  switch (input.status) {
    case 'required':
      return {
        addLists: ['BREVO_LIST_PURCHASED', 'BREVO_LIST_ONBOARDING_REQUIRED'],
        removeLists: ['BREVO_LIST_CHECKOUT_ABANDONED', 'BREVO_LIST_ASSESSMENT_ABANDONED'],
        attributes: baseAttributes,
      };
    case 'started':
    case 'in_progress':
      return {
        addLists: ['BREVO_LIST_ONBOARDING_STARTED'],
        removeLists: [],
        attributes: baseAttributes,
      };
    case 'submitted':
    case 'activation_review':
      return {
        addLists: ['BREVO_LIST_ONBOARDING_SUBMITTED', 'BREVO_LIST_ACTIVATION_REVIEW'],
        removeLists: ['BREVO_LIST_ONBOARDING_REQUIRED'],
        attributes: baseAttributes,
      };
    case 'configuration':
      return {
        addLists: ['BREVO_LIST_CONFIGURATION'],
        removeLists: ['BREVO_LIST_ACTIVATION_REVIEW'],
        attributes: baseAttributes,
      };
    case 'ready_for_launch':
      return {
        addLists: ['BREVO_LIST_READY_FOR_LAUNCH'],
        removeLists: ['BREVO_LIST_CONFIGURATION'],
        attributes: baseAttributes,
      };
    case 'active':
      return {
        addLists: ['BREVO_LIST_ACTIVE_CUSTOMERS'],
        removeLists: ['BREVO_LIST_READY_FOR_LAUNCH'],
        attributes: baseAttributes,
      };
    case 'delayed':
      return {
        addLists: ['BREVO_LIST_ACTIVATION_DELAYED'],
        removeLists: [],
        attributes: baseAttributes,
      };
    case 'cancelled':
      return {
        addLists: ['BREVO_LIST_CANCELLED_CUSTOMERS'],
        removeLists: [
          'BREVO_LIST_ONBOARDING_REQUIRED',
          'BREVO_LIST_ONBOARDING_STARTED',
          'BREVO_LIST_ONBOARDING_SUBMITTED',
          'BREVO_LIST_ACTIVATION_REVIEW',
          'BREVO_LIST_CONFIGURATION',
          'BREVO_LIST_READY_FOR_LAUNCH',
          'BREVO_LIST_ACTIVE_CUSTOMERS',
        ],
        attributes: baseAttributes,
      };
    default:
      return {
        addLists: [],
        removeLists: [],
        attributes: baseAttributes,
      };
  }
}
