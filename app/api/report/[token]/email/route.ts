import { NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { hashToken } from '@/lib/assessment/service';

export async function POST(request: Request, { params }: { params: { token: string } }) {
  const body = await request.json().catch(() => ({}));
  const supabase = createSupabaseServiceRoleClient();
  const tokenHash = hashToken(params.token);
  const { data: reportLink } = await supabase.from('report_links').select('assessment_id').eq('token_hash', tokenHash).maybeSingle();
  if (!reportLink?.assessment_id) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  await supabase.from('report_deliveries').insert({ assessment_id: reportLink.assessment_id, lead_id: body.leadId ?? null, delivery_type: 'results_email', channel: 'email', status: 'sent' });
  return NextResponse.json({ ok: true });
}
