import { normalizePackageKey } from '@/lib/commerce/catalog';

export type PromotionValidationResult = {
  valid: boolean;
  code: string | null;
  discountPercent: number;
  discountAmount: number;
  attributionCode: string | null;
  reason?: string;
};

const promotionCatalog = {
  SAVE10: { code: 'SAVE10', percent: 10, eligiblePackages: ['lead_revenue_recovery', 'ai_revenue_command_center'] as const },
  SAVE20: { code: 'SAVE20', percent: 20, eligiblePackages: ['ai_revenue_command_center'] as const },
} as const;

export function validatePromotionCode(code: string | undefined, context: { packageKey?: string } = {}): PromotionValidationResult {
  if (!code) {
    return { valid: false, code: null, discountPercent: 0, discountAmount: 0, attributionCode: null, reason: 'No promotion code supplied' };
  }

  const normalized = code.trim().toUpperCase();
  const promotion = promotionCatalog[normalized as keyof typeof promotionCatalog];
  if (!promotion) {
    return { valid: false, code: normalized, discountPercent: 0, discountAmount: 0, attributionCode: null, reason: 'Unknown promotion code' };
  }

  const packageKey = context.packageKey ? normalizePackageKey(context.packageKey) : undefined;
  const eligiblePackages = promotion.eligiblePackages as readonly string[];
  if (packageKey && !eligiblePackages.includes(packageKey)) {
    return { valid: false, code: normalized, discountPercent: 0, discountAmount: 0, attributionCode: null, reason: 'Promotion not available for this package' };
  }

  return {
    valid: true,
    code: normalized,
    discountPercent: promotion.percent,
    discountAmount: 0,
    attributionCode: normalized,
  };
}

export function applyPromotionToCheckout(code: string | undefined, context: { packageKey: string; packagePrice: number }) {
  const validation = validatePromotionCode(code, { packageKey: context.packageKey });
  const discountAmount = validation.valid ? Number((context.packagePrice * (validation.discountPercent / 100)).toFixed(2)) : 0;
  const finalAmount = validation.valid ? Number((context.packagePrice - discountAmount).toFixed(2)) : context.packagePrice;

  return {
    valid: validation.valid,
    metadata: {
      promotionCode: validation.attributionCode,
      discountPercent: validation.discountPercent,
      discountAmount,
      finalAmount,
    },
  };
}
