import { serverEnv } from '@/lib/env.server';
import { createBrevoAdapter } from '@/lib/integrations/brevo';
import { enqueueIntegrationJob } from '@/lib/commerce/integrations';

type TemplateKey =
  | 'purchase_confirmation'
  | 'onboarding_invitation'
  | 'onboarding_reminder'
  | 'onboarding_submitted'
  | 'more_information_required'
  | 'activation_delayed'
  | 'ready_for_launch'
  | 'launch_confirmation';

const TEMPLATE_BY_KEY: Record<TemplateKey, string | undefined> = {
  purchase_confirmation: serverEnv.BREVO_TEMPLATE_PURCHASE_CONFIRMATION,
  onboarding_invitation: serverEnv.BREVO_TEMPLATE_ONBOARDING_INVITATION,
  onboarding_reminder: serverEnv.BREVO_TEMPLATE_ONBOARDING_REMINDER,
  onboarding_submitted: serverEnv.BREVO_TEMPLATE_ONBOARDING_SUBMITTED,
  more_information_required: serverEnv.BREVO_TEMPLATE_MORE_INFORMATION_REQUIRED,
  activation_delayed: serverEnv.BREVO_TEMPLATE_ACTIVATION_DELAYED,
  ready_for_launch: serverEnv.BREVO_TEMPLATE_READY_FOR_LAUNCH,
  launch_confirmation: serverEnv.BREVO_TEMPLATE_LAUNCH_CONFIRMATION,
};

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export async function sendOnboardingEmail(input: {
  template: TemplateKey;
  to: string;
  params: Record<string, string>;
  idempotencyKey: string;
}) {
  const templateIdRaw = TEMPLATE_BY_KEY[input.template];
  const templateId = templateIdRaw ? Number(templateIdRaw) : NaN;

  if (!Number.isFinite(templateId)) {
    if (!isProduction()) {
      return { ok: true, dryRun: true, reason: 'missing_template_id_non_production' };
    }

    await enqueueIntegrationJob({
      provider: 'brevo',
      jobType: 'transactional_email_failed',
      leadId: null,
      assessmentId: null,
      idempotencyKey: `${input.idempotencyKey}:missing-template`,
      payload: {
        template: input.template,
        to: input.to,
        reason: 'missing_template_id',
      },
    });

    return { ok: false, dryRun: false, reason: 'missing_template_id_production' };
  }

  const adapter = createBrevoAdapter();
  const result = await adapter.sendTransactionalEmail({
    to: input.to,
    templateId,
    params: input.params,
  });

  if (!result.ok && isProduction()) {
    await enqueueIntegrationJob({
      provider: 'brevo',
      jobType: 'transactional_email_failed',
      leadId: null,
      assessmentId: null,
      idempotencyKey: `${input.idempotencyKey}:send-failed`,
      payload: {
        template: input.template,
        to: input.to,
        reason: 'provider_send_failed',
      },
    });
  }

  return { ok: result.ok, dryRun: result.dryRun };
}
