export type ResultsCtaHierarchy = {
  primary: 'purchase' | 'manual_review' | 'booking';
  secondary: 'ai_sales_chat' | 'booking' | 'purchase' | 'manual_review' | null;
  tertiary: 'booking' | 'ai_sales_chat' | 'purchase' | 'manual_review' | null;
};

export function getResultsPageCtaHierarchy({ locationCount, packageKey }: { locationCount?: number; packageKey?: string }): ResultsCtaHierarchy {
  const locationTotal = locationCount ?? 1;
  if (locationTotal >= 10) {
    return { primary: 'manual_review', secondary: 'purchase', tertiary: 'booking' };
  }

  const normalizedPackage = packageKey?.toLowerCase() ?? '';
  if (normalizedPackage.includes('command')) {
    return { primary: 'purchase', secondary: 'ai_sales_chat', tertiary: 'booking' };
  }

  return { primary: 'purchase', secondary: 'ai_sales_chat', tertiary: 'booking' };
}
