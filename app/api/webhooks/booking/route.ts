import { NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const supabase = createSupabaseServiceRoleClient();
  await supabase.from('booking_events').insert({
    external_booking_id: body.externalBookingId ?? body.external_booking_id ?? null,
    provider: body.provider ?? 'booking',
    status: 'booked',
    payload: body,
  });
  return NextResponse.json({ ok: true });
}
