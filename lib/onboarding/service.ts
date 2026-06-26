import 'server-only';

import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { log } from '@/lib/logger';
import { enqueueIntegrationJob } from '@/lib/commerce/integrations';
import { createVendastaProvisioningAdapter, prepareVendastaProvisioningPayload } from '@/lib/integrations/vendasta';
import { sendOnboardingEmail } from '@/lib/onboarding/emails';
import { calculateCompletion, normalizePackageKey } from '@/lib/onboarding/requirements';
import { lifecycleActionForStatus } from '@/lib/onboarding/lifecycle';
import { getActivationTaskDefinitions } from '@/lib/onboarding/tasks';
import { assertValidTransition } from '@/lib/onboarding/status-machine';
import { buildTokenExpiry, generateOpaqueToken, hashOnboardingToken, isTokenExpired } from '@/lib/onboarding/tokens';
import { shouldSendReminder, type ReminderKind } from '@/lib/onboarding/reminders';
import type { OnboardingDraftInput, OnboardingStatus } from '@/lib/onboarding/types';

const TOKEN_EXPIRY_HOURS = 24 * 14;

function deriveLocationCountFromResponses(responses: OnboardingDraftInput, fallback = 1) {
  const value = responses.business_information?.number_of_locations;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  }
  return fallback;
}

