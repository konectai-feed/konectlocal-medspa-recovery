import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { recordSessionEvent } from '@/lib/assessment/service';

const bookingSchema = z.object({
  leadId: z.string().min(1),
  assessmentId: z.string().optional(),
  source: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  await supabase.from('lead_events').insert([{ lead_id: parsed.data.leadId, assessment_id: parsed.data.assessmentId ?? null, event_type: 'booking_clicked', event_data: { source: parsed.data.source ?? 'web' }, source: 'web' }]);
  await recordSessionEvent({ sessionId: null, assessmentId: parsed.data.assessmentId ?? null, leadId: parsed.data.leadId, eventType: 'booking_clicked', eventData: { source: parsed.data.source ?? 'web' }, source: 'web' });
  return NextResponse.json({ ok: true });
}
