import { serverEnv } from '@/lib/env.server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function assertAdminAccess() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) {
    throw new Error('Unauthorized');
  }

  const allowlist = new Set(
    (serverEnv.ADMIN_EMAIL_ALLOWLIST ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );

  if (allowlist.size > 0 && allowlist.has(userData.user.email.toLowerCase())) {
    return { userId: userData.user.id, email: userData.user.email, role: 'allowlist' };
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role,active')
    .eq('user_id', userData.user.id)
    .eq('active', true)
    .maybeSingle();

  if (!adminUser?.active) {
    throw new Error('Unauthorized');
  }

  return { userId: userData.user.id, email: userData.user.email, role: adminUser.role };
}
