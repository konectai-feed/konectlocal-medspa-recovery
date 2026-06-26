import type { OnboardingStatus } from '@/lib/onboarding/types';

const ALLOWED_TRANSITIONS: Record<OnboardingStatus, OnboardingStatus[]> = {
  required: ['started', 'cancelled'],
  started: ['in_progress', 'cancelled'],
  in_progress: ['submitted', 'cancelled'],
  submitted: ['activation_review', 'cancelled'],
  activation_review: ['configuration', 'delayed', 'cancelled'],
  configuration: ['ready_for_launch', 'delayed', 'cancelled'],
  ready_for_launch: ['active', 'delayed', 'cancelled'],
  delayed: ['activation_review', 'cancelled'],
  active: [],
  cancelled: [],
};

export function getAllowedTransitions(status: OnboardingStatus) {
  return ALLOWED_TRANSITIONS[status];
}

export function canTransition(fromStatus: OnboardingStatus, toStatus: OnboardingStatus) {
  if (fromStatus === toStatus) return true;
  return ALLOWED_TRANSITIONS[fromStatus].includes(toStatus);
}

export function assertValidTransition(fromStatus: OnboardingStatus, toStatus: OnboardingStatus) {
  if (!canTransition(fromStatus, toStatus)) {
    throw new Error(`Invalid onboarding transition: ${fromStatus} -> ${toStatus}`);
  }
}
