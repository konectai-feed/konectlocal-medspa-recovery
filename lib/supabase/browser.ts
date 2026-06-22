import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';
export function createSupabaseBrowserClient() { return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey); }
