import { z } from 'zod';

export const packageCatalogSchema = z.object({
  lead_revenue_recovery: z.object({
    key: z.literal('lead_revenue_recovery'),
    displayName: z.string(),
    stripeProductId: z.string(),
    stripePriceIdRecurring: z.string(),
    stripePriceIdSetup: z.string(),
    monthlyPrice: z.number(),
    setupFee: z.number(),
    eligibleForManualReview: z.boolean().default(false),
  }),
  ai_revenue_command_center: z.object({
    key: z.literal('ai_revenue_command_center'),
    displayName: z.string(),
    stripeProductId: z.string(),
    stripePriceIdRecurring: z.string(),
    stripePriceIdSetup: z.string(),
    monthlyPrice: z.number(),
    setupFee: z.number(),
    eligibleForManualReview: z.boolean().default(false),
  }),
});

export type PackageKey = keyof typeof packageCatalogSchema.shape;

export type PackageCatalog = z.infer<typeof packageCatalogSchema>;

export function normalizePackageKey(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'lead_revenue_recovery' || normalized === 'lead_revenue_recovery_599') return 'lead_revenue_recovery';
  if (normalized === 'ai_revenue_command_center' || normalized === 'ai_revenue_command_center_999') return 'ai_revenue_command_center';
  return normalized;
}

export function getPackageCatalog(): PackageCatalog {
  const env = {
    STRIPE_PRODUCT_RECOVERY: process.env.STRIPE_PRODUCT_RECOVERY ?? 'prod_Ul8UCvkqbgQnry',
    STRIPE_PRICE_RECOVERY_MONTHLY: process.env.STRIPE_PRICE_RECOVERY_MONTHLY ?? 'price_1TlcD5Fo3Cqrpv1YggFKKsCY',
    STRIPE_PRICE_RECOVERY_SETUP: process.env.STRIPE_PRICE_RECOVERY_SETUP ?? 'price_1TlcFsFo3Cqrpv1Y0Y9rjHhG',
    STRIPE_PRODUCT_COMMAND_CENTER: process.env.STRIPE_PRODUCT_COMMAND_CENTER ?? 'prod_Ul8ee6aGcqDrye',
    STRIPE_PRICE_COMMAND_CENTER_MONTHLY: process.env.STRIPE_PRICE_COMMAND_CENTER_MONTHLY ?? 'price_1TlcMmFo3Cqrpv1YW7SzNmbL',
    STRIPE_PRICE_COMMAND_CENTER_SETUP: process.env.STRIPE_PRICE_COMMAND_CENTER_SETUP ?? 'price_1TlcOBFo3Cqrpv1YqJaWzrP5',
  };

  const parsed = packageCatalogSchema.parse({
    lead_revenue_recovery: {
      key: 'lead_revenue_recovery',
      displayName: 'Med Spa Lead & Revenue Recovery System',
      stripeProductId: env.STRIPE_PRODUCT_RECOVERY,
      stripePriceIdRecurring: env.STRIPE_PRICE_RECOVERY_MONTHLY,
      stripePriceIdSetup: env.STRIPE_PRICE_RECOVERY_SETUP,
      monthlyPrice: 599,
      setupFee: 450,
      eligibleForManualReview: false,
    },
    ai_revenue_command_center: {
      key: 'ai_revenue_command_center',
      displayName: 'Med Spa AI Revenue Command Center',
      stripeProductId: env.STRIPE_PRODUCT_COMMAND_CENTER,
      stripePriceIdRecurring: env.STRIPE_PRICE_COMMAND_CENTER_MONTHLY,
      stripePriceIdSetup: env.STRIPE_PRICE_COMMAND_CENTER_SETUP,
      monthlyPrice: 999,
      setupFee: 750,
      eligibleForManualReview: false,
    },
  });

  return parsed;
}

export function getPackageConfig(packageKey: string) {
  const catalog = getPackageCatalog();
  const key = normalizePackageKey(packageKey);
  if (key === 'lead_revenue_recovery') return catalog.lead_revenue_recovery;
  if (key === 'ai_revenue_command_center') return catalog.ai_revenue_command_center;
  throw new Error(`Unsupported package: ${packageKey}`);
}
