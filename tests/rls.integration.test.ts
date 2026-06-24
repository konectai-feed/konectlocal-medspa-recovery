import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasSupabase = Boolean(url && anon && service && !url?.includes('example') && !anon?.includes('test-'));

if (!hasSupabase) {
  describe.skip('real Supabase RLS policies', () => {
    it('requires local Supabase env vars', () => {
      expect(hasSupabase).toBe(false);
    });
  });
} else {
  describe('real Supabase RLS policies', () => {
    const anonClient = createClient(url!, anon!);
    const serviceClient = createClient(url!, service!, { auth: { persistSession: false } });

    it('blocks anonymous table reads and privileged RPC execution', async () => {
      const read = await anonClient.from('leads').select('*').limit(1);
      expect(read.error).not.toBeNull();
      const rpc = await anonClient.rpc('upsert_lead', { p_email: 'a@example.com', p_business_name: 'Anon Spa' });
      expect(rpc.error).not.toBeNull();
    });

    it('blocks ordinary authenticated users from admin data', async () => {
      const email = `ordinary-${Date.now()}@example.com`;
      const password = 'TestPassword123!';
      await serviceClient.auth.admin.createUser({ email, password, email_confirm: true });
      const userClient = createClient(url!, anon!);
      await userClient.auth.signInWithPassword({ email, password });
      const result = await userClient.from('admin_users').select('*');
      expect(result.data ?? []).toHaveLength(0);
    });
  });
}
