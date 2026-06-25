import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPackageConfig, normalizePackageKey } from '@/lib/commerce/catalog';
import { buildCheckoutMetadata, verifyCheckoutToken } from '@/lib/commerce/checkout';
import { hashToken } from '@/lib/assessment/service';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { recordSessionEvent } from '@/lib/assessment/service';
import { applyPromotionToCheckout } from '@/lib/commerce/promotions';
import { createCheckoutProvider } from '@/lib/commerce/checkout-provider';

const checkoutSchema = z.object({
  reportToken: z.string().optional(),
  checkoutToken: z.string().optional(),
  packageKey: z.string().min(1),
  promotionCode: z.string().optional(),
  source: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const { reportToken, checkoutToken, packageKey, promotionCode, source } = parsed.data;
    const normalizedPackage = normalizePackageKey(packageKey);
    const packageConfig = getPackageConfig(normalizedPackage);

    let leadId: string | null = null;
    let assessmentId: string | null = null;

    if (checkoutToken) {
      const tokenPayload = await verifyCheckoutToken(checkoutToken);
      const normalizedTokenPackage = normalizePackageKey(tokenPayload.packageKey);
      if (normalizedTokenPackage !== normalizedPackage) {
        return NextResponse.json({ error: 'Tampered package selection' }, { status: 400 });
      }
      leadId = tokenPayload.leadId;
      assessmentId = tokenPayload.assessmentId;
    } else if (reportToken) {
      const supabase = createSupabaseServiceRoleClient();
      const hash = hashToken(reportToken);
      const { data: reportLink } = await supabase.from('report_links').select('assessment_id').eq('token_hash', hash).maybeSingle();
      if (!reportLink?.assessment_id) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      assessmentId = reportLink.assessment_id;
      const { data: assessment } = await supabase.from('assessments').select('lead_id').eq('id', reportLink.assessment_id).maybeSingle();
      if (!assessment?.lead_id) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
      leadId = assessment.lead_id;
    } else {
      return NextResponse.json({ error: 'Missing checkout token or report token' }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();
    if (leadId && assessmentId) {
      await recordSessionEvent({ sessionId: null, assessmentId, leadId, eventType: 'primary_purchase_clicked', eventData: { packageKey: normalizedPackage, source, promotionCode }, source: 'web' });
      await supabase.from('lead_events').insert([{ lead_id: leadId, assessment_id: assessmentId, event_type: 'checkout_started', event_data: { packageKey: normalizedPackage, source, promotionCode }, source: 'web' }]);
    }

    const promotionResult = applyPromotionToCheckout(promotionCode, { packageKey: normalizedPackage, packagePrice: packageConfig.monthlyPrice });
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/checkout/cancelled`;
    const metadata = buildCheckoutMetadata({ leadId: leadId ?? '', assessmentId: assessmentId ?? '', packageKey: normalizedPackage, campaignSource: source, reportToken });

    const checkoutProvider = createCheckoutProvider();
    const { checkoutSessionId, checkoutUrl, provider } = await checkoutProvider.createCheckoutSession({
      packageKey: normalizedPackage,
      successUrl,
      cancelUrl,
      metadata: {
        ...metadata,
        promotion_code: promotionCode ?? null,
      },
    });

    await supabase.from('checkout_sessions').insert({
      lead_id: leadId,
      assessment_id: assessmentId,
      package_key: normalizedPackage,
      stripe_checkout_session_id: checkoutSessionId,
      status: 'started',
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      metadata: { ...metadata, package_display_name: packageConfig.displayName, promotion_code: promotionCode ?? null, source: source ?? null, promotion_discount_percent: promotionResult.metadata.discountPercent, promotion_discount_amount: promotionResult.metadata.discountAmount, promotion_final_amount: promotionResult.metadata.finalAmount },
    });

    if (leadId && promotionCode) {
      await supabase.from('promotion_redemptions').insert({
        lead_id: leadId,
        promotion_code: promotionCode,
        discount_type: promotionResult.metadata.discountPercent > 0 ? 'percent' : 'none',
        discount_value: promotionResult.metadata.discountPercent,
        discount_amount_applied: promotionResult.metadata.discountAmount,
        campaign_source: source ?? null,
        status: promotionResult.valid ? 'entered' : 'rejected',
      });
    }

    const response = {
      ok: true,
      package: packageConfig,
      successUrl,
      cancelUrl,
      checkoutSessionId,
      checkoutUrl,
      checkoutProvider: provider,
      metadata,
      promotionCode,
      promotion: promotionResult.metadata,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start checkout';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
