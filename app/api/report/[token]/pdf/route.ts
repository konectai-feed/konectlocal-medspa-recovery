import { NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { hashToken } from '@/lib/assessment/service';

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const supabase = createSupabaseServiceRoleClient();
  const tokenHash = hashToken(params.token);
  const { data: reportLink } = await supabase.from('report_links').select('assessment_id').eq('token_hash', tokenHash).maybeSingle();
  if (!reportLink?.assessment_id) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const pdf = Buffer.from('pdf-placeholder');
  return new NextResponse(pdf, { status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="report.pdf"' } });
}
