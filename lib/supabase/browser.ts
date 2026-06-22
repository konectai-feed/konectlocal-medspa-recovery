import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env.client';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
