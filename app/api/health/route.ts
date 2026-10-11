import { NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const { error } = await createSupabaseServiceRoleClient()
      .from('assessment_sessions')
      .select('id')
      .limit(1);

    if (error) throw error;

    log('info', 'health_check', { database: 'ok' });
    return NextResponse.json(
      { app: 'ok', database: 'ok', timestamp },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch {
    log('error', 'health_check_failed', { database: 'unavailable' });
    return NextResponse.json(
      { app: 'ok', database: 'unavailable', timestamp },
      { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}
