import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { publicEnv } from '@/lib/env.client';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Cookie writes can be unavailable during Server Component rendering.
          }
        },
      },
    },
  );
}
