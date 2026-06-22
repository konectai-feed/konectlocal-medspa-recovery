import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { publicEnv } from '@/lib/env.client';
import { serverEnv } from '@/lib/env.server';

export function createSupabaseServiceRoleClient() {
  return createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
