import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAdminAccess } from '@/lib/onboarding/admin-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

const querySchema = z.object({
  status: z.string().optional(),
  packageKey: z.string().optional(),
  search: z.string().optional(),
  manualReviewRequired: z.string().optional(),
  minLocations: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    await assertAdminAccess();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters.' }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  let query = supabase
    .from('customer_onboarding')
    .select('id,purchase_id,subscription_id,lead_id,assessment_id,package_key,status,completion_percent,manual_review_required,assigned_to,created_at,updated_at,submitted_at,delayed_at,cancelled_at')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (parsed.data.status) query = query.eq('status', parsed.data.status);
  if (parsed.data.packageKey) query = query.eq('package_key', parsed.data.packageKey);
  if (parsed.data.manualReviewRequired === 'true') query = query.eq('manual_review_required', true);
  if (parsed.data.manualReviewRequired === 'false') query = query.eq('manual_review_required', false);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const onboardingRows = data ?? [];
  const leadIds = onboardingRows.map((row) => row.lead_id).filter(Boolean);
  const purchaseIds = onboardingRows.map((row) => row.purchase_id).filter(Boolean);
  const assessmentIds = onboardingRows.map((row) => row.assessment_id).filter(Boolean);

  const [leadRows, purchaseRows, assessmentRows] = await Promise.all([
    leadIds.length > 0
      ? supabase.from('leads').select('id,business_name,email').in('id', leadIds)
      : Promise.resolve({ data: [], error: null }),
    purchaseIds.length > 0
      ? supabase.from('purchases').select('id,stripe_customer_id,package_key,payment_status,purchase_status').in('id', purchaseIds)
      : Promise.resolve({ data: [], error: null }),
    assessmentIds.length > 0
      ? supabase.from('assessments').select('id,recovery_score,primary_leak,recommended_package,opportunity_low,opportunity_high').in('id', assessmentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const leadById = new Map((leadRows.data ?? []).map((row) => [row.id, row]));
  const purchaseById = new Map((purchaseRows.data ?? []).map((row) => [row.id, row]));
  const assessmentById = new Map((assessmentRows.data ?? []).map((row) => [row.id, row]));

  let result = onboardingRows.map((row) => {
    const lead = leadById.get(row.lead_id);
    const purchase = purchaseById.get(row.purchase_id);
    const assessment = row.assessment_id ? assessmentById.get(row.assessment_id) : null;
    const now = Date.now();
    const ageHours = Math.max(0, Math.round((now - new Date(String(row.updated_at)).getTime()) / (60 * 60 * 1000)));

    return {
      ...row,
      ageHours,
      lead,
      purchase,
      assessment,
    };
  });

  if (parsed.data.search) {
    const q = parsed.data.search.toLowerCase();
    result = result.filter((entry) => {
      const business = String(entry.lead?.business_name ?? '').toLowerCase();
      const email = String(entry.lead?.email ?? '').toLowerCase();
      const stripeCustomer = String(entry.purchase?.stripe_customer_id ?? '').toLowerCase();
      const packageKey = String(entry.package_key ?? '').toLowerCase();
      const status = String(entry.status ?? '').toLowerCase();
      return business.includes(q) || email.includes(q) || stripeCustomer.includes(q) || packageKey.includes(q) || status.includes(q);
    });
  }

  return NextResponse.json({ ok: true, activations: result });
}
