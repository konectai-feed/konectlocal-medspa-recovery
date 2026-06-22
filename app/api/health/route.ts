import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';
export async function GET() { const status = { app: 'ok', database: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing_configuration', timestamp: new Date().toISOString() }; log('info', 'health_check', { database: status.database }); return NextResponse.json(status); }
