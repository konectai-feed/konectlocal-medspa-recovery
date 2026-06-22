import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const allowedRoles = ['admin', 'sales_manager', 'sales_rep', 'analyst'];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/');

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role, active')
    .eq('user_id', data.user.id)
    .eq('active', true)
    .single();

  if (!adminUser || !allowedRoles.includes(adminUser.role)) redirect('/');

  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <span className="font-bold">KonectLocal Admin</span>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
