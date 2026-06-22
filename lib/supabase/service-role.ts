import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';
export function createSupabaseServiceRoleClient() { if (!serverEnv.supabaseServiceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for service-role operations'); return createClient(publicEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, { auth: { persistSession: false } }); }
