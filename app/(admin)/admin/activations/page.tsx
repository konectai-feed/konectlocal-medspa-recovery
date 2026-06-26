import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertAdminAccess } from '@/lib/onboarding/admin-auth';

function statusBadge(status: string) {
  const classes: Record<string, string> = {
    required: 'bg-amber-500/20 text-amber-200',
    started: 'bg-cyan-500/20 text-cyan-200',
    in_progress: 'bg-blue-500/20 text-blue-200',
    submitted: 'bg-indigo-500/20 text-indigo-200',
    activation_review: 'bg-violet-500/20 text-violet-200',
    configuration: 'bg-purple-500/20 text-purple-200',
    ready_for_launch: 'bg-emerald-500/20 text-emerald-200',
    active: 'bg-green-500/20 text-green-200',
    delayed: 'bg-orange-500/20 text-orange-200',
    cancelled: 'bg-rose-500/20 text-rose-200',
  };
  return classes[status] ?? 'bg-white/10 text-white';
}

export default async function AdminActivationsPage() {
  await assertAdminAccess();
  const supabase = await createSupabaseServerClient();

  const { data: onboardingRows } = await supabase
    .from('customer_onboarding')
    .select('id,lead_id,purchase_id,package_key,status,completion_percent,manual_review_required,updated_at,created_at')
    .order('updated_at', { ascending: false })
    .limit(200);

  const leadIds = (onboardingRows ?? []).map((row) => row.lead_id).filter(Boolean);
  const { data: leads } = leadIds.length > 0
    ? await supabase.from('leads').select('id,business_name,email').in('id', leadIds)
    : { data: [] };

  const leadById = new Map((leads ?? []).map((lead) => [lead.id, lead]));

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activation Dashboard</h1>
        <p className="mt-2 text-white/70">Manage onboarding progression, activation review, configuration readiness, and launch controls.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead>
            <tr className="text-left text-white/70">
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Package</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Completion</th>
              <th className="px-4 py-3">Manual Review</th>
              <th className="px-4 py-3">Age</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {(onboardingRows ?? []).map((row) => {
              const lead = leadById.get(row.lead_id);
              const ageHours = Math.max(0, Math.round((Date.now() - new Date(String(row.updated_at)).getTime()) / (60 * 60 * 1000)));
              return (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{lead?.business_name ?? 'Unknown business'}</div>
                    <div className="text-white/60">{lead?.email ?? 'No email'}</div>
                  </td>
                  <td className="px-4 py-3">{String(row.package_key)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(String(row.status))}`}>
                      {String(row.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{Number(row.completion_percent)}%</td>
                  <td className="px-4 py-3">{row.manual_review_required ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">{ageHours}h</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
