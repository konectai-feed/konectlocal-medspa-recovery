import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
export default async function AdminLayout({ children }: { children: React.ReactNode }) { const supabase = await createSupabaseServerClient(); const { data } = await supabase.auth.getUser(); if (!data.user) redirect('/'); return <div className="min-h-screen bg-navy text-white"><header className="border-b border-white/10 px-6 py-4"><span className="font-bold">KonectLocal Admin</span></header><main className="p-6">{children}</main></div>; }
