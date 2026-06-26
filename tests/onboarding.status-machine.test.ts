import { describe, expect, it } from 'vitest';
import { assertValidTransition, canTransition, getAllowedTransitions } from '@/lib/onboarding/status-machine';

describe('onboarding status machine', () => {
  it('allows required transition paths', () => {
    expect(canTransition('required', 'started')).toBe(true);
    expect(canTransition('started', 'in_progress')).toBe(true);
    expect(canTransition('in_progress', 'submitted')).toBe(true);
    expect(canTransition('submitted', 'activation_review')).toBe(true);
    expect(canTransition('activation_review', 'configuration')).toBe(true);
    expect(canTransition('configuration', 'ready_for_launch')).toBe(true);
    expect(canTransition('ready_for_launch', 'active')).toBe(true);
  });

  it('allows exception transitions', () => {
    expect(canTransition('activation_review', 'delayed')).toBe(true);
    expect(canTransition('configuration', 'delayed')).toBe(true);
    expect(canTransition('ready_for_launch', 'delayed')).toBe(true);
    expect(canTransition('delayed', 'activation_review')).toBe(true);
    expect(canTransition('required', 'cancelled')).toBe(true);
    expect(canTransition('submitted', 'cancelled')).toBe(true);
  });

  it('blocks invalid transitions', () => {
    expect(canTransition('required', 'active')).toBe(false);
    expect(canTransition('active', 'configuration')).toBe(false);
    expect(canTransition('cancelled', 'required')).toBe(false);
    expect(canTransition('submitted', 'active')).toBe(false);
  });

  it('throws on invalid transitions', () => {
    expect(() => assertValidTransition('required', 'active')).toThrow('Invalid onboarding transition');
    expect(() => assertValidTransition('cancelled', 'started')).toThrow('Invalid onboarding transition');
  });

  it('keeps active and cancelled terminal', () => {
    expect(getAllowedTransitions('active')).toEqual([]);
    expect(getAllowedTransitions('cancelled')).toEqual([]);
  });
});
