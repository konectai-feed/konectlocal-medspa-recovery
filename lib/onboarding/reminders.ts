import type { OnboardingStatus } from '@/lib/onboarding/types';
import { serverEnv } from '@/lib/env.server';

export type ReminderKind = 'first_day' | 'third_day' | 'seventh_day';

export type ReminderSchedule = {
  firstDayHours: number;
  thirdDayHours: number;
  seventhDayHours: number;
};

export function getReminderSchedule(): ReminderSchedule {
  const firstDayHours = serverEnv.ONBOARDING_REMINDER_FIRST_HOURS;
  const thirdDayHours = serverEnv.ONBOARDING_REMINDER_SECOND_HOURS;
  const seventhDayHours = serverEnv.ONBOARDING_REMINDER_THIRD_HOURS;
  return { firstDayHours, thirdDayHours, seventhDayHours };
}

export function shouldSendReminder(input: {
  createdAt: string;
  status: OnboardingStatus;
  suppression: boolean;
  alreadySentKinds: ReminderKind[];
  now?: Date;
}) {
  if (input.suppression) return null;
  if (input.status === 'submitted' || input.status === 'active' || input.status === 'cancelled') return null;

  const now = input.now ?? new Date();
  const createdAt = new Date(input.createdAt).getTime();
  const elapsedHours = (now.getTime() - createdAt) / (60 * 60 * 1000);
  const schedule = getReminderSchedule();

  if (elapsedHours >= schedule.seventhDayHours && !input.alreadySentKinds.includes('seventh_day')) return 'seventh_day';
  if (elapsedHours >= schedule.thirdDayHours && !input.alreadySentKinds.includes('third_day')) return 'third_day';
  if (elapsedHours >= schedule.firstDayHours && !input.alreadySentKinds.includes('first_day')) return 'first_day';
  return null;
}
