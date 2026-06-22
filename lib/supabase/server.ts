import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';
export async function createSupabaseServerClient() { const cookieStore = await cookies(); return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, { cookies: { getAll: () => cookieStore.getAll(), setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }); }
