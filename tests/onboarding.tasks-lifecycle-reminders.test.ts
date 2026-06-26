import { describe, expect, it } from 'vitest';
import { getActivationTaskDefinitions } from '@/lib/onboarding/tasks';
import { lifecycleActionForStatus } from '@/lib/onboarding/lifecycle';
import { shouldSendReminder } from '@/lib/onboarding/reminders';

describe('activation task generation', () => {
  it('includes common and recovery tasks for recovery package', () => {
    const tasks = getActivationTaskDefinitions('recovery', 1);
    expect(tasks.some((task) => task.taskKey === 'verify_payment_subscription')).toBe(true);
    expect(tasks.some((task) => task.taskKey === 'recovery_web_chat_preparation')).toBe(true);
    expect(tasks.some((task) => task.taskKey === 'command_center_voice_configuration')).toBe(false);
  });

  it('includes command center tasks and enterprise routing for 10+ locations', () => {
    const tasks = getActivationTaskDefinitions('command_center', 12);
    expect(tasks.some((task) => task.taskKey === 'command_center_voice_configuration')).toBe(true);
    expect(tasks.some((task) => task.taskKey === 'command_center_multi_location_routing')).toBe(true);
  });

  it('omits enterprise routing for smaller command center accounts', () => {
    const tasks = getActivationTaskDefinitions('command_center', 3);
    expect(tasks.some((task) => task.taskKey === 'command_center_multi_location_routing')).toBe(false);
  });
});

describe('brevo lifecycle mapping', () => {
  it('maps purchase-confirmed required state', () => {
    const action = lifecycleActionForStatus({
      status: 'required',
      completionPercent: 0,
      packageKey: 'recovery',
      stripeCustomerId: 'cus_123',
      subscriptionStatus: 'active',
      locationCount: 1,
      manualReviewRequired: false,
      launchDate: null,
    });

    expect(action.addLists).toContain('BREVO_LIST_PURCHASED');
    expect(action.addLists).toContain('BREVO_LIST_ONBOARDING_REQUIRED');
    expect(action.removeLists).toContain('BREVO_LIST_CHECKOUT_ABANDONED');
  });

  it('maps cancelled state by removing active onboarding lists', () => {
    const action = lifecycleActionForStatus({
      status: 'cancelled',
      completionPercent: 75,
      packageKey: 'command_center',
      stripeCustomerId: 'cus_123',
      subscriptionStatus: 'canceled',
      locationCount: 12,
      manualReviewRequired: true,
      launchDate: null,
    });

    expect(action.addLists).toContain('BREVO_LIST_CANCELLED_CUSTOMERS');
    expect(action.removeLists).toContain('BREVO_LIST_CONFIGURATION');
    expect(action.attributes.MANUAL_REVIEW_REQUIRED).toBe(true);
  });
});

describe('onboarding reminders', () => {
  it('sends reminders only when due and not already sent', () => {
    const createdAt = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
    const first = shouldSendReminder({ createdAt, status: 'required', suppression: false, alreadySentKinds: [] });
    expect(first).toBe('first_day');

    const noneAfterSent = shouldSendReminder({ createdAt, status: 'required', suppression: false, alreadySentKinds: ['first_day'] });
    expect(noneAfterSent).toBe(null);
  });

  it('never sends reminders for submitted/active/cancelled or suppressed contacts', () => {
    const createdAt = new Date(Date.now() - 200 * 60 * 60 * 1000).toISOString();
    expect(shouldSendReminder({ createdAt, status: 'submitted', suppression: false, alreadySentKinds: [] })).toBe(null);
    expect(shouldSendReminder({ createdAt, status: 'active', suppression: false, alreadySentKinds: [] })).toBe(null);
    expect(shouldSendReminder({ createdAt, status: 'cancelled', suppression: false, alreadySentKinds: [] })).toBe(null);
    expect(shouldSendReminder({ createdAt, status: 'in_progress', suppression: true, alreadySentKinds: [] })).toBe(null);
  });
});
