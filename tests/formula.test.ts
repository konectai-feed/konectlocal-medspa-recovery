import { describe, expect, it } from 'vitest';
import { approvedFormulaConfig } from '@/lib/config/formula';

describe('approved V1 formula configuration', () => {
  it('has total possible score exactly 100', () => {
    const total = approvedFormulaConfig.questions.reduce((sum, question) => {
      return sum + ('weight' in question ? question.weight : 0);
    }, 0);
    expect(total).toBe(100);
  });
});
