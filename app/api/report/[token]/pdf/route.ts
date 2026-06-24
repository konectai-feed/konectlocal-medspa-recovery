import { NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { hashToken, recordSessionEvent } from '@/lib/assessment/service';
import { log } from '@/lib/logger';
import { checkRateLimit, getRequestIp } from '@/lib/rate-limit';

export async function GET(request: Request, { params }: { params: { token: string } }) {
  const supabase = createSupabaseServiceRoleClient();
  const tokenHash = hashToken(params.token);
  const ip = getRequestIp(request);
  const rateLimit = checkRateLimit(`report-pdf:${params.token}:${ip}`, 5, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter ?? 60) } });
  }

  const { data: reportLink } = await supabase.from('report_links').select('id,assessment_id,download_count').eq('token_hash', tokenHash).maybeSingle();
  if (!reportLink?.assessment_id) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const pdf = Buffer.from('pdf-placeholder');
  await supabase.from('report_links').update({ download_count: (reportLink.download_count ?? 0) + 1, last_accessed_at: new Date().toISOString() }).eq('id', reportLink.id);
  await recordSessionEvent({ sessionId: null, assessmentId: reportLink.assessment_id, leadId: null, eventType: 'report_downloaded', eventData: { token: params.token }, source: 'web' });
  log('info', 'report_pdf_downloaded', { assessmentId: reportLink.assessment_id, ip });
  return new NextResponse(pdf, { status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="report.pdf"' } });
}
