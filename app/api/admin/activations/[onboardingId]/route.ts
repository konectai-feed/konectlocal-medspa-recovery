import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAdminAccess } from '@/lib/onboarding/admin-auth';
import { issueOnboardingToken, prepareVendastaRun, transitionOnboardingStatus, appendOnboardingEvent } from '@/lib/onboarding/service';
import type { OnboardingStatus } from '@/lib/onboarding/types';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

const patchSchema = z.object({
  action: z.enum([
    'assign_owner',
    'add_internal_note',
    'approve_onboarding',
    'delay_activation',
    'cancel_activation',
    'replace_onboarding_link',
    'prepare_vendasta_dry_run',
    'mark_task_complete',
    'mark_ready_for_launch',
    'activate_customer',
  ]),
  ownerId: z.string().uuid().optional(),
  note: z.string().optional(),
  reason: z.string().optional(),
  taskId: z.string().uuid().optional(),
});

async function transition(onboardingId: string, toStatus: OnboardingStatus, actorId: string, reason?: string) {
  await transitionOnboardingStatus({
    onboardingId,
    toStatus,
    actorType: 'admin',
    actorId,
    reason: reason ?? null,
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ onboardingId: string }> }) {
  let admin: { userId: string };
  try {
    admin = await assertAdminAccess();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { onboardingId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid admin action payload.' }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (parsed.data.action === 'assign_owner') {
    if (!parsed.data.ownerId) return NextResponse.json({ error: 'ownerId is required.' }, { status: 400 });
    const { error } = await supabase.from('customer_onboarding').update({ assigned_to: parsed.data.ownerId }).eq('id', onboardingId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await appendOnboardingEvent({ onboardingId, eventType: 'onboarding_assigned', actorType: 'admin', actorId: admin.userId, eventData: { assignedTo: parsed.data.ownerId } });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === 'add_internal_note') {
    const note = parsed.data.note?.trim();
    if (!note) return NextResponse.json({ error: 'note is required.' }, { status: 400 });

    const { data: current } = await supabase.from('customer_onboarding').select('internal_notes').eq('id', onboardingId).single();
    const merged = `${current?.internal_notes ?? ''}\n[${new Date().toISOString()}] ${note}`.trim();
    const { error } = await supabase.from('customer_onboarding').update({ internal_notes: merged }).eq('id', onboardingId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await appendOnboardingEvent({ onboardingId, eventType: 'onboarding_information_requested', actorType: 'admin', actorId: admin.userId, eventData: { note } });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === 'approve_onboarding') {
    const { data: current } = await supabase.from('customer_onboarding').select('status').eq('id', onboardingId).maybeSingle();
    const overrideReason = current?.status === 'delayed' ? (parsed.data.reason?.trim() ?? '') : '';
    if (current?.status === 'delayed' && !overrideReason) {
      return NextResponse.json({ error: 'reason is required when approving a delayed activation.' }, { status: 400 });
    }

    await transitionOnboardingStatus({
      onboardingId,
      toStatus: 'configuration',
      actorType: 'admin',
      actorId: admin.userId,
      adminOverrideReason: overrideReason || null,
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === 'delay_activation') {
    if (!parsed.data.reason) return NextResponse.json({ error: 'reason is required.' }, { status: 400 });
    await transition(onboardingId, 'delayed', admin.userId, parsed.data.reason);
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === 'cancel_activation') {
    if (!parsed.data.reason) return NextResponse.json({ error: 'reason is required.' }, { status: 400 });
    await transition(onboardingId, 'cancelled', admin.userId, parsed.data.reason);
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === 'replace_onboarding_link') {
    const tokenResult = await issueOnboardingToken({ onboardingId, actorType: 'admin', actorId: admin.userId, replaceCurrent: true });
    return NextResponse.json({ ok: true, replacementToken: tokenResult.token, expiresAt: tokenResult.expiresAt });
  }

  if (parsed.data.action === 'prepare_vendasta_dry_run') {
    const { data: onboarding } = await supabase.from('customer_onboarding').select('id,activation_id,package_key,lead_id,assessment_id').eq('id', onboardingId).single();
    if (!onboarding) return NextResponse.json({ error: 'Onboarding not found.' }, { status: 404 });
    await prepareVendastaRun({
      onboardingId,
      activationId: onboarding.activation_id as string | null,
      packageKey: String(onboarding.package_key),
      leadId: String(onboarding.lead_id),
      assessmentId: onboarding.assessment_id as string | null,
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === 'mark_task_complete') {
    if (!parsed.data.taskId) return NextResponse.json({ error: 'taskId is required.' }, { status: 400 });
    const { error } = await supabase
      .from('activation_tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', parsed.data.taskId)
      .eq('onboarding_id', onboardingId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === 'mark_ready_for_launch') {
    await transition(onboardingId, 'ready_for_launch', admin.userId);
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === 'activate_customer') {
    await transition(onboardingId, 'active', admin.userId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
}