async function deriveLifecycleContext(onboardingId: string) {
  const supabase = createSupabaseServiceRoleClient();

  const { data: onboarding, error: onboardingError } = await supabase
    .from('customer_onboarding')
    .select('id,package_key,manual_review_required,activated_at,lead_id,purchase_id,subscription_id')
    .eq('id', onboardingId)
    .single();

  if (onboardingError || !onboarding) throw new Error(onboardingError?.message ?? 'Onboarding not found for lifecycle context');

  const [{ data: rows, error: rowsError }, { data: purchase }, { data: subscription }] = await Promise.all([
    supabase
      .from('onboarding_responses')
      .select('section,field_key,value_type,value_text,value_number,value_boolean,value_json')
      .eq('onboarding_id', onboardingId),
    onboarding.purchase_id
      ? supabase
        .from('purchases')
        .select('stripe_customer_id')
        .eq('id', onboarding.purchase_id)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    onboarding.subscription_id
      ? supabase
        .from('subscriptions')
        .select('status')
        .eq('id', onboarding.subscription_id)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (rowsError) throw new Error(rowsError.message);

  const responses = rowsToDraft((rows ?? []) as Array<Record<string, unknown>>);
  const locationCount = deriveLocationCountFromResponses(responses, 1);

  return {
    packageKey: String(onboarding.package_key),
    manualReviewRequired: Boolean(onboarding.manual_review_required),
    launchDate: onboarding.activated_at ? String(onboarding.activated_at) : null,
    stripeCustomerId: (purchase?.stripe_customer_id as string | null) ?? null,
    subscriptionStatus: (subscription?.status as string | null) ?? null,
    locationCount,
  };
}

function mapValueType(value: unknown): 'text' | 'number' | 'boolean' | 'json' {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') return 'text';
  return 'json';
}

function redactProvisioningPayload(payload: Record<string, unknown>) {
  const clone = structuredClone(payload);
  if (clone.apiKey) clone.apiKey = '[redacted]';
  if (clone.secret) clone.secret = '[redacted]';
  return clone;
}

function toDbResponseRows(onboardingId: string, responses: OnboardingDraftInput, source: 'customer' | 'admin' | 'system') {
  const rows: Array<Record<string, unknown>> = [];
  for (const [section, fields] of Object.entries(responses)) {
    if (!fields || typeof fields !== 'object') continue;
    for (const [fieldKey, rawValue] of Object.entries(fields)) {
      const valueType = mapValueType(rawValue);
      rows.push({
        onboarding_id: onboardingId,
        section,
        field_key: fieldKey,
        value_type: valueType,
        value_text: valueType === 'text' ? String(rawValue) : null,
        value_number: valueType === 'number' ? Number(rawValue) : null,
        value_boolean: valueType === 'boolean' ? Boolean(rawValue) : null,
        value_json: valueType === 'json' ? rawValue : null,
        source,
        last_updated_at: new Date().toISOString(),
      });
    }
  }
  return rows;
}

function rowsToDraft(rows: Array<Record<string, unknown>>): OnboardingDraftInput {
  const out: OnboardingDraftInput = {};
  for (const row of rows) {
    const section = String(row.section);
    const fieldKey = String(row.field_key);
    const valueType = String(row.value_type);
    if (!out[section as keyof OnboardingDraftInput]) {
      out[section as keyof OnboardingDraftInput] = {};
    }

    let value: unknown = null;
    if (valueType === 'text') value = row.value_text;
    if (valueType === 'number') value = row.value_number;
    if (valueType === 'boolean') value = row.value_boolean;
    if (valueType === 'json') value = row.value_json;

    out[section as keyof OnboardingDraftInput]![fieldKey] = value as never;
  }
  return out;
}

export async function createOrUpdateOnboardingFromPurchase(input: {
  purchaseId: string;
  subscriptionId?: string | null;
  activationId?: string | null;
  leadId: string;
  assessmentId?: string | null;
  packageKey: string;
  locationCount: number;
  stripeCustomerId?: string | null;
  subscriptionStatus?: string | null;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const normalizedPackage = normalizePackageKey(input.packageKey);
  const manualReviewRequired = normalizedPackage === 'command_center' && input.locationCount >= 10;

  const { data: existing, error: existingError } = await supabase
    .from('customer_onboarding')
    .select('*')
    .eq('purchase_id', input.purchaseId)
    .is('cancelled_at', null)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  const payload = {
    purchase_id: input.purchaseId,
    subscription_id: input.subscriptionId ?? null,
    activation_id: input.activationId ?? null,
    lead_id: input.leadId,
    assessment_id: input.assessmentId ?? null,
    package_key: normalizedPackage,
    status: existing?.status ?? 'required',
    completion_percent: existing?.completion_percent ?? 0,
    manual_review_required: manualReviewRequired,
  };

  let onboardingId = existing?.id as string | undefined;
  if (onboardingId) {
    const { error } = await supabase.from('customer_onboarding').update(payload).eq('id', onboardingId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from('customer_onboarding').insert(payload).select('id').single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to create onboarding');
    onboardingId = String(data.id);
    await appendOnboardingEvent({ onboardingId: String(data.id), eventType: 'onboarding_created', actorType: 'system', eventData: { packageKey: normalizedPackage, manualReviewRequired } });
  }

  const ensuredOnboardingId = onboardingId as string;

  await queueBrevoLifecycleSync({
    onboardingId: ensuredOnboardingId,
    status: 'required',
    completionPercent: 0,
    packageKey: normalizedPackage,
    stripeCustomerId: input.stripeCustomerId ?? null,
    subscriptionStatus: input.subscriptionStatus ?? null,
    locationCount: input.locationCount,
    manualReviewRequired,
    launchDate: null,
  });

  const { data: lead } = await supabase.from('leads').select('email,business_name').eq('id', input.leadId).single();
  if (lead?.email) {
    await sendOnboardingEmail({
      template: 'purchase_confirmation',
      to: String(lead.email),
      idempotencyKey: `purchase-confirmation:${input.purchaseId}`,
      params: {
        business_name: String(lead.business_name ?? ''),
        package_key: normalizedPackage,
      },
    });
  }

  return { onboardingId: ensuredOnboardingId };
}

export async function issueOnboardingToken(input: { onboardingId: string; actorType: 'system' | 'admin'; actorId?: string | null; replaceCurrent?: boolean; expiryHours?: number; }) {
  const supabase = createSupabaseServiceRoleClient();
  const token = generateOpaqueToken();
  const tokenHash = hashOnboardingToken(token);
  const expiresAt = buildTokenExpiry(input.expiryHours ?? TOKEN_EXPIRY_HOURS);

  let replacedId: string | null = null;
  if (input.replaceCurrent) {
    const { data: activeTokens } = await supabase
      .from('onboarding_tokens')
      .select('id')
      .eq('onboarding_id', input.onboardingId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString());

    if (activeTokens?.length) {
      replacedId = activeTokens[0].id as string;
      await supabase
        .from('onboarding_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .in('id', activeTokens.map((entry) => entry.id));
    }
  }

  const { data: inserted, error } = await supabase
    .from('onboarding_tokens')
    .insert({
      onboarding_id: input.onboardingId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !inserted) throw new Error(error?.message ?? 'Failed to issue token');

  if (replacedId) {
    await supabase.from('onboarding_tokens').update({ replaced_by_token_id: inserted.id }).eq('id', replacedId);
    await appendOnboardingEvent({ onboardingId: input.onboardingId, eventType: 'onboarding_token_replaced', actorType: input.actorType, actorId: input.actorId, eventData: { replacedTokenId: replacedId, newTokenId: inserted.id } });
  }

  await appendOnboardingEvent({ onboardingId: input.onboardingId, eventType: 'onboarding_token_created', actorType: input.actorType, actorId: input.actorId, eventData: { tokenId: inserted.id, expiresAt } });

  const { data: onboarding } = await supabase
    .from('customer_onboarding')
    .select('id,lead_id,package_key')
    .eq('id', input.onboardingId)
    .single();
  if (onboarding?.lead_id) {
    const { data: lead } = await supabase.from('leads').select('email,business_name').eq('id', onboarding.lead_id).single();
    if (lead?.email) {
      await sendOnboardingEmail({
        template: 'onboarding_invitation',
        to: String(lead.email),
        idempotencyKey: `onboarding-invitation:${input.onboardingId}:${inserted.id}`,
        params: {
          business_name: String(lead.business_name ?? ''),
          onboarding_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/onboarding/${token}`,
          package_key: String(onboarding.package_key),
        },
      });
      await appendOnboardingEvent({ onboardingId: input.onboardingId, eventType: 'onboarding_link_sent', actorType: input.actorType, actorId: input.actorId, eventData: { tokenId: inserted.id } });
    }
  }

  return { token, expiresAt };
}

export async function resolveOnboardingByToken(token: string) {
  const supabase = createSupabaseServiceRoleClient();
  const tokenHash = hashOnboardingToken(token);

  const { data: tokenRow, error: tokenError } = await supabase
    .from('onboarding_tokens')
    .select('id,onboarding_id,expires_at,revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (tokenError) throw new Error(tokenError.message);
  if (!tokenRow || tokenRow.revoked_at) return null;
  if (isTokenExpired(String(tokenRow.expires_at))) {
    await appendOnboardingEvent({ onboardingId: String(tokenRow.onboarding_id), eventType: 'onboarding_token_expired', actorType: 'system', eventData: { tokenId: tokenRow.id } });
    return null;
  }

  const { data: onboarding, error: onboardingError } = await supabase
    .from('customer_onboarding')
    .select('*')
    .eq('id', tokenRow.onboarding_id)
    .maybeSingle();

  if (onboardingError) throw new Error(onboardingError.message);
  if (!onboarding) return null;

  const { data: responses, error: responsesError } = await supabase
    .from('onboarding_responses')
    .select('*')
    .eq('onboarding_id', onboarding.id);

  if (responsesError) throw new Error(responsesError.message);

  await supabase.from('onboarding_tokens').update({ accessed_at: new Date().toISOString() }).eq('id', tokenRow.id);
  await appendOnboardingEvent({ onboardingId: onboarding.id as string, eventType: 'onboarding_opened', actorType: 'customer', eventData: { tokenId: tokenRow.id } });

  return {
    onboarding,
    responses: rowsToDraft((responses ?? []) as Array<Record<string, unknown>>),
  };
}

export async function saveOnboardingDraft(input: { onboardingId: string; packageKey: string; locationCount: number; responses: OnboardingDraftInput; source?: 'customer' | 'admin'; }) {
  const supabase = createSupabaseServiceRoleClient();

  const { data: existingRows, error: existingError } = await supabase
    .from('onboarding_responses')
    .select('id,section,field_key,version')
    .eq('onboarding_id', input.onboardingId);

  if (existingError) throw new Error(existingError.message);

  const existingMap = new Map((existingRows ?? []).map((row) => [`${row.section}:${row.field_key}`, row]));
  const rows = toDbResponseRows(input.onboardingId, input.responses, input.source ?? 'customer');

  for (const row of rows) {
    const key = `${row.section}:${row.field_key}`;
    const existing = existingMap.get(key);
    const payload = {
      ...row,
      version: existing ? Number(existing.version) + 1 : 1,
    };

    const { error } = await supabase
      .from('onboarding_responses')
      .upsert(payload, { onConflict: 'onboarding_id,section,field_key' });

    if (error) throw new Error(error.message);
  }

  const merged = rowsToDraft((await supabase
    .from('onboarding_responses')
    .select('*')
    .eq('onboarding_id', input.onboardingId)).data as Array<Record<string, unknown>> ?? []);

  const completion = calculateCompletion({
    packageKey: normalizePackageKey(input.packageKey),
    locationCount: input.locationCount,
    responses: merged,
  });

  const nextStatus: OnboardingStatus = completion.completionPercent > 0 ? 'in_progress' : 'started';
  const { data: onboardingCurrent, error: onboardingCurrentError } = await supabase
    .from('customer_onboarding')
    .select('status')
    .eq('id', input.onboardingId)
    .single();

  if (onboardingCurrentError) throw new Error(onboardingCurrentError.message);

  const currentStatus = onboardingCurrent.status as OnboardingStatus;
  const statusToPersist = currentStatus === 'required' ? 'started' : currentStatus === 'started' ? nextStatus : currentStatus;

  const statusChanged = statusToPersist !== currentStatus;

  const { error: updateError } = await supabase
    .from('customer_onboarding')
    .update({
      completion_percent: completion.completionPercent,
      status: statusToPersist,
      current_step: completion.isComplete ? 'review' : 'in_progress',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.onboardingId);

  if (updateError) throw new Error(updateError.message);

  if (statusChanged) {
    const context = await deriveLifecycleContext(input.onboardingId);
    await queueBrevoLifecycleSync({
      onboardingId: input.onboardingId,
      status: statusToPersist,
      completionPercent: completion.completionPercent,
      packageKey: context.packageKey,
      stripeCustomerId: context.stripeCustomerId,
      subscriptionStatus: context.subscriptionStatus,
      locationCount: context.locationCount,
      manualReviewRequired: context.manualReviewRequired,
      launchDate: context.launchDate,
    });
  }

  await appendOnboardingEvent({ onboardingId: input.onboardingId, eventType: 'onboarding_saved', actorType: input.source === 'admin' ? 'admin' : 'customer', eventData: { completionPercent: completion.completionPercent } });

  return completion;
}

export async function submitOnboarding(input: { onboardingId: string; packageKey: string; locationCount: number; actorType: 'customer' | 'admin'; actorId?: string | null; }) {
  const supabase = createSupabaseServiceRoleClient();
  const { data: onboarding, error: onboardingError } = await supabase
    .from('customer_onboarding')
    .select('*')
    .eq('id', input.onboardingId)
    .single();

  if (onboardingError || !onboarding) throw new Error(onboardingError?.message ?? 'Onboarding not found');

  const { data: rows, error: rowsError } = await supabase
    .from('onboarding_responses')
    .select('*')
    .eq('onboarding_id', input.onboardingId);

  if (rowsError) throw new Error(rowsError.message);

  const completion = calculateCompletion({
    packageKey: normalizePackageKey(input.packageKey),
    locationCount: input.locationCount,
    responses: rowsToDraft((rows ?? []) as Array<Record<string, unknown>>),
  });

  if (!completion.isComplete) {
    return { ok: false, completion };
  }

  assertValidTransition(onboarding.status as OnboardingStatus, 'submitted');

  const submittedAt = new Date().toISOString();
  const nextStatus: OnboardingStatus = 'activation_review';
  const { error: updateError } = await supabase
    .from('customer_onboarding')
    .update({
      status: nextStatus,
      completion_percent: 100,
      submitted_at: submittedAt,
      reviewed_at: null,
      approved_at: null,
      current_step: 'submitted',
    })
    .eq('id', input.onboardingId);

  if (updateError) throw new Error(updateError.message);

  await appendOnboardingEvent({ onboardingId: input.onboardingId, eventType: 'onboarding_submitted', actorType: input.actorType, actorId: input.actorId, eventData: { submittedAt } });
  await appendOnboardingEvent({ onboardingId: input.onboardingId, eventType: 'onboarding_review_started', actorType: 'system', eventData: { submittedAt } });
  await generateActivationTasks({ onboardingId: input.onboardingId, packageKey: normalizePackageKey(input.packageKey), locationCount: input.locationCount, activationId: onboarding.activation_id as string | null });

  await queueBrevoLifecycleSync({
    onboardingId: input.onboardingId,
    status: nextStatus,
    completionPercent: 100,
    packageKey: onboarding.package_key as string,
    stripeCustomerId: null,
    subscriptionStatus: null,
    locationCount: input.locationCount,
    manualReviewRequired: Boolean(onboarding.manual_review_required),
    launchDate: null,
  });

  return { ok: true, completion };
}

export async function transitionOnboardingStatus(input: {
  onboardingId: string;
  toStatus: OnboardingStatus;
  actorType: 'admin' | 'system';
  actorId?: string | null;
  reason?: string | null;
  adminOverrideReason?: string | null;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { data: onboarding, error } = await supabase
    .from('customer_onboarding')
    .select('*')
    .eq('id', input.onboardingId)
    .single();

  if (error || !onboarding) throw new Error(error?.message ?? 'Onboarding not found');

  const fromStatus = onboarding.status as OnboardingStatus;
  assertValidTransition(fromStatus, input.toStatus);

  if (input.actorType === 'admin' && fromStatus === 'delayed' && input.toStatus === 'activation_review' && !input.adminOverrideReason?.trim()) {
    throw new Error('Admin override reason is required when moving delayed onboarding back to activation review.');
  }

  const updates: Record<string, unknown> = { status: input.toStatus };
  const now = new Date().toISOString();
  if (input.toStatus === 'delayed') {
    updates.delayed_at = now;
    updates.delay_reason = input.reason ?? null;
  }
  if (input.toStatus === 'cancelled') {
    updates.cancelled_at = now;
    updates.cancellation_reason = input.reason ?? null;
  }
  if (input.toStatus === 'ready_for_launch') {
    updates.launch_ready_at = now;
  }
  if (input.toStatus === 'active') {
    updates.activated_at = now;
  }
  if (input.toStatus === 'configuration') {
    updates.reviewed_at = now;
    updates.approved_at = now;
  }

  const { error: updateError } = await supabase.from('customer_onboarding').update(updates).eq('id', input.onboardingId);
  if (updateError) throw new Error(updateError.message);

  await appendOnboardingEvent({
    onboardingId: input.onboardingId,
    eventType: `onboarding_status_changed_${input.toStatus}`,
    actorType: input.actorType,
    actorId: input.actorId,
    eventData: {
      fromStatus,
      toStatus: input.toStatus,
      reason: input.reason ?? null,
      adminOverrideReason: input.adminOverrideReason ?? null,
    },
  });

  const mappedEvent: Record<OnboardingStatus, string> = {
    required: 'onboarding_created',
    started: 'onboarding_started',
    in_progress: 'onboarding_step_completed',
    submitted: 'onboarding_submitted',
    activation_review: 'onboarding_review_started',
    configuration: 'activation_configuration_started',
    ready_for_launch: 'activation_ready',
    active: 'activation_completed',
    delayed: 'activation_delayed',
    cancelled: 'activation_cancelled',
  };

  await appendOnboardingEvent({
    onboardingId: input.onboardingId,
    eventType: mappedEvent[input.toStatus],
    actorType: input.actorType,
    actorId: input.actorId,
    eventData: {
      fromStatus,
      toStatus: input.toStatus,
      reason: input.reason ?? null,
    },
  });

  const context = await deriveLifecycleContext(input.onboardingId);
  await queueBrevoLifecycleSync({
    onboardingId: input.onboardingId,
    status: input.toStatus,
    completionPercent: Number(onboarding.completion_percent ?? 0),
    packageKey: context.packageKey,
    stripeCustomerId: context.stripeCustomerId,
    subscriptionStatus: context.subscriptionStatus,
    locationCount: context.locationCount,
    manualReviewRequired: context.manualReviewRequired,
    launchDate: input.toStatus === 'active' ? now : context.launchDate,
  });

  if (input.toStatus === 'configuration' || input.toStatus === 'ready_for_launch') {
    await prepareVendastaRun({ onboardingId: input.onboardingId, activationId: onboarding.activation_id as string | null, packageKey: onboarding.package_key as string, leadId: onboarding.lead_id as string, assessmentId: onboarding.assessment_id as string | null });
  }

  if (input.toStatus === 'active') {
    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update({
        customer_status: 'purchased',
        status: 'won',
        last_activity_at: now,
      })
      .eq('id', onboarding.lead_id);

    if (leadUpdateError) throw new Error(leadUpdateError.message);

    await appendOnboardingEvent({
      onboardingId: input.onboardingId,
      eventType: 'customer_success_handoff_created',
      actorType: 'system',
      eventData: {
        packageKey: context.packageKey,
        locationCount: context.locationCount,
        implementationOwner: onboarding.assigned_to,
      },
    });
  }
}

export async function generateActivationTasks(input: { onboardingId: string; packageKey: 'recovery' | 'command_center'; locationCount: number; activationId?: string | null; }) {
  const supabase = createSupabaseServiceRoleClient();
  const defs = getActivationTaskDefinitions(input.packageKey, input.locationCount);

  const rows = defs.map((task) => ({
    onboarding_id: input.onboardingId,
    activation_id: input.activationId ?? null,
    task_key: task.taskKey,
    category: task.category,
    title: task.title,
    description: task.description,
    required: task.required,
    status: 'pending',
  }));

  const { error } = await supabase.from('activation_tasks').upsert(rows, { onConflict: 'onboarding_id,task_key' });
  if (error) throw new Error(error.message);

  await appendOnboardingEvent({ onboardingId: input.onboardingId, eventType: 'activation_tasks_generated', actorType: 'system', eventData: { taskCount: defs.length } });
}

export async function prepareVendastaRun(input: { onboardingId: string; activationId?: string | null; packageKey: string; leadId: string; assessmentId?: string | null; }) {
  const adapter = createVendastaProvisioningAdapter();
  const payload = prepareVendastaProvisioningPayload(adapter, {
    leadId: input.leadId,
    assessmentId: input.assessmentId ?? input.onboardingId,
    packageKey: input.packageKey,
  });

  const mode = payload.dryRun ? 'dry_run' : 'live';
  const idempotencyKey = `vendasta:${input.onboardingId}:${input.packageKey}:${mode}`;

  const supabase = createSupabaseServiceRoleClient();
  const requestPayload = redactProvisioningPayload(payload as unknown as Record<string, unknown>);
  const { error } = await supabase.from('provisioning_runs').upsert({
    onboarding_id: input.onboardingId,
    activation_id: input.activationId ?? null,
    provider: 'vendasta',
    mode,
    idempotency_key: idempotencyKey,
    request_payload: requestPayload,
    response_payload: { prepared: true },
    status: 'succeeded',
    attempt_count: 1,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  }, { onConflict: 'provider,idempotency_key' });

  if (error) throw new Error(error.message);

  await appendOnboardingEvent({ onboardingId: input.onboardingId, eventType: 'vendasta_payload_prepared', actorType: 'system', eventData: { mode, idempotencyKey } });
}

export async function appendOnboardingEvent(input: {
  onboardingId: string;
  eventType: string;
  eventData?: Record<string, unknown>;
  actorType: 'customer' | 'admin' | 'system';
  actorId?: string | null;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from('onboarding_events').insert({
    onboarding_id: input.onboardingId,
    event_type: input.eventType,
    event_data: input.eventData ?? {},
    actor_type: input.actorType,
    actor_id: input.actorId ?? null,
    occurred_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function queueBrevoLifecycleSync(input: {
  onboardingId: string;
  status: OnboardingStatus;
  completionPercent: number;
  packageKey: string;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  locationCount: number;
  manualReviewRequired: boolean;
  launchDate: string | null;
}) {
  const action = lifecycleActionForStatus({
    status: input.status,
    completionPercent: input.completionPercent,
    packageKey: input.packageKey,
    stripeCustomerId: input.stripeCustomerId,
    subscriptionStatus: input.subscriptionStatus,
    locationCount: input.locationCount,
    manualReviewRequired: input.manualReviewRequired,
    launchDate: input.launchDate,
  });

  try {
    await enqueueIntegrationJob({
      provider: 'brevo',
      jobType: 'lifecycle_sync',
      payload: {
        onboardingId: input.onboardingId,
        status: input.status,
        action,
      },
      idempotencyKey: `brevo:lifecycle:${input.onboardingId}:${input.status}`,
      leadId: null,
      assessmentId: null,
    });

    await appendOnboardingEvent({
      onboardingId: input.onboardingId,
      eventType: 'brevo_sync_succeeded',
      actorType: 'system',
      eventData: { status: input.status, action },
    });
  } catch (error) {
    await appendOnboardingEvent({
      onboardingId: input.onboardingId,
      eventType: 'brevo_sync_failed',
      actorType: 'system',
      eventData: { status: input.status, reason: error instanceof Error ? error.message : 'unknown' },
    });

    log('error', 'brevo_lifecycle_sync_failed', {
      onboardingId: input.onboardingId,
      status: input.status,
      reason: error instanceof Error ? error.message : 'unknown',
    });
  }
}

export async function processOnboardingReminders(now = new Date()) {
  const supabase = createSupabaseServiceRoleClient();
  const { data: onboardingRows, error } = await supabase
    .from('customer_onboarding')
    .select('id,lead_id,status,created_at')
    .in('status', ['required', 'started', 'in_progress', 'activation_review', 'configuration', 'ready_for_launch', 'delayed']);

  if (error) throw new Error(error.message);

  let processed = 0;
  for (const onboarding of onboardingRows ?? []) {
    if (!onboarding.lead_id) continue;

    const { data: lead } = await supabase
      .from('leads')
      .select('email,business_name,customer_status')
      .eq('id', onboarding.lead_id)
      .maybeSingle();

    if (!lead?.email || lead.customer_status === 'suppressed') continue;

    const { data: reminderEvents } = await supabase
      .from('onboarding_events')
      .select('event_type,event_data,occurred_at')
      .eq('onboarding_id', onboarding.id)
      .eq('event_type', 'onboarding_reminder_sent')
      .order('occurred_at', { ascending: false });

    const alreadySentKinds = (reminderEvents ?? [])
      .map((row) => {
        const eventData = (row as { event_data?: Record<string, unknown> }).event_data;
        const kind = String(eventData?.kind ?? '');
        return kind as ReminderKind;
      })
      .filter((kind) => kind === 'first_day' || kind === 'third_day' || kind === 'seventh_day');

    const nextReminder = shouldSendReminder({
      createdAt: String(onboarding.created_at),
      status: onboarding.status as OnboardingStatus,
      suppression: false,
      alreadySentKinds,
      now,
    });

    if (!nextReminder) continue;

    const idempotencyKey = `onboarding-reminder:${onboarding.id}:${nextReminder}`;
    const emailResult = await sendOnboardingEmail({
      template: 'onboarding_reminder',
      to: String(lead.email),
      idempotencyKey,
      params: {
        business_name: String(lead.business_name ?? ''),
        reminder_kind: nextReminder,
      },
    });

    if (!emailResult.ok) {
      continue;
    }

    await appendOnboardingEvent({
      onboardingId: String(onboarding.id),
      eventType: 'onboarding_reminder_sent',
      actorType: 'system',
      eventData: { kind: nextReminder, dryRun: emailResult.dryRun },
    });

    if (nextReminder === 'seventh_day') {
      await appendOnboardingEvent({
        onboardingId: String(onboarding.id),
        eventType: 'onboarding_reminder_escalated_internal',
        actorType: 'system',
        eventData: { escalationAfterHours: 168 },
      });
    }

    processed += 1;
  }

  return { processed };
}
